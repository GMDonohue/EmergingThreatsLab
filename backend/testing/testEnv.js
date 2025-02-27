// testEnv.js
const dotenv = require('dotenv');
dotenv.config({ path: '../.env' });  // Path to .env file

console.log(process.env.S3_BUCKET_NAME);  // Should log bucket name
