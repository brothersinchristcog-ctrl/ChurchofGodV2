const axios = require('axios');
const fs = require('fs');

const token = 'EAGByWC0umyIBRweWAixAY9akXgjSExembM21eA3ZBcYvPJxoV99qiNfsgOx4IPyd7BS1eUZB943tx1zDW5kHtD2uMfOGLWlLiywHSXZCGLcW6sUc9TB3YZBXJwY6vdfjdk2ZC3VhHC67fKsGRmei0ZByoLNcP6Xx9HtaNt7EOWN5jfQBYPqYsi06y2oR0pyAZDZD';
const phoneId = '1180903728445391';
const to = '919398501975';

async function testTemplate(components, name) {
  try {
    const url = `https://graph.facebook.com/v19.0/${phoneId}/messages`;
    const payload = {
      messaging_product: 'whatsapp',
      to: to,
      type: 'template',
      template: {
        name: 'church_greeting_card',
        language: { code: 'en' },
        components: components
      }
    };
    
    console.log(`Testing: ${name}`);
    const res = await axios.post(url, payload, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`SUCCESS: ${name}`, res.data);
    return true;
  } catch (err) {
    console.log(`FAILED: ${name} -> ${err.response?.data?.error?.message}`);
    return false;
  }
}

async function run() {
  // Test 1: Image Header + 0 Body
  await testTemplate([
    {
      type: 'header',
      parameters: [{ type: 'image', image: { link: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg' } }]
    }
  ], 'Image Header Only');
  
  // Test 2: 0 Header + 0 Body
  await testTemplate([], 'No Parameters');
  
  // Test 3: Image Header + 1 Body
  await testTemplate([
    {
      type: 'header',
      parameters: [{ type: 'image', image: { link: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg' } }]
    },
    {
      type: 'body',
      parameters: [{ type: 'text', text: 'Test' }]
    }
  ], 'Image Header + 1 Body Param');

  // Test 4: Image Header + 2 Body
  await testTemplate([
    {
      type: 'header',
      parameters: [{ type: 'image', image: { link: 'https://upload.wikimedia.org/wikipedia/commons/a/a7/React-icon.svg' } }]
    },
    {
      type: 'body',
      parameters: [{ type: 'text', text: 'Test1' }, { type: 'text', text: 'Test2' }]
    }
  ], 'Image Header + 2 Body Params');
  
  // Test 5: 0 Header + 1 Body
  await testTemplate([
    {
      type: 'body',
      parameters: [{ type: 'text', text: 'Test' }]
    }
  ], '0 Header + 1 Body Param');
}

run();
