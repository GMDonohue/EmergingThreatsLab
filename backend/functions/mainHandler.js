// Description: This file contains the main handler function for the data extraction Lambda function.
// It extracts text and URLs from an image, performs WHOIS lookups, fetches and processes HTML data, and saves the data to DynamoDB and S3.
import { v4 as uuidv4 } from 'uuid';
import processImage from "./llm.js";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getWhoisData, parseWhoisData } from './whois.js';
import { fetchRawHTML } from './fetchRawHTML.js';  
import { extractVisibleText } from './extractVisibleText.js';  
import { saveHTMLToS3, saveToDynamoDB } from './s3DynamoUtils.js';

// DyanmoDB init
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-west-1" }));
const Db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-west-1" }));

export const dataExtraction = async (event) => {
    // Handle CORS preflight request
    if (event.httpMethod === "OPTIONS") {
        return {
            statusCode: 204,
            headers: {
                "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
                "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
            },
            body: "", // Empty body for preflight response
        };
    }

    try {
        // Extract headers
        console.log("Received event:", JSON.stringify(event, null, 2));
        console.log("Headers:", JSON.stringify(event.headers, null, 2));
        const headers = event.headers || {};
        const apiKey = headers['x-api-key'];
        const contentType = headers['Content-Type'] || headers['content-type'];

        // Validate API key
        if (!apiKey) {
            return {
                statusCode: 401,
                headers: {
                    "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                    "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
                    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                },
                body: JSON.stringify({ error: "Missing API key" }),
            };
        }

        // Validate Content-Type
        if (contentType !== "application/json") {
            return {
                statusCode: 400,
                headers: {
                "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
                "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
            },
                body: JSON.stringify({ error: "Invalid Content-Type. Expected application/json" }),
            };
        }

        // Ensure event.body exists and is valid JSON
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                    "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
                    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                },
                body: JSON.stringify({ error: "Missing request body" }),
            };
        }

        let body;
        try {
            body = JSON.parse(event.body);
        } catch (error) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                    "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
                    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                },
                body: JSON.stringify({ error: "Invalid JSON in request body" }),
            };
        }

        const imageBase64 = body.image;

        // Ensure imageBase64 exists
        if (!imageBase64) {
            return {
                statusCode: 400,
                headers: {
                    "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                    "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
                    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
                },
                body: JSON.stringify({ error: "Missing image data" }),
            };
        }

        // Generate a unique image ID
        const imageId = uuidv4();

        // Extract text and URLs with LLM
        const { imageText, urlString } = await processImage(imageBase64);
        const urls = urlString.split(" ");

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
                    htmlLocations, // Only store S3 locations
                });
            } catch (error) {
                console.error(`Failed to process ${url}:`, error);
            }
        }

        // Save to DynamoDB once with all collected data
        await saveToDynamoDB(imageId, {
            whoisResults,
            imageText,
            htmlDataArray,
        });

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
                "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
            },
            body: JSON.stringify({ whoisData: whoisResults }),
        };
    } catch (error) {
        console.error("Error in handler:", error);
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "https://emergingthreats-frontend-bucket.s3.us-west-1.amazonaws.com",
                "Access-Control-Allow-Headers": "Content-Type, X-Api-Key",
                "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
            },
            body: JSON.stringify({ error: "Internal server error" }),
        };
    }
};

