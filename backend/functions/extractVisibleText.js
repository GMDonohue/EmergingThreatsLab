import { JSDOM } from 'jsdom';
import { fetchRawHTML } from './fetchRawHTML.js';

async function extractVisibleText(url) {
    try {
        const html = await fetchRawHTML(url);

        // Configure JSDOM to work without canvas
        const dom = new JSDOM(html, {
            pretendToBeVisual: true, // Simulates a visual browser environment
        });

        const document = dom.window.document;

        // Remove unwanted elements
        const unwantedElements = document.querySelectorAll('script, style, meta, link, noscript, svg, iframe');
        unwantedElements.forEach(el => el.remove());

        // Remove elements with common accessibility hiding attributes
        const hiddenElements = document.querySelectorAll('[aria-hidden="true"], [hidden], [style*="display: none"], [style*="visibility: hidden"]');
        hiddenElements.forEach(el => el.remove());

        // Get all text content from the entire document
        const text = document.documentElement.textContent || '';

        // Clean up the text
        return text.replace(/\s+/g, ' ').trim();
    } catch (error) {
        console.error('Error extracting text:', error);
        throw error;
    }
}

export { extractVisibleText };