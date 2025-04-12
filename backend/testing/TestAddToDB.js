import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

// Create DynamoDB Client
const client = new DynamoDBClient({ region: "us-west-1" });

// Define the item to add
const params = {
  TableName: "EmergingThreatsLabData",  
  Item: {
    "messageID": { N: "1" },  // Unique key
    "message": { N: "1" },
    "timeSubmitted": { N: "1629496561000" },
    "sender": { S: "John Doe" },
    "rawText": { S: "New message content" },
    "VTResults": {
      M: {
        "detected": { S: "0" },
        "malicious": { S: "0" },
        "phishing": { S: "0" },
        "malware": { S: "0" },
        "suspicious": { S: "0" }
      }
    },
    "url": { S: "https://example.com" },
    "submitName": { S: "Anonymous" },
    "request_id": { S: "1" }
  }
};

async function addItem() {
  try {
    await client.send(new PutItemCommand(params));
    console.log("Item added successfully!");
  } catch (error) {
    console.error("Error adding item:", error);
  }
}

addItem();
