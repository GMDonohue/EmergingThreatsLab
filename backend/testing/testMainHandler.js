import { dataExtraction } from "../functions/mainHandler.js";
import { getWhoisData } from "../functions/whois.js";
import { encodeImageToBase64 } from "../functions/encodeImage.js";
import fs from "fs";

// Test the dataExtraction function
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

