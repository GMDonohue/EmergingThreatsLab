import AWS from 'aws-sdk'; // Use 'import' instead of 'require'
const s3 = new AWS.S3();

export const uploadImage = async (event) => {
    console.log("Received event:", JSON.stringify(event, null, 2));

    const { imageData } = JSON.parse(event.body);

    if (!imageData) {
        console.error('No imageData provided');
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ message: 'No image data provided' }),
        };
    }

    try {
        const buffer = Buffer.from(imageData, 'base64');

        const params = {
            Bucket: 'emerging-threats-image-bucket',
            Key: `uploads/${Date.now()}.png`,
            Body: buffer,
            ContentType: 'image/png',
        };

        const s3Response = await s3.upload(params).promise();

        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                message: 'Image uploaded successfully',
                s3Url: s3Response.Location,
            }),
        };
    } catch (error) {
        console.error('Error uploading image:', error);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ message: 'Error uploading image', error: error.message }),
        };
    }
};
