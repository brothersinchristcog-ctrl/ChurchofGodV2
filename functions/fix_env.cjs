const fs = require('fs');
const lines = fs.readFileSync('.env', 'utf8').split('\n');
const clean = lines.filter(l => !l.startsWith('SF_'));
const key = fs.readFileSync('salesforce_keys/server.key', 'utf8');
const formattedKey = key.replace(/\r?\n/g, '\\n');
fs.writeFileSync('.env', clean.join('\n') + '\nSF_CONSUMER_KEY=3MVG9NnK0U_HimV4U3h5rjT7KIzr.aU_n7mkouHvBuMnOOG3pGy4FbC2FGUXAKSYVV8FtJwXXoGElgpqV7c45\nSF_USERNAME=sakibandasunilbabu@bic.com\nSF_LOGIN_URL=https://kristhunandusahodarulusahavasam.my.salesforce.com\nSF_PRIVATE_KEY="' + formattedKey + '"\n');
console.log('Re-wrote .env with proper formatting');
