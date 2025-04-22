import tls from 'tls';

export function getSSLCertificate(domain, port = 443) {
  return new Promise((resolve, reject) => {
    const timeout = 10000; // 10 second timeout
    const socket = tls.connect(port, domain, { servername: domain });
    let timeoutId;

    // Set connection timeout
    timeoutId = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Connection timeout for ${domain}`));
    }, timeout);

    socket.once('secureConnect', () => {
      clearTimeout(timeoutId);
      const cert = socket.getPeerCertificate(true);
      
      if (cert) {
        const certInfo = {
          subject: cert.subject,
          issuer: cert.issuer,
          validFrom: cert.valid_from,
          validTo: cert.valid_to,
          fingerprint: cert.fingerprint,
          serialNumber: cert.serialNumber
        };
        socket.end();
        resolve(certInfo);
      } else {
        socket.end();
        reject(new Error(`No certificate retrieved from ${domain}`));
      }
    });

    socket.on('error', (err) => {
      clearTimeout(timeoutId);
      socket.destroy();
      reject(err);
    });
  });
}