import { fetchRawHTML } from "../functions/fetchRawHTML.js";

async function testFetchRawHTML() {
    const testURL = "https://www.irs.com/en/";
    console.log(`Fetching raw HTML from: ${testURL}`);

    const rawHTML = await fetchRawHTML(testURL);
    if (rawHTML) {
        console.log("Raw HTML fetched successfully.");
        console.log("Preview (first 500 chars):", rawHTML.substring(0, 500));
    } else {
        console.log("Failed to fetch raw HTML.");
    }
}

testFetchRawHTML();
