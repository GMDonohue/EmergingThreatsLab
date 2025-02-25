// privateUploadHandler.js (private upload with IAM authentication)
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import Busboy from 'busboy';

dotenv.config();

const s3 = new S3Client({ region: 'us-west-1' });

export async function uploadImage(event) {
  try {
    if (!event.headers || !event.headers["content-type"]) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: "Missing Content-Type header" }),
      };
    }

    const contentType = event.headers["content-type"];

    return new Promise((resolve, reject) => {
      const busboy = new Busboy({ headers: { "content-type": contentType } });
      let fileBuffer = [];
      let fileName = `uploads/${Date.now()}_image.png`;

      busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
        file.on("data", (data) => {
          fileBuffer.push(data);
        });

        file.on("end", async () => {
          const buffer = Buffer.concat(fileBuffer);

          const params = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: buffer,
            ContentType: mimetype,
            ACL: "bucket-owner-full-control",  // adjust ACL if needed for private upload
          };

          try {
            await s3.send(new PutObjectCommand(params));
            resolve({
              statusCode: 200,
              body: JSON.stringify({ message: "Private Image uploaded successfully", fileName }),
            });
          } catch (error) {
            console.error("Error uploading private image:", error);
            reject({
              statusCode: 500,
              body: JSON.stringify({ message: "Error uploading private image" }),
            });
          }
        });
      });

      busboy.end(Buffer.from(event.body, "base64"));
    });
  } catch (error) {
    console.error("Error processing private upload:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing request" }),
    };
  }
}
