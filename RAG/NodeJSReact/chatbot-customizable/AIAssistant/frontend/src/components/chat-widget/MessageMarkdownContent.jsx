import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

const CHART_BLOCK = /```json chart\n([\s\S]*?)\n```/;
const CITE_HASH_PREFIX = '#assistant-cite-';
const FENCED_CODE = /```[\s\S]*?```/g;
/** Balanced closing `]` only (inner cannot contain `]`). */
const SOURCE_BRACKET = /\[Source:\s*([^\]]+)\]/g;

const PLACEHOLDER_OPEN = '\uE004';
const PLACEHOLDER_CLOSE = '\uE005';

const proseAssistant =
  'prose max-w-none dark:prose-invert prose-p:leading-relaxed text-inherit';

/** Typography plugin fights bubble text color; `markdown-user-bubble` fixes inheritance (see styles.css). */
const proseUser = 'prose max-w-none prose-p:leading-relaxed text-inherit markdown-user-bubble';

function encodeLabelForHash(label) {
  const bytes = new TextEncoder().encode(label);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  const b64 = btoa(bin);
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeLabelFromHash(fragment) {
  if (!fragment.startsWith(CITE_HASH_PREFIX)) return null;
  const raw = fragment.slice(CITE_HASH_PREFIX.length);
  try {
    let b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function normalizeSourceInner(inner) {
  const label = inner.trim();
  if (/^https?:\/\/\S+$/i.test(label)) return { kind: 'url', href: label };
  if (/^www\.\S+$/i.test(label)) return { kind: 'url', href: `https://${label}` };
  return { kind: 'doc', label };
}

function citationReplacementMarkdown(inner) {
  const norm = normalizeSourceInner(inner);
  if (norm.kind === 'url') {
    return `[🔗 Source](${norm.href})`;
  }
  const hash = `${CITE_HASH_PREFIX}${encodeLabelForHash(norm.label)}`;
  return `[📄 Source](${hash})`;
}

/**
 * Turn well-formed `[Source: …]` into markdown links so we can style them as chips.
 * - Skips fenced ``` code ``` blocks.
 * - Escapes any remaining `[Source:` as `\[Source:` so CommonMark does not treat stray /
 *   unclosed brackets as link labels (which can hide following text until a later `]`).
 */
function preprocessSourceCitations(markdown) {
  if (!markdown || typeof markdown !== 'string') return markdown;
  const blocks = [];
  let masked = markdown.replace(FENCED_CODE, (block) => {
    blocks.push(block);
    return `\uE000${blocks.length - 1}\uE001`;
  });

  const citeInners = [];
  masked = masked.replace(SOURCE_BRACKET, (_, inner) => {
    citeInners.push(inner);
    return `${PLACEHOLDER_OPEN}${citeInners.length - 1}${PLACEHOLDER_CLOSE}`;
  });

  masked = masked.replace(/\[Source:/g, '\\[Source:');

  masked = masked.replace(
    new RegExp(`${PLACEHOLDER_OPEN}(\\d+)${PLACEHOLDER_CLOSE}`, 'g'),
    (_, i) => citationReplacementMarkdown(citeInners[Number(i)])
  );

  return masked.replace(/\uE000(\d+)\uE001/g, (_, i) => blocks[Number(i)]);
}

function flattenText(children) {
  if (children == null || children === false) return '';
  if (typeof children === 'string' || typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(flattenText).join('');
  if (React.isValidElement(children)) return flattenText(children.props.children);
  return '';
}

/** Space after citation chips so the following sentence/link isn’t flush against the pill. */
const SOURCE_CHIP_FLOW_GAP = 'mr-5 mb-3';

function SourceDocChip({ label, variant }) {
  const chip =
    variant === 'user'
      ? `inline-flex max-w-full flex-wrap items-start gap-1.5 rounded-xl border border-current/25 bg-current/[0.08] px-2.5 py-1.5 align-middle text-[11px] font-semibold leading-snug text-inherit shadow-sm ${SOURCE_CHIP_FLOW_GAP}`
      : `inline-flex max-w-full flex-wrap items-start gap-1.5 rounded-xl border border-amber-600/35 bg-amber-50 px-2.5 py-1.5 align-middle text-[11px] font-semibold leading-snug text-amber-950 shadow-sm dark:border-amber-400/35 dark:bg-amber-950/45 dark:text-amber-50 ${SOURCE_CHIP_FLOW_GAP}`;
  return (
    <span className={chip} title={label.length > 120 ? label : undefined}>
      <span className="shrink-0 rounded bg-current/10 px-1 py-px text-[9px] font-bold uppercase tracking-wide opacity-80">
        Source
      </span>
      <span className="min-w-0 max-w-full whitespace-normal break-words font-medium">{label}</span>
    </span>
  );
}

function tableWrapperClass(variant) {
  return variant === 'user'
    ? 'my-4 overflow-x-auto rounded-xl border border-white/28 bg-black/[0.12] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[2px]'
    : 'my-4 overflow-x-auto rounded-xl border border-neutral-200/90 bg-white/60 shadow-sm ring-1 ring-black/[0.04] dark:border-white/12 dark:bg-neutral-950/35 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:ring-white/[0.06]';
}

const TABLE_BASE =
  'w-full min-w-[16rem] border-collapse text-left text-[13px] leading-snug tabular-nums';

/** thead stays visually minimal — each `th` owns fill + sticky so rows don’t bleed through */
function theadClass() {
  return '';
}

function thClass(variant) {
  const sticky =
    'sticky top-0 z-20 shadow-[0_3px_8px_-4px_rgba(0,0,0,0.14)] dark:shadow-[0_3px_10px_-4px_rgba(0,0,0,0.5)]';
  return variant === 'user'
    ? `${sticky} border-b border-white/30 bg-white/26 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-inherit backdrop-blur-sm first:pl-4 last:pr-4`
    : `${sticky} border-b border-amber-800/20 bg-amber-100/96 px-3 py-2.5 text-left text-[11px] font-bold uppercase tracking-wider text-amber-950 first:pl-4 last:pr-4 dark:border-amber-400/25 dark:bg-amber-900/94 dark:text-amber-50`;
}

function tbodyClass(variant) {
  return variant === 'user'
    ? '[&_tr:nth-child(even)]:bg-white/[0.07]'
    : '[&_tr:nth-child(even)]:bg-neutral-100/55 dark:[&_tr:nth-child(even)]:bg-white/[0.04]';
}

function trClass(variant) {
  return variant === 'user'
    ? 'transition-colors last:[&>td]:border-b-0 hover:bg-white/10'
    : 'transition-colors last:[&>td]:border-b-0 hover:bg-amber-100/35 dark:hover:bg-amber-950/35';
}

function tdClass(variant) {
  return variant === 'user'
    ? 'border-b border-white/18 px-3 py-2.5 align-top text-inherit first:pl-4 last:pr-4'
    : 'border-b border-neutral-200/80 px-3 py-2.5 align-top text-neutral-800 first:pl-4 last:pr-4 dark:border-white/10 dark:text-neutral-100';
}

function createMarkdownComponents(variant) {
  return {
    table({ children }) {
      return (
        <div className={tableWrapperClass(variant)}>
          <table className={TABLE_BASE}>{children}</table>
        </div>
      );
    },
    thead({ children }) {
      return <thead className={theadClass()}>{children}</thead>;
    },
    tbody({ children }) {
      return <tbody className={tbodyClass(variant)}>{children}</tbody>;
    },
    tr({ children, ...rest }) {
      return (
        <tr className={trClass(variant)} {...rest}>
          {children}
        </tr>
      );
    },
    th({ children, node: _n, ...rest }) {
      return (
        <th className={thClass(variant)} {...rest}>
          {children}
        </th>
      );
    },
    td({ children, node: _n, ...rest }) {
      return (
        <td className={tdClass(variant)} {...rest}>
          {children}
        </td>
      );
    },
    a({ href, children, node: _node, ...rest }) {
      if (href?.startsWith(CITE_HASH_PREFIX)) {
        const label = decodeLabelFromHash(href) || href.slice(CITE_HASH_PREFIX.length);
        return <SourceDocChip label={label} variant={variant} />;
      }

      const text = flattenText(children);
      const isHttp = /^https?:\/\//i.test(href || '');
      const fromSourcePreprocessor = isHttp && /\bSource\b/.test(text) && /🔗/.test(text);

      if (fromSourcePreprocessor) {
        const urlChip =
          variant === 'user'
            ? `inline-flex max-w-full flex-wrap items-start gap-2 rounded-xl border border-sky-300/45 bg-sky-400/12 px-2.5 py-1.5 text-[11px] font-semibold text-inherit no-underline shadow-sm hover:bg-sky-400/20 ${SOURCE_CHIP_FLOW_GAP}`
            : `inline-flex max-w-full flex-wrap items-start gap-2 rounded-xl border border-blue-300 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-900 no-underline shadow-sm hover:bg-blue-100 dark:border-sky-500/40 dark:bg-sky-950/50 dark:text-sky-50 dark:hover:bg-sky-900/55 ${SOURCE_CHIP_FLOW_GAP}`;

        return (
          <a
            {...rest}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            data-source-chip
            className={urlChip}
          >
            <span className="shrink-0 rounded bg-current/10 px-1 py-px text-[9px] font-bold uppercase tracking-wide opacity-80">
              Source
            </span>
            <span className="min-w-0 max-w-full whitespace-normal break-all underline decoration-current/40 underline-offset-2">
              {href}
            </span>
            <span className="sr-only"> (opens in new tab)</span>
          </a>
        );
      }

      const inlineLink =
        variant === 'user'
          ? 'font-semibold text-inherit underline decoration-current/45 underline-offset-[3px] hover:decoration-current'
          : 'font-medium text-blue-700 underline decoration-blue-700/35 underline-offset-2 hover:text-blue-900 dark:text-sky-300 dark:hover:text-sky-100';

      return (
        <a {...rest} href={href} target="_blank" rel="noopener noreferrer" className={inlineLink}>
          {children}
        </a>
      );
    },
  };
}

function MarkdownBlock({ markdown, variant }) {
  const processed = preprocessSourceCitations(markdown);
  const proseClassName = variant === 'user' ? proseUser : proseAssistant;
  const components = useMemo(() => createMarkdownComponents(variant), [variant]);

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} className={proseClassName} components={components}>
      {processed}
    </ReactMarkdown>
  );
}

/**
 * Renders assistant/user markdown plus optional embedded Recharts bar block.
 * @param {'assistant' | 'user'} [variant]
 */
export function MessageMarkdownContent({ content, chartBarFill = '#3b82f6', variant = 'assistant' }) {
  const safeContent = content == null ? '' : String(content);
  const match = safeContent.match(CHART_BLOCK);

  if (match) {
    const textBefore = safeContent.replace(CHART_BLOCK, '');
    let chartData = [];
    try {
      chartData = JSON.parse(match[1]);
    } catch {
      chartData = [];
    }

    return (
      <div>
        <MarkdownBlock markdown={textBefore} variant={variant} />
        {chartData.length > 0 && (
          <div className="mt-4 h-64 w-full rounded-xl border border-black/[0.06] bg-white/80 p-3 shadow-inner dark:border-white/10 dark:bg-white/[0.06]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.35} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill={chartBarFill} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  }

  return <MarkdownBlock markdown={safeContent} variant={variant} />;
}
