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
    console.log('Authenticating...');
    const { accessToken, instanceUrl } = await getAccessToken();
    console.log('Authenticated. Instance URL:', instanceUrl);

    console.log('Fetching sobjects list...');
    const res = await axios.get(`${instanceUrl}/services/data/v60.0/sobjects`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    const sobjects = res.data.sobjects;
    console.log(`Total sobjects in org: ${sobjects.length}`);
    
    const customSobjects = sobjects.filter(s => s.custom === true);
    console.log(`Custom sobjects in org: ${customSobjects.length}`);
    console.log('Custom SObjects details:');
    customSobjects.forEach(s => {
      console.log(`- ${s.name} (${s.label})`);
    });

    // Also search for anything related to about or contact or church
    const relevant = sobjects.filter(s => {
      const name = s.name.toLowerCase();
      return name.includes('about') || name.includes('church') || name.includes('info') || name.includes('contact');
    });
    console.log('\nRelevant (About, Contact, Church, Info) SObjects:');
    relevant.forEach(s => {
      console.log(`- ${s.name} (${s.label}) - Custom: ${s.custom}`);
    });

  } catch (err) {
    console.error('Error running script:', err.response?.data || err.message);
  }
}

run();
