import { readFileSync } from 'fs';
import { uploadImage } from '../functions/uploadHandler.js'; // Import the uploadImage function
import dotenv from 'dotenv'
dotenv.config({path:'../.env'});

// Hardcoded path to the test_base64.txt file
const base64Data = readFileSync('./test_base64.txt', 'utf-8');

// Make sure base64 string is loaded correctly
//console.log(base64Data);

// uploadImage accepts event with the base64 string, format event object
const event = {
  body: {
    file: base64Data,  // Base64 string to be uploaded
  }
};

// Call the uploadImage function from uploadHandler.js
const testUpload = async () => {
  try {
    const result = await uploadImage(event);
    console.log(result);
  } catch (error) {
    console.error('Error in testing upload:', error);
  }
};

testUpload();
