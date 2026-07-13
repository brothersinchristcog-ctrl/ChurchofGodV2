import SalesforceService from './src/services/SalesforceService';

async function run() {
  try {
    const soql = `SELECT Id, Banner_Image_URL__c, Verse_Reference_En__c, Verse_Reference_Te__c FROM Daily_Promises__c LIMIT 1`;
    console.log('Running query...');
    const result = await SalesforceService.query(soql);
    console.log('Query successful:', result);
  } catch (err: any) {
    console.error('Query failed:', err.message);
  }
}

run();
