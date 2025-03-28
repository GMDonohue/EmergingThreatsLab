import { JSDOM } from 'jsdom';
import fetch from 'node-fetch';

// Simple function to extract text from a webpage
async function extractVisibleText(url) {
    try {
        // Fetch the webpage
        const response = await fetch(url);
        const html = await response.text();

        // Create a JSDOM instance
        const dom = new JSDOM(html);
        const document = dom.window.document;

        // Remove script and style elements
        const scripts = document.querySelectorAll('script, style, meta, link');
        scripts.forEach(el => el.remove());

        // Get all text from the body
        const text = document.body.textContent || '';

        // Clean up the text (remove extra whitespace)
        return text.replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error('Error extracting text:', error);
        throw error;
    }
}

export { extractVisibleText };