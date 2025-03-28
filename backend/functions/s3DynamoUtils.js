import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";

// Initialize AWS clients
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-west-1" }));
const s3Client = new S3Client({ region: "us-west-1" });

export async function saveHTMLToS3(messageId, rawHTML, filteredHTML) {
    try {
        const rawHTMLKey = `raw-html/${messageId}.html`;
        const filteredHTMLKey = `filtered-html/${messageId}.txt`;

        const rawHTMLParams = {
            Bucket: "emerging-threats-html-bucket",
            Key: rawHTMLKey,
            Body: rawHTML,
            ContentType: "text/html",
        };

        const filteredHTMLParams = {
            Bucket: "emerging-threats-html-bucket",
            Key: filteredHTMLKey,
            Body: filteredHTML,
            ContentType: "text/plain",
        };

        await s3Client.send(new PutObjectCommand(rawHTMLParams));
        await s3Client.send(new PutObjectCommand(filteredHTMLParams));

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