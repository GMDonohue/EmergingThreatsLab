const { handler } = require("../functions/mainHandler");
const fs = require("fs");
const imageBase64 = fs.readFileSync("test.png", "base64");

const event = {
    body: JSON.stringify({
        image: imageBase64,
    }),
};

const context = {};

handler(event, context)
    .then((response) => console.log("Response:", response))
    .catch((error) => console.error("Error:", error));
