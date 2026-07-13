const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

/**
 * Generates a valid X.509 self-signed certificate and RSA private key.
 */
function generateX509() {
  console.log('Generating 2048-bit RSA key pair...');
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: 'commonName', value: 'COG_Mobile_App' },
    { name: 'countryName', value: 'IN' },
    { shortName: 'ST', value: 'Andhra Pradesh' },
    { name: 'localityName', value: 'Tirupati' },
    { name: 'organizationName', value: 'Church of God' },
    { shortName: 'OU', value: 'Mobile' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  
  // Self-sign the certificate
  cert.sign(keys.privateKey);

  // Convert to PEM
  const pemPrivate = forge.pki.privateKeyToPem(keys.privateKey);
  const pemCert = forge.pki.certificateToPem(cert);

  const keyDir = path.join(process.cwd(), 'salesforce_keys');
  if (!fs.existsSync(keyDir)) fs.mkdirSync(keyDir);

  fs.writeFileSync(path.join(keyDir, 'server.key'), pemPrivate);
  fs.writeFileSync(path.join(keyDir, 'server.crt'), pemCert);

  console.log('✅ SUCCESS: Generated valid X.509 Certificate and Private Key.');
  console.log('Certificate Location: ' + path.join(keyDir, 'server.crt'));
}

generateX509();
