import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';  // Updated import for SDK v3
import dotenv from 'dotenv';
dotenv.config();

const s3 = new S3Client({ region: 'us-west-1' }); // Initialize S3Client with region

export async function uploadImage(event) {
  const file = event.body.file;  // base64 string passed in the event body
  console.log(process.env.S3_BUCKET_NAME);

  try {
    const buffer = Buffer.from(file, 'base64');  // Convert base64 to binary

    const params = {
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `uploads/${Date.now()}_image.png`,  // Unique file name
      Body: buffer,
      ContentType: 'image/png',
      ACL: 'bucket-owner-full-control',
    };

    // Use the new command method in v3
    const command = new PutObjectCommand(params);
    const s3Response = await s3.send(command); // s3.send() to execute the upload
    const s3Key = s3Response.Key;  // Return the S3 key for further processing

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Image uploaded successfully', s3Key: s3Key }),
    };
  } catch (error) {
    console.error('Error uploading image:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error uploading image' }),
    };
  }
}
