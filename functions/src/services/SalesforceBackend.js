import jwt from 'jsonwebtoken';
import axios from 'axios';
export class SalesforceBackend {
    config;
    accessToken = null;
    instanceUrl = null;
    tokenExpiry = 0;
    constructor(config) {
        this.config = config;
        // Normalize the login URL (strip trailing slash)
        this.config.loginUrl = config.loginUrl.replace(/\/$/, '');
    }
    /**
     * Generates a signed JWT and exchanges it for a Salesforce Access Token.
     * Standard RS256 algorithm used for security.
     */
    async getAccessToken() {
        const now = Math.floor(Date.now() / 1000);
        // Check if current token is still valid (with 30s buffer)
        if (this.accessToken && now < this.tokenExpiry - 30) {
            return this.accessToken;
        }
        console.log(`🔐 Salesforce: Initiating JWT Bearer Flow for ${this.config.username}...`);
        const payload = {
            iss: this.config.consumerKey,
            sub: this.config.username,
            aud: this.config.loginUrl,
            exp: now + 300 // 5 minutes expiration
        };
        // Sign the JWT with the Private Key (RS256)
        const token = jwt.sign(payload, this.config.privateKey, { algorithm: 'RS256' });
        try {
            const params = new URLSearchParams();
            params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
            params.append('assertion', token);
            const response = await axios.post(`${this.config.loginUrl}/services/oauth2/token`, params.toString(), {
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
            });
            this.accessToken = response.data.access_token;
            this.instanceUrl = response.data.instance_url;
            this.tokenExpiry = now + 300;
            console.log('✅ Salesforce: Token Exchange Successful');
            return this.accessToken;
        }
        catch (error) {
            console.error('❌ Salesforce Auth Error:', error.response?.data || error.message);
            throw new Error(`Salesforce Authentication Failed: ${JSON.stringify(error.response?.data || error.message)}`);
        }
    }
    /**
     * Generic SOQL Query execution via REST API
     */
    async query(soql) {
        const token = await this.getAccessToken();
        const response = await axios.get(`${this.instanceUrl}/services/data/v60.0/query/?q=${encodeURIComponent(soql)}`, { headers: { Authorization: `Bearer ${token}` } });
        return response.data;
    }
    /**
     * Fetches the Daily Promise
     */
    async getDailyPromise() {
        const today = new Date().toISOString().split('T')[0];
        const soql = `SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Number__c
                  FROM Daily_Promises__c
                  ORDER BY Date__c DESC LIMIT 1`;
        const result = await this.query(soql);
        return result.records[0] || null;
    }
    /**
     * Fetches Upcoming Events
     */
    async getUpcomingEvents(limit = 5) {
        const today = new Date().toISOString().split('.')[0] + 'Z'; // Format: YYYY-MM-DDTHH:MM:SSZ
        const soql = `SELECT Id, Name, Date__c, Day__c, Time__c, Location__c, Description__c
                  FROM Schedule_Event__c
                  WHERE Date__c >= ${today}
                  ORDER BY Date__c ASC LIMIT ${limit}`;
        const result = await this.query(soql);
        return result.records;
    }
    async checkContact(phone) {
        const rawDigits = phone.replace(/\D/g, '');
        const tenDigit = rawDigits.slice(-10);
        const fourDigit = rawDigits.slice(-4);
        const soql = `SELECT Id, AccountId, FirstName, LastName, Phone, MobilePhone, Email, User_Type__c, CreatedDate, MailingCity, MailingState, MailingStreet 
                  FROM Contact WHERE 
                  Phone LIKE '%${fourDigit}%' OR 
                  MobilePhone LIKE '%${fourDigit}%' 
                  LIMIT 50`;
        const result = await this.query(soql);
        if (result.totalSize > 0) {
            // Filter in JS to bypass formatting
            const exactMatch = result.records.find((rec) => {
                const p1 = (rec.Phone || '').replace(/\D/g, '');
                const p2 = (rec.MobilePhone || '').replace(/\D/g, '');
                return p1.endsWith(tenDigit) || p2.endsWith(tenDigit);
            });
            if (exactMatch) {
                return {
                    exists: true,
                    member: {
                        id: exactMatch.Id,
                        accountId: exactMatch.AccountId,
                        name: `${exactMatch.FirstName || ''} ${exactMatch.LastName || ''}`.trim(),
                        firstName: exactMatch.FirstName,
                        lastName: exactMatch.LastName,
                        email: exactMatch.Email,
                        phone: exactMatch.Phone || exactMatch.MobilePhone,
                        userType: exactMatch.User_Type__c || 'Member',
                        mailingCity: exactMatch.MailingCity,
                        mailingState: exactMatch.MailingState,
                        mailingStreet: exactMatch.MailingStreet,
                        joinDate: exactMatch.CreatedDate
                    }
                };
            }
        }
        return { exists: false };
    }
    /**
     * Fetches today's birthdays from Salesforce
     */
    async getTodayBirthdays() {
        try {
            const today = new Date();
            const month = today.getMonth() + 1; // JS month is 0-indexed
            const day = today.getDate();
            const soql = `SELECT Id, Name, Birthdate, Phone, Email FROM Contact WHERE CALENDAR_MONTH(Birthdate) = ${month} AND CALENDAR_DAY(Birthdate) = ${day} LIMIT 100`;
            const result = await this.query(soql);
            return result.records.map((rec) => ({
                id: rec.Id,
                name: rec.Name,
                birthdate: rec.Birthdate,
                phone: rec.Phone,
                email: rec.Email
            }));
        }
        catch (error) {
            console.error('Error fetching today birthdays in backend:', error);
            return [];
        }
    }
    /**
     * Fetches today's wedding anniversaries from Salesforce
     */
    async getTodayAnniversaries() {
        try {
            const soql = `SELECT Id, Name, Gender__c, AccountId, Anniversary_Date__c FROM Contact WHERE Anniversary_Date__c != null`;
            const result = await this.query(soql).catch(() => ({ records: [] }));
            const today = new Date();
            const todayMonth = today.getMonth() + 1; // 1-12
            const todayDay = today.getDate(); // 1-31
            // Group matching contacts by AccountId
            const accountGroups = {};
            for (const rec of result.records) {
                if (!rec.Anniversary_Date__c)
                    continue;
                // Parse date (YYYY-MM-DD)
                const dateParts = rec.Anniversary_Date__c.split('-');
                if (dateParts.length < 3)
                    continue;
                const annMonth = parseInt(dateParts[1], 10);
                const annDay = parseInt(dateParts[2], 10);
                const annYear = parseInt(dateParts[0], 10);
                if (annMonth === todayMonth && annDay === todayDay) {
                    const accId = rec.AccountId || rec.Id;
                    if (!accountGroups[accId]) {
                        accountGroups[accId] = [];
                    }
                    accountGroups[accId].push({
                        name: rec.Name,
                        gender: rec.Gender__c,
                        year: annYear
                    });
                }
            }
            const anniversaries = [];
            let index = 1;
            for (const accId in accountGroups) {
                const members = accountGroups[accId];
                if (!members || members.length === 0)
                    continue;
                let husband = '';
                let wife = '';
                let years = 12;
                const male = members.find(m => m.gender === 'Male');
                const female = members.find(m => m.gender === 'Female');
                if (male && female) {
                    husband = male.name;
                    wife = female.name;
                    years = new Date().getFullYear() - male.year;
                }
                else if (members.length >= 2) {
                    const firstIsFemale = members[0].name.toLowerCase().includes('sister') ||
                        members[0].name.toLowerCase().includes('mrs') ||
                        members[0].name.toLowerCase().includes('devi') ||
                        members[0].name.toLowerCase().includes('kumari');
                    if (firstIsFemale) {
                        wife = members[0].name;
                        husband = members[1].name;
                    }
                    else {
                        husband = members[0].name;
                        wife = members[1].name;
                    }
                    years = new Date().getFullYear() - members[0].year;
                }
                else {
                    const single = members[0];
                    if (single.gender === 'Male') {
                        husband = single.name;
                        wife = 'Spouse';
                    }
                    else {
                        husband = 'Spouse';
                        wife = single.name;
                    }
                    years = new Date().getFullYear() - single.year;
                }
                if (isNaN(years) || years <= 0) {
                    years = 12;
                }
                anniversaries.push({
                    id: `anniv-${index++}`,
                    husband,
                    wife,
                    years
                });
            }
            return anniversaries;
        }
        catch (error) {
            console.error('Error fetching today anniversaries in backend:', error);
            return [];
        }
    }
}
//# sourceMappingURL=SalesforceBackend.js.map