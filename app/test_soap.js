const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config({ path: './.env' });

async function testSoapLogin() {
  const username = process.env.EXPO_PUBLIC_SALESFORCE_USERNAME;
  const password = process.env.EXPO_PUBLIC_SALESFORCE_PASSWORD; // Contains password+token
  const loginUrl = 'https://test.salesforce.com/services/Soap/u/58.0';

  const xmlBody = `<?xml version="1.0" encoding="utf-8" ?>
  <env:Envelope xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:env="http://schemas.xmlsoap.org/soap/envelope/">
    <env:Body>
      <n1:login xmlns:n1="urn:partner.soap.sforce.com">
        <n1:username>${username}</n1:username>
        <n1:password>${password}</n1:password>
      </n1:login>
    </env:Body>
  </env:Envelope>`;

  console.log(`Testing SOAP Login for ${username}...`);

  try {
    const response = await axios.post(loginUrl, xmlBody, {
      headers: {
        'Content-Type': 'text/xml',
        'SOAPAction': 'login'
      }
    });

    if (response.data.includes('sessionId')) {
      console.log('✅ SOAP LOGIN SUCCESSFUL! Credentials are 100% correct.');
      // Extract sessionId for proof
      const sessionIdMatch = response.data.match(/<sessionId>(.*?)<\/sessionId>/);
      if (sessionIdMatch) {
         console.log('Session ID obtained!');
      }
    } else {
      console.log('⚠️ Unexpected response:', response.data);
    }
  } catch (error) {
    console.log('❌ SOAP LOGIN FAILED!');
    if (error.response && error.response.data) {
      const faultstringMatch = error.response.data.match(/<faultstring>(.*?)<\/faultstring>/);
      console.log('Error Reason:', faultstringMatch ? faultstringMatch[1] : error.response.data);
    } else {
      console.log(error.message);
    }
  }
}

testSoapLogin();
