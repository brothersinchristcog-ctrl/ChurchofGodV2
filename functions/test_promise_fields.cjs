const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const consumerKey = process.env.SF_CONSUMER_KEY;
const username = process.env.SF_USERNAME;
const loginUrl = process.env.SF_LOGIN_URL;
const privateKey = (process.env.SF_PRIVATE_KEY || '').replace(/\\n/g, '\n');

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: consumerKey,
    sub: username,
    aud: loginUrl,
    exp: now + 300
  };
  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  const params = new URLSearchParams();
  params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.append('assertion', token);

  const response = await axios.post(`${loginUrl}/services/oauth2/token`, params.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });
  return {
    accessToken: response.data.access_token,
    instanceUrl: response.data.instance_url
  };
}

async function run() {
  try {
    const { accessToken, instanceUrl } = await getAccessToken();
    console.log('Fetching fields for Daily_Promises__c...');
    const res = await axios.get(`${instanceUrl}/services/data/v60.0/sobjects/Daily_Promises__c/describe`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    console.log('Fields in Daily_Promises__c:');
    res.data.fields.forEach(f => {
      console.log(`- ${f.name} (${f.label}) [Type: ${f.type}]`);
    });
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

run();
