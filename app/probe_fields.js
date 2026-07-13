
import SalesforceService from './app/src/services/SalesforceService';

async function probeFields() {
  try {
    const token = await SalesforceService.getAccessToken();
    const instanceUrl = SalesforceService.instanceUrl;
    const resp = await fetch(`${instanceUrl}/services/data/v60.0/sobjects/Case/describe`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await resp.json();
    
    console.log('--- Field Search Results ---');
    data.fields.forEach(f => {
      if (f.label.toLowerCase().includes('prayer') || f.label.toLowerCase().includes('category')) {
        console.log(`Label: "${f.label}" | API Name: "${f.name}" | Type: ${f.type}`);
      }
    });
  } catch (err) {
    console.error('Probe failed:', err);
  }
}

probeFields();
