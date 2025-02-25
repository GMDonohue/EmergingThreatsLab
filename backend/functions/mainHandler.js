//testing having all logic in single handler because applicaiton simple
const AWS = require("aws-sdk");
const whois = require("whois");
const { v4: uuidv4 } = require("uuid");

const textract = new AWS.Textract({ region: "us-west-1" });
const dynamoDb = new AWS.DynamoDB.DocumentClient();

const TABLE_NAME = "EmergingThreatsLabData";

// Helper functions
async function extractTextFromImage(imageBytes) {
    try {
        const params = {
            Document: { Bytes: imageBytes },
        };
        const response = await textract.detectDocumentText(params).promise();

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
        IPAdress: ips,
        updatedDate: whoisData
            .match(/(Updated Date|Last Updated On): (.+)/i)?.[2]
            ?.trim(),
        rawText: text,
    };
    return fields;
}

async function saveToDynamoDB(imageId, whoisResults) {
    try {
        // Prepare data for DynamoDB
        const dynamoParams = {
            TableName: TABLE_NAME,
            Item: {
                imageId: imageId, // Unique identifier for the record
                whoisResults: whoisResults, // JSON object containing WHOIS data
                createdAt: new Date().toISOString(), // Timestamp for when the record was created
            },
        };

        // Save data to DynamoDB
        await dynamoDb.put(dynamoParams).promise();

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

exports.handler = async (event) => {
    try {
        const body = JSON.parse(event.body);
        const imageBytes = Buffer.from(body.image, "base64");

        const text = await extractTextFromImage(imageBytes);

        const urls = getUrlFromText(text);
        const whoisResults = [];
        for (const url of urls) {
            try {
                const { whoisData, ips } = await getWhoisData(url);
                const parsedWhoisData = await parseWhoisData(
                    whoisData,
                    ips,
                    urls,
                    text
                );
                whoisResults.push(parsedWhoisData);
            } catch (error) {
                console.error(`Failed to process ${url}:`, error);
            }
        }

        const imageId = uuidv4();
        try {
            const result = await saveToDynamoDB(imageId, whoisResults);
            console.log(result);
        } catch (error) {
            console.error("Error:", error);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ whoisData: whoisResults }),
        };
    } catch (error) {
        console.error("Error in handler:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Internal Server Error" }),
        };
    }
};
