// not in use

// import dotenv from 'dotenv';
// dotenv.config(); 

// import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';  // Import from AWS SDK v3
// const dynamoDB = new DynamoDBClient({ region: 'us-west-1' });  // Initialize DynamoDB client

// export async function handle(event) {
//   const body = JSON.parse(event.body);

//   // Extract the fields from the body (assume 'message', 'sender', 'url' are provided)
//   const { messageID, timeSubmitted, message, rawText, request_id, sender, submitName, url, VTResults } = body;

//   const params = {
//     TableName: process.env.DYNAMODB_TABLE_NAME,  // Using the environment variable for table name
//     Item: {
//       messageID: { S: messageID },  // DynamoDB v3 expects values in specific formats
//       timeSubmitted: { S: timeSubmitted },
//       message: { S: message },
//       rawText: { S: rawText },
//       request_id: { S: request_id },
//       sender: { S: sender },
//       submitName: { S: submitName },
//       url: { S: url },
//       VTResults: { S: VTResults }
//     }
//   };

//   try {
//     const command = new PutItemCommand(params);  // Create the command
//     await dynamoDB.send(command);  // Execute the command
//     return {
//       statusCode: 200,
//       body: JSON.stringify({ message: 'Report submitted successfully!' })
//     };
//   } catch (error) {
//     console.error('Error saving report to DynamoDB:', error);
//     return {
//       statusCode: 500,
//       body: JSON.stringify({ message: 'Failed to submit report' })
//     };
//   }
// }
