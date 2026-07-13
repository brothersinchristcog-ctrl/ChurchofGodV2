const https = require('https');
const fs = require('fs');
const SalesforceService = require('./src/services/SalesforceService').default;

async function scan() {
  try {
    console.log('Fetching Access Token...');
    const token = await SalesforceService.getAccessToken();
    console.log('Token obtained.');
    
    const instanceUrl = SalesforceService.instanceUrl;
    const url = `${instanceUrl}/services/data/v60.0/sobjects/Contact/describe`;
    
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const data = await resp.json();
    // Filter for fields that contain 'Bapt' or 'Mart' or 'Status' or 'Gender'
    const fields = data.fields
      .map(f => ({ name: f.name, label: f.label, type: f.type }))
      .filter(f => f.name.includes('__c'));
    
    fs.writeFileSync('contact_fields.json', JSON.stringify(fields, null, 2));
    console.log('SUCCESS: Custom fields saved to contact_fields.json');
    console.log('FIELDS:', JSON.stringify(fields, null, 2));
  } catch (e) {
    console.error('ERROR during scan:', e);
  }
}

scan();
