import SalesforceService from './src/services/SalesforceService';

async function fetchMetadata() {
  try {
    const meta = await SalesforceService.getEventMetadata();
    console.log(JSON.stringify(meta, null, 2));
  } catch(e) {
    console.error(e);
  }
}
fetchMetadata();
