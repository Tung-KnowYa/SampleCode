const fs = require('fs');
const path = require('path');
const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  BorderStyle,
  convertMillimetersToTwip,
  Table,
  TableRow,
  TableCell,
  WidthType,
  VerticalAlignTable,
} = require('docx');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const PptxGenJS = require('pptxgenjs');

let cachedStyles = null;

function loadStyles() {
  if (cachedStyles) return cachedStyles;
  const p = path.join(__dirname, '../config/document-export-styles.json');
  const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  const d = raw.documentDefaults || {};
  const colors = d.colors || {};
  cachedStyles = {
    raw,
    bodyFont: d.fontFamilyBody || 'Calibri',
    headingFont: d.fontFamilyHeading || 'Cambria',
    bodyPt: Number(d.bodyFontSizePt) || 11,
    headingPt: Number(d.headingFontSizePt) || 16,
    smallPt: Number(d.smallFontSizePt) || 9,
    lineSpacing: Number(d.lineSpacing) || 1.15,
    colors: {
      text: (colors.text || '#000000').replace(/^#/, ''),
      heading: (colors.heading || '#000000').replace(/^#/, ''),
      accent: (colors.accent || '#B8860B').replace(/^#/, ''),
    },
    marginsMm: d.marginsMm || { top: 20, bottom: 20, left: 25, right: 25 },
    pdfFont: raw.pdf?.fontFamily || 'Helvetica',
    pptTitlePt: Number(raw.powerpoint?.slideTitleFontSizePt) || 28,
    pptBodyPt: Number(raw.powerpoint?.slideBodyFontSizePt) || 14,
    excelColWidth: Number(raw.excel?.defaultColumnWidth) || 48,
  };
  return cachedStyles;
}

/** Strip common markdown for plain export body */
function stripMarkdownForExport(md) {
  if (!md || typeof md !== 'string') return '';
  let t = md.replace(/```[\s\S]*?```/g, ' ');
  t = t.replace(/^#{1,6}\s+/gm, '');
  t = t.replace(/\*\*([^*]+)\*\*/g, '$1');
  t = t.replace(/\*([^*]+)\*/g, '$1');
  t = t.replace(/`([^`]+)`/g, '$1');
  t = t.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  return t.replace(/\r\n/g, '\n').trim();
}

function mmToPdfPoints(mm) {
  return (Number(mm) || 0) * 2.834645669;
}

function stripMarkdownLinks(s) {
  return String(s || '').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
}

/** Without ``` fences; trims line endings only. */
function preprocessMarkdownLines(markdownText) {
  const normalized = String(markdownText || '').replace(/\r\n/g, '\n');
  const withoutFences = normalized.replace(/```[\s\S]*?```/g, '\n');
  return withoutFences.split('\n').map((l) => l.trimEnd());
}

function splitTableRowCells(pipeLine) {
  let row = String(pipeLine).trim();
  if (!row.includes('|')) return [];
  if (row.startsWith('|')) row = row.slice(1);
  if (row.endsWith('|')) row = row.slice(0, -1);
  return row.split('|').map((c) => c.trim());
}

function isMarkdownTableLine(trimmedLine) {
  const t = String(trimmedLine || '').trim();
  if (!t || !t.includes('|')) return false;
  const cells = splitTableRowCells(t);
  return cells.length >= 2;
}

function isTableSeparatorRow(cells) {
  if (!cells || !cells.length) return false;
  return cells.every((cell) => /^:?-{2,}:?$/.test(String(cell || '').replace(/\s+/g, '')));
}

function parseTableBlock(contiguousTrimmedLines) {
  if (!contiguousTrimmedLines.length || contiguousTrimmedLines.length < 2) return null;
  const rowCells = contiguousTrimmedLines.map((l) => splitTableRowCells(l));
  if (!rowCells.every((r) => r.length >= 2)) return null;

  let header = rowCells[0];
  let dataIdx = 1;
  if (rowCells.length > 1 && isTableSeparatorRow(rowCells[1])) dataIdx = 2;
  const body = rowCells.slice(dataIdx);
  if (!body.length) return null;

  const colCount = Math.max(header.length, ...body.map((r) => r.length));
  const pad = (r) => {
    const cp = [...r];
    while (cp.length < colCount) cp.push('');
    return cp.slice(0, colCount);
  };

  return { headers: pad(header), rows: body.map(pad) };
}

const HEADING_LEVELS = [
  HeadingLevel.HEADING_1,
  HeadingLevel.HEADING_2,
  HeadingLevel.HEADING_3,
  HeadingLevel.HEADING_4,
  HeadingLevel.HEADING_5,
  HeadingLevel.HEADING_6,
];

function headingLevelFromHashCount(hashCount) {
  const idx = Math.min(Math.max(Number(hashCount) || 1, 1), 6) - 1;
  return HEADING_LEVELS[idx];
}

/** @returns {{ type: 'text' | 'bold' | 'italic' | 'code', text: string }[]} */
function tokenizeMarkdownInline(raw) {
  const text = stripMarkdownLinks(String(raw || ''));
  if (!text) return [];
  const out = [];
  let i = 0;
  const n = text.length;

  function pushPlain(slice) {
    if (!slice) return;
    const last = out[out.length - 1];
    if (last && last.type === 'text') last.text += slice;
    else out.push({ type: 'text', text: slice });
  }

  function findItalicSlice(from) {
    let open = text.indexOf('*', from);
    while (open !== -1) {
      if (open + 1 < n && text[open + 1] === '*') {
        open = text.indexOf('*', open + 2);
        continue;
      }
      if (open > 0 && text[open - 1] === '*') {
        open = text.indexOf('*', open + 1);
        continue;
      }
      let j = open + 1;
      while (j < n) {
        const ix = text.indexOf('*', j);
        if (ix === -1) return null;
        if (ix + 1 < n && text[ix + 1] === '*') {
          j = ix + 2;
          continue;
        }
        return { open, close: ix };
      }
      return null;
    }
    return null;
  }

  while (i < n) {
    const codeAt = text.indexOf('`', i);
    const boldAt = text.indexOf('**', i);
    const italic = findItalicSlice(i);
    let nextAt = null;
    let kind = null;
    let extra = null;
    const consider = (pos, k, ex) => {
      if (pos === -1) return;
      if (nextAt === null || pos < nextAt) {
        nextAt = pos;
        kind = k;
        extra = ex;
      }
    };
    consider(codeAt, 'code', null);
    consider(boldAt, 'bold', null);
    if (italic) consider(italic.open, 'italic', italic);

    if (nextAt === null) {
      pushPlain(text.slice(i));
      break;
    }
    pushPlain(text.slice(i, nextAt));

    if (kind === 'code') {
      const close = text.indexOf('`', nextAt + 1);
      if (close === -1) {
        pushPlain(text.slice(nextAt));
        break;
      }
      out.push({ type: 'code', text: text.slice(nextAt + 1, close) });
      i = close + 1;
      continue;
    }

    if (kind === 'bold') {
      const close = text.indexOf('**', nextAt + 2);
      if (close === -1) {
        pushPlain(text.slice(nextAt));
        break;
      }
      out.push({ type: 'bold', text: text.slice(nextAt + 2, close) });
      i = close + 2;
      continue;
    }

    // italic
    const cl = extra.close;
    out.push({ type: 'italic', text: text.slice(nextAt + 1, cl) });
    i = cl + 1;
  }

  return out;
}

function inlineMarkdownToDocxRuns(fragment, styles, base = {}) {
  const bodyHalf = styles.bodyPt * 2;
  const baseOpts = {
    font: styles.bodyFont,
    size: bodyHalf,
    color: styles.colors.text,
    ...base,
  };
  const tokens = tokenizeMarkdownInline(fragment);
  if (!tokens.length) return [new TextRun({ ...baseOpts, text: ' ' })];

  const runs = [];
  for (const t of tokens) {
    let opt = { ...baseOpts };
    if (t.type === 'bold') opt = { ...opt, bold: true };
    if (t.type === 'italic') opt = { ...opt, italics: true };
    if (t.type === 'code')
      opt = {
        ...opt,
        font: 'Consolas',
        italics: false,
      };
    if (!t.text && t.type !== 'text') continue;
    runs.push(new TextRun({ ...opt, text: t.text }));
  }
  return runs.length ? runs : [new TextRun({ ...baseOpts, text: ' ' })];
}

function tableCellBorders(styles) {
  const b = { style: BorderStyle.SINGLE, size: 8, color: styles.colors.accent };
  return { top: b, bottom: b, left: b, right: b };
}

function buildDocxTable(parsed, styles) {
  const { headers, rows } = parsed;
  const borders = tableCellBorders(styles);
  const bodyHalf = styles.bodyPt * 2;
  const headHalf = styles.headingPt * 2;
  const ncol = headers.length;

  function bodyCellParagraph(markdownLike) {
    return new Paragraph({
      spacing: { after: 100 },
      children: inlineMarkdownToDocxRuns(markdownLike, styles),
    });
  }

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h) => {
      const runs = inlineMarkdownToDocxRuns(h, styles, {
        bold: true,
        color: styles.colors.accent,
        font: styles.headingFont,
        size: Math.max(bodyHalf - 8, Math.min(headHalf, bodyHalf + 12)),
      });
      return new TableCell({
        verticalAlign: VerticalAlignTable.CENTER,
        shading: { fill: 'F4F6F8' },
        margins: { top: 140, bottom: 140, left: 180, right: 180 },
        borders,
        width: ncol ? { size: Math.floor(10000 / ncol), type: WidthType.PERCENTAGE } : undefined,
        children: [new Paragraph({ spacing: { after: 60 }, children: runs })],
      });
    }),
  });

  const bodyTableRows = rows.map(
    (r) =>
      new TableRow({
        cantSplit: true,
        children: r.map(
          (cell) =>
            new TableCell({
              verticalAlign: VerticalAlignTable.TOP,
              margins: { top: 140, bottom: 140, left: 180, right: 180 },
              borders,
              width: ncol ? { size: Math.floor(10000 / ncol), type: WidthType.PERCENTAGE } : undefined,
              children: [bodyCellParagraph(cell)],
            })
        ),
      })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: ncol ? Array(ncol).fill(Math.floor(9000 / ncol)) : undefined,
    rows: [headerRow, ...bodyTableRows],
  });
}

