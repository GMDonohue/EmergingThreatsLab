import fetch from 'node-fetch';

async function getCertificate(url) {

  try {
    const response = await fetch(`https://${url}`, { 
      method: 'HEAD',
      agent: new (require('https').Agent)({ 
        rejectUnauthorized: false,
        timeout: 5000 
      })
    });

    const cert = response.socket.getPeerCertificate();
    return {
      issuer: cert.issuer,
      validFrom: cert.valid_from,
      validTo: cert.valid_to,
      subject: cert.subject,
      serialNumber: cert.serialNumber
    };
  } catch (error) {
    console.error(`Certificate fetch failed for ${url}:`, error);
    return null;
  }
}

// Add to whoisData
for (const url of urls) {
  const whoisData = await getWhoisData(url);
  const sslCert = await getCertificate(new URL(url).hostname);

  whoisResults.push({
    ...parseWhoisData(whoisData.whoisData, whoisData.ips, urls, text),
    sslCertificate: sslCert
  });
}