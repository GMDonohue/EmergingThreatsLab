import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";
dotenv.config();

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Function to encode a local image as a Base64 string
function encodeImageToBase64(imagePath) {
    const imageBuffer = fs.readFileSync(imagePath);
    return `data:image/png;base64,${imageBuffer.toString("base64")}`;
}

const base64Image = encodeImageToBase64("backend/testing/3325.png");

async function processImage() {
    try {
        const completion = await client.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: "You are an OCR and a URL extractor. Respond with the extracted text first, followed by '---' as a separator, then list any URLs found in the image. If no URLs are found, write 'No URLs found'.",
                },
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Process this image." },
                        { type: "image_url", image_url: { url: base64Image } },
                    ],
                },
            ],
        });
        const responseText = completion.choices[0].message.content;
        const [textPart, urlPart] = responseText.split("---").map(s => s.trim());

        return {
            text: textPart,
            urlPart: urlPart
        }

    } catch (error) {
        console.error("Error:", error);
    }
}

console.log(await processImage())