function buildDocxParagraphs(markdownText, styles) {
  const lines = preprocessMarkdownLines(markdownText);
  const bodyHalf = styles.bodyPt * 2;
  const headHalf = styles.headingPt * 2;
  const children = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const t = line.trim();
    if (!t) {
      children.push(new Paragraph({ children: [new TextRun({ text: '' })] }));
      i += 1;
      continue;
    }

    if (isMarkdownTableLine(t)) {
      const block = [];
      while (i < lines.length && isMarkdownTableLine(lines[i].trim())) {
        block.push(lines[i].trim());
        i += 1;
      }
      const parsed = parseTableBlock(block);
      if (parsed) children.push(buildDocxTable(parsed, styles));
      continue;
    }

    const hm = /^(\#{1,6})\s+(.*)$/.exec(t);
    if (hm) {
      const level = hm[1].length;
      const content = hm[2];
      children.push(
        new Paragraph({
          heading: headingLevelFromHashCount(level),
          spacing: { after: 160 },
          children: inlineMarkdownToDocxRuns(content, styles, {
            font: styles.headingFont,
            size: headHalf,
            color: styles.colors.accent,
            bold: true,
          }),
        })
      );
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(t)) {
      const bodyRunBase = {
        font: styles.bodyFont,
        size: bodyHalf,
        color: styles.colors.text,
      };
      const item = t.replace(/^[-*]\s+/, '');
      children.push(
        new Paragraph({
          spacing: { after: 110 },
          children: [
            new TextRun({ ...bodyRunBase, text: '\u2022 ' }),
            ...inlineMarkdownToDocxRuns(item, styles),
          ],
        })
      );
      i += 1;
      continue;
    }

    children.push(
      new Paragraph({
        spacing: { after: Math.round(120 * styles.lineSpacing) },
        children: inlineMarkdownToDocxRuns(line.trim(), styles),
      })
    );
    i += 1;
  }

  return children.length ? children : [new Paragraph({ children: [new TextRun({ text: ' ' })] })];
}

