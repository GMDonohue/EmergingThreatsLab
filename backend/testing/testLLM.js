// This file is used to test the processImage function in llm.js
import path from "path";
import processImage from "../functions/llm.js";
import { encodeImageToBase64 } from "../functions/encodeImage.js";

const imagePath = path.resolve("backend/testing/3325.png"); // Replace with your image file

async function testProcessImage() {
    const base64Image = encodeImageToBase64(imagePath);
    if (!base64Image) return;

    console.log("Processing image...");
    const result = await processImage(base64Image);

    console.log("\nExtracted Text:");
    console.log(result.text);
    console.log("\nExtracted URLs:");
    console.log(result.urlString);
}

testProcessImage();
