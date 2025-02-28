import * as AWS from 'aws-sdk'; 
import whois from 'whois';
import { v4 as uuidv4 } from 'uuid';


// Importing the required services from the AWS SDK v3 packages
import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb"; // General DynamoDB Client
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb"; // For DocumentClient-like API
import { PutCommand } from '@aws-sdk/lib-dynamodb'; 

// Initializing Textract client
const textract = new TextractClient({ region: "us-west-1" });

// Initializing DynamoDB client and wrapping it with DynamoDBDocumentClient for DocumentClient API
const dynamoDb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: "us-west-1" }));

// const TABLE_NAME = process.env.DYNAMODB_TABLE_NAM;

// Helper functions
async function extractTextFromImage(imageBytes) {
    try {
        const params = {
            Document: { Bytes: imageBytes },
        };

        // Corrected the Textract v3 usage
        const command = new DetectDocumentTextCommand(params);
        const response = await textract.send(command); // Use send() to execute the command

        const text = response.Blocks.filter(
            (block) => block.BlockType === "LINE"
        )
            .map((block) => block.Text)
            .join("\n");

        return text;
    } catch (error) {
        console.error("Error during OCR:", error);
        throw error;
    }
}

async function getWhoisData(url) {
    try {
        const domain = new URL(url).hostname;

        const data = await new Promise((resolve, reject) => {
            whois.lookup(domain, (err, data) => {
                if (err) reject(err);
                else resolve(data);
            });
        });
        //Get IP Adresses from domain name using Google DNS
        let ips = [];
        try {
            const response = await fetch(
                `https://dns.google/resolve?name=${domain}`
            );
            const json = await response.json();
            ips = json.Answer?.map((entry) => entry.data) || [];
        } catch (error) {
            console.error(`Failed to fetch IPs for ${domain}:`, error);
        }
        return { whoisData: data, ips };
    } catch (error) {
        console.error(`Error fetching WHOIS data for ${url}:`, error);
        throw error;
    }
}

async function parseWhoisData(whoisData, ips, urls, text) {
    if (!whoisData) {
        throw new Error("WHOIS data is undefined");
    }

    const fields = {
        urls: urls,
        name: whoisData.match(/Domain Name: (.+)/i)?.[1]?.trim(),  
        nameServers: whoisData
            .match(/Name Server: (.+)/gi)
            ?.map((ns) => ns.replace("Name Server:", "").trim()), 
        registrar: whoisData.match(/Registrar: (.+)/i)?.[1]?.trim(),
        creationDate: whoisData
            .match(/(Creation Date|Registered On): (.+)/i)?.[2]
            ?.trim(),  
        IPAddress: ips,
        updatedDate: whoisData
            .match(/(Updated Date|Last Updated On): (.+)/i)?.[2]
            ?.trim(),   
        rawText: text,  
    };

    return fields;
}


async function saveToDynamoDB(imageId, whoisResults) {
    try {
        // Check the content of whoisResults before processing
        console.log("whoisResults:", JSON.stringify(whoisResults, null, 2));

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
        text: whoisResults.length ? whoisResults.map(result => {
            console.log("Processing result rawText:", result.rawText);
            return result.rawText || "none";  // Ensure rawText is not undefined or null
        }) : ["none"], // Handle empty `whoisResults`
        timeSubmitted: new Date().toISOString(), // Timestamp
    }
    };

        console.log("DynamoDB Params:", JSON.stringify(dynamoParams, null, 2)); // Debug log

        // Use the PutCommand with DynamoDBDocumentClient for v3
        const command = new PutCommand(dynamoParams);
        await dynamoDb.send(command); // Use send() to execute the command

        console.log("Data saved successfully to DynamoDB:", imageId);
        return { success: true, imageId };
    } catch (error) {
        console.error("Error saving data to DynamoDB:", error);
        throw error;
    }
}



function getUrlFromText(text) {
    const urlRe = /https?:\/\/[^\s]+\.[^\s\.]+/g;
    //(https?:\/\/)?[^\s]+\.[^\s\.]+
    const urls = text.match(urlRe) || [];
    return urls;
}


export const dataExtraction = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

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
                body: JSON.stringify({ message: "Missing request body" }),
            };
        }

        // Parse the request body
        const body = JSON.parse(event.body);
        console.log("Parsed body:", JSON.stringify(body, null, 2));

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

        // Convert base64 image to buffer
        const imageBytes = Buffer.from(imageBase64, "base64");

        // Process image text
        const text = await extractTextFromImage(imageBytes);
        console.log("Extracted text:", text);

        // Extract URLs
        const urls = getUrlFromText(text);

        // WHOIS lookup
        const whoisResults = [];
        for (const url of urls) {
            try {
                const { whoisData, ips } = await getWhoisData(url);

                // Ensure whoisData exists before parsing
                if (whoisData) {
                    const parsedWhoisData = await parseWhoisData(whoisData, ips, urls, text);
                    whoisResults.push(parsedWhoisData);
                } else {
                    console.warn(`No WHOIS data found for ${url}`);
                }
            } catch (error) {
                console.error(`Failed to process ${url}:`, error);
            }
        }

        console.log("WHOIS Results:", whoisResults);

        // Generate a unique image ID
        const imageId = uuidv4();

        // Save to DynamoDB and wait for result
        const saveResult = await saveToDynamoDB(imageId, whoisResults);
        console.log("DynamoDB Save Result:", saveResult);

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
            body: JSON.stringify({ message: "Error", error: error.message }),
        };
    }
}