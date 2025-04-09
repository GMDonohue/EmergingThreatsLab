import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import fs from "fs/promises";
import os from "os";

// Initialize AWS clients
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-west-1" }));
const s3Client = new S3Client({ region: "us-west-1" });

export async function saveHTMLToS3(messageId, rawHTML, filteredHTML) {
    try {
        // Get the system's temporary directory
        const tempDir = os.tmpdir();

        // Define file paths for temporary storage
        const rawHTMLFilePath = `${tempDir}/${messageId}-raw.html`;
        const filteredHTMLFilePath = `${tempDir}/${messageId}-filtered.txt`;

        // Write rawHTML and filteredHTML to temporary files
        await fs.writeFile(rawHTMLFilePath, rawHTML, "utf8");
        await fs.writeFile(filteredHTMLFilePath, filteredHTML, "utf8");

        // Define S3 keys
        const rawHTMLKey = `raw-html/${messageId}.html`;
        const filteredHTMLKey = `filtered-html/${messageId}.txt`;

        // Upload rawHTML file to S3
        const rawHTMLParams = {
            Bucket: "emerging-threats-html-bucket",
            Key: rawHTMLKey,
            Body: await fs.readFile(rawHTMLFilePath), // Read the file content
            ContentType: "text/html",
        };

        // Upload filteredHTML file to S3
        const filteredHTMLParams = {
            Bucket: "emerging-threats-html-bucket",
            Key: filteredHTMLKey,
            Body: await fs.readFile(filteredHTMLFilePath), // Read the file content
            ContentType: "text/plain",
        };

        // Send files to S3
        await s3Client.send(new PutObjectCommand(rawHTMLParams));
        await s3Client.send(new PutObjectCommand(filteredHTMLParams));

        // Clean up temporary files
        await fs.unlink(rawHTMLFilePath);
        await fs.unlink(filteredHTMLFilePath);

        // Return S3 locations
        return {
            rawHTMLLocation: `s3://emerging-threats-html-bucket/${rawHTMLKey}`,
            filteredHTMLLocation: `s3://emerging-threats-html-bucket/${filteredHTMLKey}`,
        };
    } catch (error) {
        console.error("Error saving HTML to S3:", error);
        throw error;
    }
}

export async function saveToDynamoDB(imageId, whoisResults, imageText, htmlLocations) {
    try {
        const dynamoParams = {
            TableName: "EmergingThreatsLabData",
            Item: {
                messageID: imageId,
                whoisData: whoisResults,
                text: imageText || "",
                htmlLocations: htmlLocations || {
                    rawHTMLLocation: "none",
                    filteredHTMLLocation: "none",
                },
                timeSubmitted: new Date().toISOString(),
            },
        };

        await dynamoDb.send(new PutCommand(dynamoParams));
        return { success: true, imageId };
    } catch (error) {
        console.error("Error saving to DynamoDB:", error);
        throw error;
    }
}