async function exportDocx(title, bodyMarkdown, styles) {
  const m = styles.marginsMm;
  const margin = {
    top: convertMillimetersToTwip(m.top),
    bottom: convertMillimetersToTwip(m.bottom),
    left: convertMillimetersToTwip(m.left),
    right: convertMillimetersToTwip(m.right),
  };
  const intro = new Paragraph({
    spacing: { after: 200 },
    border: {
      bottom: { color: styles.colors.accent, space: 1, style: BorderStyle.SINGLE, size: 12 },
    },
    children: [
      new TextRun({
        text: title,
        font: styles.headingFont,
        bold: true,
        size: styles.headingPt * 2,
        color: styles.colors.accent,
      }),
    ],
  });
  const doc = new Document({
    sections: [
      {
        properties: { page: { margin } },
        children: [intro, ...buildDocxParagraphs(bodyMarkdown, styles)],
      },
    ],
  });
  return await Packer.toBuffer(doc);
}

/** Inline markdown → PDF text with Helvetica / Bold / Oblique / Courier */
function renderPdfTokenLine(doc, mdLine, styles, opts = {}) {
  const tokens = tokenizeMarkdownInline(mdLine);
  const prefix = opts.bullet || '';
  const prefixNum = opts.numberPrefix || '';
  const textColor = `#${styles.colors.text}`;
  doc.fillColor(textColor).fontSize(styles.bodyPt);

  const hasTok = tokens.length > 0;

  if (prefixNum) {
    doc.font('Helvetica').text(prefixNum, { continued: !!(prefix || hasTok) });
  }
  if (prefix) {
    doc.font('Helvetica').text(prefix, { continued: hasTok });
  }

  if (!hasTok) {
    if (!prefixNum && !prefix) doc.font('Helvetica').text(' ');
    return;
  }

  tokens.forEach((tok, idx) => {
    const cont = idx < tokens.length - 1;
    let font = 'Helvetica';
    if (tok.type === 'bold') font = 'Helvetica-Bold';
    else if (tok.type === 'italic') font = 'Helvetica-Oblique';
    else if (tok.type === 'code') font = 'Courier';
    doc.font(font).text(tok.text, { continued: cont });
  });
}

