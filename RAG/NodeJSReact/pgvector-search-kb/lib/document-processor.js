import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

/**
 * Function to get the exact function from the pdf-parse library
 */
function getPdfParser() {
    try {
        const pdf = require('pdf-parse');
        
        // pdf-parse can export directly or via .default depending on runtime.
        if (typeof pdf === 'function') return pdf;
        if (pdf && typeof pdf.default === 'function') return pdf.default;
        
        throw new Error("Cannot find the processing function in the pdf-parse library.");
    } catch (e) {
        console.error("❌ Error loading the pdf-parse library:", e.message);
        return null;
    }
}

const pdfParse = getPdfParser();

export async function extractTextFromFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    
    // Check if the file exists before reading
    if (!fs.existsSync(filePath)) {
        throw new Error(`File does not exist: ${filePath}`);
    }

    const dataBuffer = fs.readFileSync(filePath);

    try {
        if (ext === '.pdf') {
            if (!pdfParse) throw new Error("pdf-parse library is not installed correctly.");
            
            // Call the library to parse
            const pdfData = await pdfParse(dataBuffer);
            return pdfData.text || "";
        } 
        else if (ext === '.docx') {
            const docxData = await mammoth.extractRawText({ buffer: dataBuffer });
            return docxData.value || "";
        } 
        else if (ext === '.txt') {
            return dataBuffer.toString('utf-8');
        } 
        else {
            throw new Error(`Format ${ext} is not supported.`);
        }
    } catch (error) {
        console.error(`❌ Error processing file ${ext}:`, error.message);
        throw error;
    }
}

/**
 * Function to split text into chunks of a certain length, with overlap.
 * @param {string} text - Full text
 * @param {number} chunkSize - Maximum number of characters per chunk (e.g. 1000)
 * @param {number} chunkOverlap - Number of characters to overlap with the previous chunk (e.g. 200)
 */
export function chunkText(text, chunkSize = 1000, chunkOverlap = 200) {
    // Clean up extra spaces
    const cleanText = text.replace(/\s+/g, ' ').trim();
    const chunks = [];
    let startIndex = 0;

    while (startIndex < cleanText.length) {
        let endIndex = startIndex + chunkSize;
        
        // If not at the end of the string, try to cut at a space to avoid breaking the line
        if (endIndex < cleanText.length) {
            const lastSpace = cleanText.lastIndexOf(' ', endIndex);
            if (lastSpace > startIndex) endIndex = lastSpace;
        }

        const chunk = cleanText.substring(startIndex, endIndex);
        chunks.push(chunk);

        // Move forward, subtract the overlap
        startIndex = endIndex - chunkOverlap;
    }

    return chunks;
}
