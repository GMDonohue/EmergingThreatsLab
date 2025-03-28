import { extractVisibleText } from "../functions/extractVisibleText.js";

const testURL = "https://www.irs.com/en/";

async function testExtractVisibleText() {
    try {
        const visibleText = await extractVisibleText(testURL); 
        console.log('Visible text extraction completed!');
        console.log('Visible Text:', visibleText);
    } catch (error) {
        console.error('Error during visible text extraction:', error);
    }
}

testExtractVisibleText();



