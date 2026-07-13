const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

function generateFinal() {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);
  const attrs = [{ name: 'commonName', value: 'COG_Mobile_App' }];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);

  const keyDir = 'c:/Users/sunil/COG_MOBILE/KEYS_FOR_SALESFORCE';
  if (!fs.existsSync(keyDir)) fs.mkdirSync(keyDir, { recursive: true });

  fs.writeFileSync(path.join(keyDir, 'church_of_god_sf.key'), forge.pki.privateKeyToPem(keys.privateKey));
  fs.writeFileSync(path.join(keyDir, 'church_of_god_sf.crt'), forge.pki.certificateToPem(cert));
  console.log('✅ Created: ' + path.join(keyDir, 'church_of_god_sf.crt'));
}
generateFinal();
