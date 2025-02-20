// API accepts images, OCR to parse URL and return whois data
// Return data to user, and save to DynamoDb

//TODO: Add functionality to send data to DynamoDb
// TODO: API response to user

const Tesseract = require("tesseract.js");
const whois = require("whois");
const fs = require("fs");

async function readTextFromImage(imagePath) {
    try {
        const {
            data: { text },
        } = await Tesseract.recognize(imagePath, "eng", {
            logger: (e) => console.log(e),
        });
        return text;
    } catch (error) {
        console.error("Error during OCR:", error);
        throw error;
    }
}

function getUrlFromText(text) {
    const urlRe = /https?:\/\/[^\s]+\.[^\s\.]+/g;
    const urls = text.match(urlRe) || [];
    return urls;
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
        fs.writeFile("test.txt", data, (err) => {
            if (err) throw err;
        });
        return data;
    } catch (error) {
        console.error(`Error fetching WHOIS data for ${url}:`, error);
        throw error;
    }
}
async function getIpFromWhois(whoisData){
    const domainName=whoisData.match(/Domain Name: (.+)/i)?.[1]?.trim();
    var response = await fetch(`https://dns.google/resolve?name=${domainName}`);
    var json = await response.json();
    var ips=[];
    for(const elem of json['Answer']){
        ips.push(elem['data']);
    }
    return ips
}
async function parseWhoisData(whoisData) {
    ips = await getIpFromWhois(whoisData);
    const fields = {
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
    };
    return fields;
}

async function processTextForWhois(text) {
    const urls = getUrlFromText(text);

    if (urls.length === 0) {
        console.log("No URLs found in the text.");
        return;
    }

    for (const url of urls) {
        try {
            const whoisData = await getWhoisData(url);
            const parsedWhoisData = await parseWhoisData(whoisData);
            console.log(`WHOIS data for ${url}:`, parsedWhoisData);
        } catch (error) {
            console.error(`Failed to process ${url}:`, error);
        }
    }
}

//Need to change this so it is server waiting for get request and fulfills them
(async () => {
    const imagePath = "test_images/test_ss2.png";
    const text = await readTextFromImage(imagePath);
    processTextForWhois(text);
})();