function drawPdfTable(doc, parsed, styles) {
  const { headers, rows } = parsed;
  const ncol = headers.length;
  if (!ncol) return;

  const accentHex = `#${styles.colors.accent}`;
  const textHex = `#${styles.colors.text}`;
  const marginLeft = doc.page.margins.left;
  const marginRight = doc.page.margins.right;
  const usableWidth = doc.page.width - marginLeft - marginRight;
  const colW = usableWidth / ncol;
  const pad = 6;
  const fs = styles.bodyPt;
  const lineH = fs * 1.35;

  const cellPlain = (md) => stripMarkdownForExport(md || '') || '';

  function measureRowHeight(cells, boldHeader) {
    let maxLines = 1;
    cells.forEach((cell) => {
      const t = cellPlain(cell);
      const w = colW - pad * 2;
      const approxCharsPerLine = Math.max(8, Math.floor(w / (fs * 0.5)));
      const lines = Math.ceil((t.length || 1) / approxCharsPerLine);
      maxLines = Math.max(maxLines, lines);
    });
    return pad * 2 + maxLines * lineH * (boldHeader ? 1.05 : 1);
  }

  const allRows = [headers, ...rows];
  let y = doc.y;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  for (let r = 0; r < allRows.length; r += 1) {
    const cells = allRows[r];
    const isHeader = r === 0;
    const h = measureRowHeight(cells, isHeader);
    if (y + h > bottomLimit) {
      doc.addPage();
      y = doc.page.margins.top;
    }

    let x = marginLeft;
    for (let c = 0; c < ncol; c += 1) {
      const raw = cells[c] || '';
      const label = cellPlain(raw);

      doc.save();
      if (isHeader) {
        doc
          .fillColor('#F4F6F8')
          .strokeColor(accentHex)
          .lineWidth(0.5)
          .rect(x, y, colW, h)
          .fillAndStroke();
      } else {
        doc.strokeColor(accentHex).lineWidth(0.5).rect(x, y, colW, h).stroke();
      }

      doc.fillColor(isHeader ? accentHex : textHex)
        .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
        .fontSize(fs)
        .text(label, x + pad, y + pad, {
          width: colW - pad * 2,
          align: 'left',
        });
      doc.restore();

      x += colW;
    }
    y += h;
  }

  doc.x = marginLeft;
  doc.y = y + fs * 0.35;
}

