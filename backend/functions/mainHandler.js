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

async function saveToDynamoDB(imageId, whoisResults, rawText) {
    try {
        // Prepare data for DynamoDB
        const dynamoParams = {
            TableName: "EmergingThreatsLabData",
            Item: {
                messageID: imageId,  // Unique identifier for this record
                whoisData: whoisResults.length ? whoisResults.map(result => ({
                    name: result.name || "none",
                    nameServers: result.nameServers || ["none"],
                    registrar: result.registrar || "none",
                    creationDate: result.creationDate || "none",
                    updatedDate: result.updatedDate || "none",
                    ips: result.IPAddress?.length ? result.IPAddress : ["none"] // Include IPs inside whoisData
                })) : [{ name: "none", nameServers: ["none"], registrar: "none", creationDate: "none", updatedDate: "none", ips: ["none"] }],
                urls: whoisResults.length ? whoisResults.map(result => result.urls?.length ? result.urls : ["none"]) : [["none"]], // Handle empty URL arrays
                text: rawText || "",
                timeSubmitted: new Date().toISOString(), // Timestamp
            }
        };

        // Use the PutCommand with DynamoDBDocumentClient for v3
        const command = new PutCommand(dynamoParams);
        await dynamoDb.send(command); // Use send() to execute the command

        return { success: true, imageId };
    } catch (error) {
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

        // Extract text and urls with LLM
        const { text, urlString } = await processImage(imageBase64)
        const urls = urlString.split(" ")

        // WHOIS lookup + html parsing
        const whoisResults = [];
        const rawHTML = [];
        const filteredHTML = [];
        for (const url of urls) {
            try {
                const { whoisData, ips } = await getWhoisData(url);

                // Ensure whoisData exists before parsing
                if (whoisData) {
                    const parsedWhoisData = await parseWhoisData(whoisData, ips, urls);
                    whoisResults.push(parsedWhoisData);
                } else {
                    console.warn(`No WHOIS data found for ${url}`);
                }
            } catch (error) {
                console.error(`Failed to process ${url}:`, error);
            }

            try {
                // Fetch raw HTML
                const{rawHTMLData} = await fetchRawHTML(url);
                rawHTML.push(rawHTMLData);
                    
                // Extract visible text from the raw HTML
                const visibleText = extractVisibleText(rawHTMLData);
                filteredHTML.push(visibleText);

            }catch (error) {
                console.error(`Failed to fetch or extract HTML for ${url}:`, error);
            }
        }

        // Generate a unique image ID
        const imageId = uuidv4();

        //Save to DynamoDB and wait for result
        const saveResult = await saveToDynamoDB(imageId, whoisResults);

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

