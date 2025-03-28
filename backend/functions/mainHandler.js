import * as AWS from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import processImage from "./llm.js";
import { DynamoDBClient, ScanCommand } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { getWhoisData, parseWhoisData } from './whois.js';
import { fetchRawHTML } from './fetchRawHTML.js';  
import { extractVisibleText } from './extractVisibleText.js';  


// DyanmoDB init
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-west-1" }));
const Db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-west-1" }));


async function saveHTMLToS3(messageId, rawHTML, filteredHTML) {
    try {
        // Create separate keys for raw and filtered HTML
        const rawHTMLKey = `raw-html/${messageId}.html`;
        const filteredHTMLKey = `filtered-html/${messageId}.txt`;

        // S3 upload params for raw HTML
        const rawHTMLParams = {
            Bucket: "emerging-threats-html-bucket",
            Key: rawHTMLKey,
            Body: rawHTML,
            ContentType: "text/html"
        };

        // S3 upload params for filtered HTML
        const filteredHTMLParams = {
            Bucket: "emerging-threats-html-bucket",
            Key: filteredHTMLKey,
            Body: filteredHTML,
            ContentType: "text/plain"
        };

        // Upload raw HTML
        const rawHTMLCommand = new PutObjectCommand(rawHTMLParams);
        await s3Client.send(rawHTMLCommand);

        // Upload filtered HTML
        const filteredHTMLCommand = new PutObjectCommand(filteredHTMLParams);
        await s3Client.send(filteredHTMLCommand);

        // Return S3 object locations for DynamoDB reference
        return {
            rawHTMLLocation: `s3://emerging-threats-html-bucket/${rawHTMLKey}`,
            filteredHTMLLocation: `s3://emerging-threats-html-bucket/${filteredHTMLKey}`
        };
    } catch (error) {
        console.error("Error saving HTML to S3:", error);
        throw error;
    }
}

// Modified saveToDynamoDB function to include S3 locations
async function saveToDynamoDB(imageId, whoisResults, imageText, htmlLocations) {
    try {
        // Prepare data for DynamoDB
        const dynamoParams = {
            TableName: "EmergingThreatsLabData",
            Item: {
                messageID: imageId,
                whoisData: whoisResults.length ? whoisResults.map(result => ({
                    name: result.name || "none",
                    nameServers: result.nameServers || ["none"],
                    registrar: result.registrar || "none",
                    creationDate: result.creationDate || "none",
                    updatedDate: result.updatedDate || "none",
                    ips: result.IPAddress?.length ? result.IPAddress : ["none"]
                })) : [{ name: "none", nameServers: ["none"], registrar: "none", creationDate: "none", updatedDate: "none", ips: ["none"] }],
                urls: whoisResults.length ? whoisResults.map(result => result.urls?.length ? result.urls : ["none"]) : [["none"]],
                text: imageText || "",
                // Add S3 HTML locations to DynamoDB record
                htmlLocations: htmlLocations || {
                    rawHTMLLocation: "none",
                    filteredHTMLLocation: "none"
                },
                timeSubmitted: new Date().toISOString(),
            }
        };

        const command = new PutCommand(dynamoParams);
        await dynamoDb.send(command);

        return { success: true, imageId };
    } catch (error) {
        console.error("Error saving to DynamoDB:", error);
        throw error;
    }
}

export const dataExtraction = async (event) => {
    // Handle CORS preflight request
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: "", // Empty body for preflight response
        };
    }

    try {
        // Ensure event.body exists
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
                body: JSON.stringify({ error: "Missing request body" })
            };
        }

        // Parse the request body
        const body = JSON.parse(event.body);
        const imageBase64 = body.image;

        // Ensure imageBase64 exists
        if (!imageBase64) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
                body: JSON.stringify({ message: "Missing image data" }),
            };
        }

        // Generate a unique image ID
        const imageId = uuidv4();

        // Extract text and urls with LLM
        const { imageText, urlString } = await processImage(imageBase64)
        const urls = urlString.split(" ")

        const whoisResults = [];
        const htmlDataArray = [];
        for (const url of urls) {
            try {
                // Existing WHOIS lookup
                const { whoisData, ips } = await getWhoisData(url);
                if (whoisData) {
                    const parsedWhoisData = await parseWhoisData(whoisData, ips, urls);
                    whoisResults.push(parsedWhoisData);
                }
        
                // Fetch and process HTML
                const rawHTMLData = await fetchRawHTML(url);
                const filteredHTMLText = await extractVisibleText(url);
        
                // Save HTML to S3
                const htmlLocations = await saveHTMLToS3(imageId, rawHTMLData, filteredHTMLText);
        
                // Collect HTML data (optional, for debugging or logging purposes)
                htmlDataArray.push({
                    url,
                    htmlLocations // Only store S3 locations
                });
        
            } catch (error) {
                console.error(`Failed to process ${url}:`, error);
            }
        }

        // Save to DynamoDB once with all collected data
        await saveToDynamoDB(imageId, {
            whoisResults,
            imageText,
            htmlDataArray
        });

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({ whoisData: whoisResults }),
        };
    } catch (error) {
        console.error("Error in handler:", error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                "Access-Control-Allow-Headers": "Content-Type",
            },
            body: JSON.stringify({ error: "Internal server error" })
        };
    }
};

