const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function testLoginURL(loginUrl) {
  console.log(`\nTesting URL: ${loginUrl}`);
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'password');
    params.append('client_id', process.env.EXPO_PUBLIC_SALESFORCE_CONSUMER_KEY);
    params.append('client_secret', process.env.EXPO_PUBLIC_SALESFORCE_CONSUMER_SECRET);
    params.append('username', process.env.EXPO_PUBLIC_SALESFORCE_USERNAME);
    params.append('password', process.env.EXPO_PUBLIC_SALESFORCE_PASSWORD);
    
    const response = await axios.post(`${loginUrl}/services/oauth2/token`, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    
    console.log('✅ SUCCESS! Access Token obtained.');
    console.log('Instance URL:', response.data.instance_url);
    return true;
  } catch (error) {
    if (error.response) {
      console.log('❌ FAILED with Status:', error.response.status);
      console.log('Error Data:', error.response.data);
    } else {
      console.log('❌ FAILED: ', error.message);
    }
    return false;
  }
}

async function runTests() {
  const loginUrl = process.env.EXPO_PUBLIC_SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';
  await testLoginURL(loginUrl);
}

runTests();
