import { dataExtraction } from "../functions/mainHandler.js";
import { getWhoisData } from "../functions/whois.js";
import fs from "fs";


function encodeImageToBase64(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    return `data:image/png;base64,${imageBuffer.toString("base64")}`;
}
const imageBase64 = encodeImageToBase64("backend/testing/3325.png");

const event = {
    body: JSON.stringify({
        image: imageBase64,
    }),
};

const context = {};

dataExtraction(event, context)
    .then((response) => console.log("Response:", response))
    .catch((error) => console.error("Error:", error));

