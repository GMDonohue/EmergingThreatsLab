import { mockClient } from 'aws-sdk-client-mock';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { saveHTMLToS3, saveToDynamoDB } from '../functions/s3DynamoUtils.js';

// Mock S3
const s3Mock = mockClient(S3Client);
s3Mock.on(PutObjectCommand).resolves({});

// Mock DynamoDB
const dynamoMock = mockClient(DynamoDBDocumentClient);
dynamoMock.on(PutCommand).resolves({});

// Test saveHTMLToS3 function
(async () => {
    const result = await saveHTMLToS3('test-id', '<html>Raw HTML</html>', 'Filtered Text');
    console.log('Mock S3 Result:', result);
})();

// Test saveToDynamoDB function
(async () => {
    const result = await saveToDynamoDB('test-id', [], 'Sample Image Text', {
        rawHTMLLocation: 's3://mock-bucket/raw-html/test-id.html',
        filteredHTMLLocation: 's3://mock-bucket/filtered-html/test-id.txt',
    });
    console.log('Mock DynamoDB Result:', result);
})();