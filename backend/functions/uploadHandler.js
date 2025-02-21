// not currently needed 

import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';

dotenv.config();
const s3 = new S3Client({ region: 'us-west-1' });

export async function uploadImage(event) {
  console.log('Event:', event);

  // API Gateway sends the binary file as a base64 string in event.body
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'No file uploaded' }),
    };
  }

  // Decode the base64 string into a buffer
  const fileBuffer = Buffer.from(event.body, 'base64');
  const fileType = event.headers['Content-Type'] || 'image/png';
  const fileName = `uploads/${Date.now()}_uploaded_file.png`;

  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: fileName,
    Body: fileBuffer,
    ContentType: fileType,
    ACL: 'bucket-owner-full-control',
  };

  try {
    await s3.send(new PutObjectCommand(params));
    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Image uploaded successfully', s3Key: fileName }),
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error uploading image' }),
    };
  }
}
