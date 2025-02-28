import { dataExtraction } from "../functions/mainHandler.js";
import { readFileSync } from "fs";
const imageBase64 = readFileSync("test.png", "base64");
const event = {
    body: JSON.stringify({
        image: imageBase64,
    }),
};

const context = {};

dataExtraction(event, context)
    .then((response) => console.log("Response:", response))
    .catch((error) => console.error("Error:", error));
