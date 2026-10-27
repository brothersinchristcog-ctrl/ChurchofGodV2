const fs = require('fs');
const appService = fs.readFileSync('../app/src/services/SalesforceService.ts', 'utf8');
const startIndex = appService.indexOf('-----BEGIN PRIVATE KEY-----');
const endIndex = appService.indexOf('-----END PRIVATE KEY-----') + '-----END PRIVATE KEY-----'.length;
if (startIndex === -1 || endIndex === -1) { console.error('Key not found'); process.exit(1); }
const key = appService.substring(startIndex, endIndex);
const envPath = '.env';
let env = fs.readFileSync(envPath, 'utf8');
env = env.replace(/SF_PRIVATE_KEY=".*?"/s, 'SF_PRIVATE_KEY="' + key.replace(/\r?\n/g, '\\n') + '"');
fs.writeFileSync(envPath, env);
console.log('Updated functions/.env with the correct private key from SalesforceService.ts');
