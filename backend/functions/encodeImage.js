import fs from "fs";
import path from "path";

/**
 * Encodes an image file to a Base64 string.
 * @param {string} filePath - The path to the image file.
 * @returns {string|null} - Base64-encoded image string or null if an error occurs.
 */
export function encodeImageToBase64(filePath) {
    try {
        const imageBuffer = fs.readFileSync(path.resolve(filePath));
        return `data:image/jpeg;base64,${imageBuffer.toString("base64")}`;
    } catch (error) {
        console.error("Error reading image file:", error);
        return null;
    }
}
