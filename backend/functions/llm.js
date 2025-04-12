import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});


export default async function processImage(base64Image) {
    try {
        const completion = await client.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: "You are an OCR and a URL extractor. Respond with the extracted text first, followed by '---' as a separator, then list any URLs found in the image space-separated. If no URLs are found, write 'No URLs found'.",
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
        console.log(textPart)

        return {
            text: textPart,
            urlString: urlPart
        }

    } catch (error) {
        console.error("Error processing image:", error);
        console.error("Error details:", error.response ? error.response.data : error.message);
        throw new Error("Failed to process image with OpenAI API.");
    }
}