function renderMarkdownPdfBody(doc, markdownBody, styles) {
  const lines = preprocessMarkdownLines(markdownBody);
  const accent = `#${styles.colors.accent}`;
  const textColor = `#${styles.colors.text}`;
  let i = 0;

  function ensureSpace(approxPt) {
    const bottom = doc.page.height - doc.page.margins.bottom;
    if (doc.y + approxPt > bottom) doc.addPage();
  }

  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) {
      doc.moveDown(0.2);
      i += 1;
      continue;
    }

    if (isMarkdownTableLine(t)) {
      const block = [];
      while (i < lines.length && isMarkdownTableLine(lines[i].trim())) {
        block.push(lines[i].trim());
        i += 1;
      }
      const parsed = parseTableBlock(block);
      if (parsed) {
        ensureSpace(120);
        drawPdfTable(doc, parsed, styles);
        doc.moveDown(0.25);
      }
      continue;
    }

    const hm = /^(\#{1,6})\s+(.*)$/.exec(t);
    if (hm) {
      const fs = Math.min(styles.headingPt + 4, styles.bodyPt + 10 - Math.min(hm[1].length, 3));
      ensureSpace(fs * 2);
      doc.fillColor(accent).font('Helvetica-Bold').fontSize(fs);
      doc.text(stripMarkdownForExport(hm[2]), { align: 'left' });
      doc.fillColor(textColor).font('Helvetica').fontSize(styles.bodyPt);
      doc.moveDown(0.35);
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(t)) {
      ensureSpace(styles.bodyPt * 1.5);
      doc.font('Helvetica').fontSize(styles.bodyPt).fillColor(textColor);
      renderPdfTokenLine(doc, t.replace(/^[-*]\s+/, ''), styles, { bullet: '\u2022 ' });
      doc.moveDown(0.2);
      i += 1;
      continue;
    }

    const numM = /^(\d+)\.\s+(.*)$/.exec(t);
    if (numM) {
      ensureSpace(styles.bodyPt * 1.5);
      doc.font('Helvetica').fontSize(styles.bodyPt).fillColor(textColor);
      renderPdfTokenLine(doc, numM[2], styles, { numberPrefix: `${numM[1]}. ` });
      doc.moveDown(0.2);
      i += 1;
      continue;
    }

    ensureSpace(styles.bodyPt * 1.5);
    doc.font('Helvetica').fontSize(styles.bodyPt).fillColor(textColor);
    renderPdfTokenLine(doc, t, styles);
    doc.moveDown(0.18);
    i += 1;
  }
}

function exportPdf(title, markdownBody, styles) {
  const m = styles.marginsMm;
  const margin = {
    top: mmToPdfPoints(m.top),
    bottom: mmToPdfPoints(m.bottom),
    left: mmToPdfPoints(m.left),
    right: mmToPdfPoints(m.right),
  };
  const accent = `#${styles.colors.accent}`;
  const textColor = `#${styles.colors.text}`;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.fillColor(accent).fontSize(styles.headingPt).font('Helvetica-Bold').text(title, { underline: false });
    doc.moveDown(0.8);
    doc.fillColor(textColor).fontSize(styles.bodyPt).font('Helvetica');
    renderMarkdownPdfBody(doc, markdownBody, styles);
    doc.end();
  });
}

function applyExcelBodyCell(ws, row, colStart, colEnd, value, styles, opts = {}) {
  const borderColor = { argb: `FF${styles.colors.accent}` };
  if (colEnd > colStart) ws.mergeCells(row, colStart, row, colEnd);
  const cell = ws.getCell(row, colStart);
  cell.value = value;
  cell.font = {
    name: styles.bodyFont,
    size: opts.fontSize || styles.bodyPt,
    bold: !!opts.bold,
    color: { argb: `FF${styles.colors.text}` },
    ...(opts.fontColor ? { color: { argb: `FF${opts.fontColor}` } } : {}),
  };
  cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
  cell.border = {
    top: { style: 'thin', color: borderColor },
    left: { style: 'thin', color: borderColor },
    bottom: { style: 'thin', color: borderColor },
    right: { style: 'thin', color: borderColor },
  };
}

