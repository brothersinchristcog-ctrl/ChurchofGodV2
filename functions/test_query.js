import { SalesforceBackend } from './src/services/SalesforceBackend.js';
import dotenv from 'dotenv';
dotenv.config();
const sfBackend = new SalesforceBackend({
    consumerKey: process.env.SF_CONSUMER_KEY || '',
    username: process.env.SF_USERNAME || '',
    loginUrl: process.env.SF_LOGIN_URL || 'https://test.salesforce.com',
    privateKey: (process.env.SF_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
});
async function run() {
    try {
        const rawDigits = '9392723536';
        const tenDigit = rawDigits.slice(-10);
        const fourDigit = rawDigits.slice(-4);
        const soql = `SELECT Id, AccountId, FirstName, LastName, Phone, MobilePhone FROM Contact WHERE Phone LIKE '%${fourDigit}%' OR MobilePhone LIKE '%${fourDigit}%' LIMIT 50`;
        console.log("Running SOQL:", soql);
        const result = await sfBackend.query(soql);
        console.log("Total matched records:", result.totalSize);
        console.dir(result.records, { depth: null });
        // Also just query by name to see if the user exists at all
        const nameSoql = `SELECT Id, Name, Phone, MobilePhone FROM Contact WHERE Name LIKE '%Sunil%' LIMIT 5`;
        const nameResult = await sfBackend.query(nameSoql);
        console.log("Name matches:", nameResult.records);
    }
    catch (e) {
        console.error("Error:", e);
    }
}
run();
//# sourceMappingURL=test_query.js.map