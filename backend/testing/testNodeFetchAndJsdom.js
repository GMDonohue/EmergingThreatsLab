import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const testURL = "https://www.chrismytton.com/plain-text-websites/";

async function testNodeFetchAndJsdom() {
    try {
        // Fetch the HTML content from the URL
        const response = await fetch(testURL);
        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
        }
        const html = await response.text();

        // Parse the HTML using jsdom
        const dom = new JSDOM(html, {
            pretendToBeVisual: true, // Simulates a visual browser environment
        });

        const document = dom.window.document;

        // Extract the title of the webpage as a simple test
        const title = document.querySelector('title')?.textContent || 'No title found';
        console.log('Page Title:', title);

        // Extract the first <p> tag's text content as another test
        const firstParagraph = document.querySelector('p')?.textContent || 'No <p> tag found';
        console.log('First Paragraph:', firstParagraph);
    } catch (error) {
        console.error('Error during node-fetch or jsdom test:', error);
    }
}

testNodeFetchAndJsdom();