async function exportXlsx(title, markdownBody, styles) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Report', {
    views: [{ showGridLines: true }],
  });
  const maxCol = 8;
  ws.columns = Array(maxCol)
    .fill(null)
    .map(() => ({ width: Math.min(styles.excelColWidth, 36) }));

  ws.mergeCells(1, 1, 3, maxCol);
  const titleCell = ws.getCell('A1');
  titleCell.value = title;
  titleCell.font = {
    name: styles.headingFont,
    size: styles.headingPt,
    bold: true,
    color: { argb: `FF${styles.colors.accent}` },
  };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };

  let row = 5;
  const lines = preprocessMarkdownLines(markdownBody);
  const borderColor = { argb: `FF${styles.colors.accent}` };
  let i = 0;

  while (i < lines.length) {
    const t = lines[i].trim();
    if (!t) {
      row += 1;
      i += 1;
      continue;
    }

    if (isMarkdownTableLine(t)) {
      const block = [];
      while (i < lines.length && isMarkdownTableLine(lines[i].trim())) {
        block.push(lines[i].trim());
        i += 1;
      }
      const parsed = parseTableBlock(block);
      if (parsed) {
        const ncol = Math.min(parsed.headers.length, maxCol);
        for (let c = 0; c < ncol; c += 1) {
          const cell = ws.getCell(row, c + 1);
          cell.value = stripMarkdownForExport(parsed.headers[c] || '');
          cell.font = {
            name: styles.bodyFont,
            size: styles.bodyPt,
            bold: true,
            color: { argb: `FF${styles.colors.accent}` },
          };
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF4F6F8' },
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
          cell.border = {
            top: { style: 'thin', color: borderColor },
            left: { style: 'thin', color: borderColor },
            bottom: { style: 'thin', color: borderColor },
            right: { style: 'thin', color: borderColor },
          };
        }
        row += 1;
        for (const dataRow of parsed.rows) {
          for (let c = 0; c < ncol; c += 1) {
            const cell = ws.getCell(row, c + 1);
            cell.value = stripMarkdownForExport(dataRow[c] || '');
            cell.font = {
              name: styles.bodyFont,
              size: styles.bodyPt,
              color: { argb: `FF${styles.colors.text}` },
            };
            cell.alignment = { vertical: 'top', horizontal: 'left', wrapText: true };
            cell.border = {
              top: { style: 'thin', color: borderColor },
              left: { style: 'thin', color: borderColor },
              bottom: { style: 'thin', color: borderColor },
              right: { style: 'thin', color: borderColor },
            };
          }
          row += 1;
        }
        row += 1;
      }
      continue;
    }

    const hm = /^(\#{1,6})\s+(.*)$/.exec(t);
    if (hm) {
      applyExcelBodyCell(ws, row, 1, maxCol, stripMarkdownForExport(hm[2]), styles, {
        bold: true,
        fontSize: styles.headingPt - 1,
        fontColor: styles.colors.accent,
      });
      row += 1;
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(t)) {
      const item = stripMarkdownForExport(t.replace(/^[-*]\s+/, ''));
      applyExcelBodyCell(ws, row, 1, maxCol, `\u2022 ${item}`, styles);
      row += 1;
      i += 1;
      continue;
    }

    const numM = /^(\d+)\.\s+(.*)$/.exec(t);
    if (numM) {
      applyExcelBodyCell(ws, row, 1, maxCol, `${numM[1]}. ${stripMarkdownForExport(numM[2])}`, styles);
      row += 1;
      i += 1;
      continue;
    }

    applyExcelBodyCell(ws, row, 1, maxCol, stripMarkdownForExport(t), styles);
    row += 1;
    i += 1;
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

function markdownInlineToPptxParts(text, styleOptsBase) {
  const base = styleOptsBase || {};
  const tokens = tokenizeMarkdownInline(text);
  if (!tokens.length) return [{ text: ' ', options: { ...base } }];
  const parts = [];
  for (const t of tokens) {
    let opt = { ...base };
    if (t.type === 'bold') opt.bold = true;
    else if (t.type === 'italic') opt.italic = true;
    else if (t.type === 'code') {
      opt.fontFace = 'Consolas';
      const fs = typeof opt.fontSize === 'number' ? opt.fontSize : 14;
      opt.fontSize = Math.max(10, fs - 2);
    }
    if ((!t.text || t.text === '') && t.type !== 'text') continue;
    parts.push({ text: t.text ?? '', options: opt });
  }
  return parts.length ? parts : [{ text: ' ', options: { ...base } }];
}

function buildPptxTableRows(parsed, styles) {
  const fs = Math.max(11, styles.pptBodyPt - 1);
  const baseCell = {
    fontFace: styles.bodyFont,
    fontSize: fs,
    color: styles.colors.text,
  };
  const headerRow = parsed.headers.map((h) => ({
    text: markdownInlineToPptxParts(h, {
      ...baseCell,
      bold: true,
      color: styles.colors.accent,
    }),
    options: {
      fill: { color: 'F4F6F8' },
      bold: true,
      color: styles.colors.accent,
      valign: 'middle',
      margin: 3,
    },
  }));
  const bodyRows = parsed.rows.map((r) =>
    r.map((cell) => ({
      text: markdownInlineToPptxParts(cell, baseCell),
      options: { valign: 'top', margin: 3 },
    }))
  );
  return [headerRow, ...bodyRows];
}

/** Lays markdown out with bullets, headings, inline emphasis, GFM pipes tables, continuation slides when needed */
function layOutMarkdownSlides(pptx, firstSlide, markdownBody, styles) {
  let slide = firstSlide;
  let y = 1.32;
  const x = 0.4;
  const w = 12.55;
  const maxY = 6.92;
  const baseOpts = {
    fontFace: styles.bodyFont,
    fontSize: styles.pptBodyPt,
    color: styles.colors.text,
    lineSpacingMultiple: 1.15,
    wrap: true,
  };

  const body = preprocessMarkdownLines(markdownBody);
  let i = 0;

  const startContinuationSlide = () => {
    slide = pptx.addSlide();
    y = 0.42;
    return slide;
  };

  const ensureRoom = (blockH) => {
    if (y + blockH <= maxY) return;
    startContinuationSlide();
  };

  while (i < body.length) {
    const trimmed = body[i].trim();
    if (!trimmed) {
      y += 0.035;
      i += 1;
      continue;
    }

    if (isMarkdownTableLine(trimmed)) {
      const block = [];
      while (i < body.length && isMarkdownTableLine(body[i].trim())) {
        block.push(body[i].trim());
        i += 1;
      }
      const parsed = parseTableBlock(block);
      if (parsed) {
        const rows = buildPptxTableRows(parsed, styles);
        const nCols = parsed.headers.length;
        const colW = nCols ? Array(nCols).fill(w / nCols) : [w];
        const rowHArr = rows.map(() => 0.32);
        const tableH = 0.1 + rows.length * 0.32;
        ensureRoom(Math.min(tableH, maxY - 0.5));
        const hAvail = Math.max(1.05, Math.min(tableH + 0.15, maxY - y));

        slide.addTable(rows, {
          x,
          y,
          w,
          h: hAvail,
          colW,
          rowH: rowHArr,
          border: { type: 'solid', pt: 1, color: styles.colors.accent },
          fontFace: styles.bodyFont,
          fontSize: Math.max(11, styles.pptBodyPt - 1),
          color: styles.colors.text,
          valign: 'top',
          autoPage: false,
        });
        y += Math.min(tableH + 0.14, maxY - y);
      }
      continue;
    }

    const hm = /^(\#{1,3})\s+(.*)$/.exec(trimmed);
    if (hm) {
      const level = hm[1].length;
      const fs =
        level === 1 ? styles.pptBodyPt + 6 : level === 2 ? styles.pptBodyPt + 4 : styles.pptBodyPt + 2;
      const parts = markdownInlineToPptxParts(hm[2], {
        ...baseOpts,
        fontSize: fs,
        bold: true,
        color: styles.colors.accent,
      });
      const hBlk = 0.48;
      ensureRoom(hBlk);
      slide.addText(parts.length ? parts : [{ text: hm[2], options: { ...baseOpts, bold: true, fontSize: fs } }], {
        x,
        y,
        w,
        h: hBlk,
        valign: 'top',
        ...baseOpts,
        fontSize: fs,
        color: styles.colors.accent,
        bold: true,
      });
      y += hBlk + 0.08;
      i += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items = [];
      while (i < body.length && /^[-*]\s+/.test(body[i].trim())) {
        items.push(body[i].trim().replace(/^[-*]\s+/, ''));
        i += 1;
      }
      const segments = [];
      for (let b = 0; b < items.length; b += 1) {
        const lineParts = markdownInlineToPptxParts(items[b], { ...baseOpts });
        if (!lineParts.length) continue;
        const firstOpts = lineParts[0].options ? { ...lineParts[0].options } : { ...baseOpts };
        lineParts[0] = {
          text: lineParts[0].text,
          options: { ...firstOpts, bullet: true, breakLine: b < items.length - 1 },
        };
        segments.push(...lineParts);
      }
      const hBlk = Math.min(4.35, Math.max(0.5, items.length * 0.34 + 0.2));
      ensureRoom(Math.min(hBlk, maxY - y));
      slide.addText(segments.length ? segments : markdownInlineToPptxParts(items.join('\n'), baseOpts), {
        x,
        y,
        w,
        h: Math.min(maxY - y, hBlk),
        valign: 'top',
        fit: 'shrink',
        ...baseOpts,
      });
      y += Math.min(maxY - y, hBlk) + 0.08;
      continue;
    }

    const paraLines = [];
    while (i < body.length) {
      const lt = body[i].trim();
      if (!lt) break;
      if (isMarkdownTableLine(lt)) break;
      if (/^#{1,6}\s+/.test(lt)) break;
      if (/^[-*]\s+/.test(lt)) break;
      paraLines.push(lt);
      i += 1;
    }

    const merged = paraLines.join('\n');
    const parts = markdownInlineToPptxParts(merged, { ...baseOpts });
    const lineCount = Math.max(paraLines.length, 1);
    const hBlk = Math.min(4.5, Math.max(0.52, lineCount * 0.42 + merged.length / 780));
    ensureRoom(Math.min(hBlk + 0.12, maxY - y));

    slide.addText(parts.length ? parts : markdownInlineToPptxParts(merged, baseOpts), {
      x,
      y,
      w,
      h: Math.min(maxY - y, hBlk),
      valign: 'top',
      fit: 'shrink',
      ...baseOpts,
    });

    y += Math.min(maxY - y, hBlk) + 0.07;
  }
}

async function exportPptx(title, markdownBody, styles) {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'AI Assistant';
  pptx.subject = title;

  const slide = pptx.addSlide();
  slide.addText(title, {
    x: 0.4,
    y: 0.35,
    w: 12.55,
    h: 0.95,
    fontSize: styles.pptTitlePt,
    fontFace: styles.headingFont,
    bold: true,
    color: styles.colors.accent,
    valign: 'top',
    fit: 'shrink',
    wrap: true,
  });

  layOutMarkdownSlides(pptx, slide, markdownBody, styles);

  const out = await pptx.write({ outputType: 'nodebuffer' });
  return Buffer.isBuffer(out) ? out : Buffer.from(out);
}

const FORMAT_BY_TOOL = {
  'Word document': { ext: 'docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  'PDF document': { ext: 'pdf', mime: 'application/pdf' },
  PowerPoint: { ext: 'pptx', mime: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' },
  'Excel workbook': { ext: 'xlsx', mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
};

function isExportTool(tool) {
  return tool && Object.prototype.hasOwnProperty.call(FORMAT_BY_TOOL, tool);
}

async function buildExportFile(tool, markdownReply, userMessage) {
  const meta = FORMAT_BY_TOOL[tool];
  if (!meta) return null;
  const styles = loadStyles();
  const titleBase = (userMessage || 'export').replace(/[^\w\s-]/g, '').trim().slice(0, 60) || 'export';
  const title = `Report: ${titleBase}`;

  let buffer;
  if (tool === 'Word document') buffer = await exportDocx(title, markdownReply, styles);
  else if (tool === 'PDF document') buffer = await exportPdf(title, markdownReply, styles);
  else if (tool === 'Excel workbook') buffer = await exportXlsx(title, markdownReply, styles);
  else if (tool === 'PowerPoint') buffer = await exportPptx(title, markdownReply, styles);
  else return null;

  const safeSlug = titleBase.replace(/\s+/g, '-').slice(0, 40) || 'report';
  const downloadName = `${safeSlug}.${meta.ext}`;
  return { buffer, mimeType: meta.mime, downloadName };
}

module.exports = {
  loadStyles,
  isExportTool,
  buildExportFile,
  stripMarkdownForExport,
  FORMAT_BY_TOOL,
};
