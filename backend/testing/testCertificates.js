import { getSSLCertificate } from '../functions/extractCertificate.js';

async function testCertificate() {
    try {
        console.log('Testing SSL certificate retrieval for google.com...');
        const cert = await getSSLCertificate('google.com');
        console.log('Certificate successfully retrieved:');
        console.log(JSON.stringify(cert, null, 2));
        return cert;
    } catch (error) {
        console.error('Error retrieving certificate:', error.message);
        throw error;
    }
}

// Self-executing async function
(async () => {
    try {
        await testCertificate();
    } catch (error) {
        process.exit(1);
    }
})();

export { testCertificate };