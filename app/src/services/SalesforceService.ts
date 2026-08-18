import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
// @ts-ignore
import forge from 'node-forge';

const CACHE_KEYS = {
  PROMISE: 'cog_promise_cache',
  SERMONS: 'cog_sermons_cache',
  EVENTS: 'cog_events_cache',
  NOTIFICATIONS: 'cog_notifications_cache',
  USER_CONTACT: 'cog_user_contact'
};

export interface DailyPromise {
  id?: string;
  verse: string;
  verseTelugu?: string;
  date: string;
  devotionalNote?: string;
  pastor?: string;
  status?: string;
  youtubeId?: string;
  verseReference?: string;
  verseReferenceEn?: string;
  verseReferenceTe?: string;
  videoTitle?: string;
  duration?: string;
  imageUrl?: string;
}

export interface SalesforceMember {
  id: string;
  accountId?: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  userType?: string;
  mailingCity?: string;
  mailingState?: string;
  mailingStreet?: string;
  joinDate?: string;
  mobileAppId?: string;
  description?: string;
  birthdate?: string;
  anniversaryDate?: string;
  baptismDate?: string;
}

export interface SalesforceVideo {
  id: string;
  title: string;
  youtubeId: string;
  date: string;
  duration?: string;
  pastor?: string;
  pastorName?: string;
}

export interface WorshipSong {
  id: string;
  title: string;
  titleTe?: string;
  artist: string;
  key: string;
  lyrics?: string;
  category?: string;
  youtubeId?: string;
  isThemeSong?: boolean;
}

export interface ScheduleEvent {
  id: string;
  name?: string;
  title: string;
  titleTelugu?: string;
  date: string;
  time?: string;
  startTime: string;
  endTime: string;
  location: string;
  address?: string;
  description: string;
  descEn?: string;
  category: string;
  image: string;
  bannerUrl?: string;
  youtubeId?: string;
}

export interface Sermon {
  id: string;
  title: string;
  titleTelugu?: string;
  youtubeId: string;
  date: string;
  pastor: string;
  duration: string;
  description?: string;
  scripture?: string;
  viewCount?: number;
  status?: string;
  series?: string;
  audioUrl?: string;
}

class SalesforceService {
  private clientId = process.env.EXPO_PUBLIC_SALESFORCE_CONSUMER_KEY || '3MVG9NnK0U_HimV4U3h5rjT7KIzr.aU_n7mkouHvBuMnOOG3pGy4FbC2FGUXAKSYVV8FtJwXXoGElgpqV7c45';
  private username = process.env.EXPO_PUBLIC_SALESFORCE_USERNAME || 'sakibandasunilbabu@bic.com';
  private loginUrl = process.env.EXPO_PUBLIC_SALESFORCE_LOGIN_URL || 'https://kristhunandusahodarulusahavasam.my.salesforce.com';
  private instanceUrl = process.env.EXPO_PUBLIC_SALESFORCE_LOGIN_URL || 'https://kristhunandusahodarulusahavasam.my.salesforce.com';

  private cachedToken: { token: string; expiresAt: number } | null = null;

  private privateKeyPem = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCsg48JgGqGZGfd
vlZob6Gb1saVVwSw9+gyjfDaK/s0wrCS2p1J6yQiUcxMv1wmOPIG8nj0N+N3zcOR
HUMODubkBRl5WwPb2WnK9DC5YyETwPdc5AmT3rG/URzCSUZl7snMeH0x/2gTRUB8
TaAlCoquvEVgf2Q+HWC3ntxBxN6QH9KdK1F+SAz5jVyWLc/78L0mq3d8Ees3f7z4
sBO+amaZDE17OpcO2I8cWRTlwmYlYfr9C08a7Waxjjn1xtCa6zFRYVzL7FrVxozr
k1VV1Udj2CsuTgOck1IPYTue1/n8xtqBT/QNFO1Vmci3d6v7D9pDzwiCOoeLDzsU
B5ImhD3RAgMBAAECggEAJAxXks41NED93T2dM7SD6hsOov0se0hKSmoTlptTIjq+
h+lLrbsHcW5zSORBvrDujhoTwUB+dTXXdFbPgLwHbkVMhenJXCLJswGkvtBihIyx
g8UY5T/HF6m83zJNlhY4L9RLoOt0VXaGm5Li8GqMAShRPPFRwpMD90qoTsvzD91m
JLNofovP3GoBeeSnhBeLFe+ZSdGgNE9mnKWOHPh5jqd9O1XsRNpFp8M9WlkiTarG
WviAd63maQUPqXU7K5k21NNk/s69Vo7eH/lvpcOLxAdxS8D1yibvD4dcGTN+K8iW
Ust/grHhcDFHNX/wv/Na30aXX/BwzSBcEWnuofNoMwKBgQDpowBzwi/JBXJvF12O
FdKRw8U5Qxus9jN2f9jv4mrrXipiv3DL3RPBeE5fAAv3imUbfAA7NR9QMhbqWRYg
vd6+987e4fAqSWKFpsxj1xNV8ERsxY+SXhm9bb+82bBxAy3xoO5heIsrjCvaSVT8
PKFKILyi7Q3AJOGrc9+8ucAqmwKBgQC9BtAO4/jQrM0BXlvhwyQVK1kJVvnjVJZ7
KyMdkYe9H2bn1HhmUYKBk2NE/HG/sVpvLcQLBi9Um+ixn1i/7KtYCbCqrnXOxm49
tR2KEaE/WLEYl8p/usFg/auiVWlZMFsA8l4lW+rIp8beQUljEu88Ebv0YgEpguz/
uepZddAaAwKBgEQQ1e/jkfJZoOYWg44Cc4893rZ5A5YXQBT02CnC5+1cSLLuHRl3
der2dracl9/tNNmV/adCKbY+cYiinZy6VCuEnIM4hbR8HrTbTE6F+T8fOYAK6nH0
8kDKuYJ2VT4HdBoiDXDeIoV0V85HcPfvXfnvoaVBtLDWzdwabQNZhk+jAoGAZSeD
KaTHnuwKHORg6RSjd4yl7gCUYxn+GVWBSi555DQsvn0OHTsbSroT0nQBbyK6kWp9
UaTyqSVxxbPPK428N7WfzAbmVkwL7IvCjgNXNe4Bf3ajT+0h1QSK16k7YhYlbQFG
blmc79oQ6xkm65TTX2LiISpdEtjUeRkFlvAb9/8CgYEAl0kYCY18F36/eUeuGQwx
WsgAVnEB9vQtJHUDhjBPPyTxXgvnTdnO6oDAAH6j5iAbMlVTvjM4eRgVEG60xlTs
tB0Mj+4RZO3hhi+3CxIbTmyzDEvKIV4gpjFu8Ug2JMpIDheHnZ1eyq7Byp09m1N2
spfkUchVp71l4aWpCW50lro=
-----END PRIVATE KEY-----`;

  private async getAccessToken(): Promise<string> {
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    try {
      const header = { alg: 'RS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const claimSet = { iss: this.clientId, sub: this.username, aud: this.loginUrl, exp: now + 300 };
      const base64UrlEncode = (str: string) => Buffer.from(str).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const encodedHeader = base64UrlEncode(JSON.stringify(header));
      const encodedPayload = base64UrlEncode(JSON.stringify(claimSet));
      const signatureInput = `${encodedHeader}.${encodedPayload}`;
      const md = forge.md.sha256.create().update(signatureInput, 'utf8');
      const signature = forge.pki.privateKeyFromPem(this.privateKeyPem).sign(md);
      const encodedSignature = Buffer.from(signature, 'binary').toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
      const assertion = `${signatureInput}.${encodedSignature}`;
      const response = await fetch(`${this.loginUrl}/services/oauth2/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }).toString()
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description || 'JWT Auth Failed');
      if (data.instance_url) this.instanceUrl = data.instance_url;
      
      // Cache token for 4m 50s (token is valid for 5m)
      this.cachedToken = {
        token: data.access_token,
        expiresAt: Date.now() + (290 * 1000)
      };

      return data.access_token;
    } catch (error) { throw error; }
  }

  async query(soql: string, silent = false): Promise<any> {
    try {
      console.log(`🔗 [SalesforceService] Executing Query: ${soql}`);
      const token = await this.getAccessToken();
      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/query/?q=${encodeURIComponent(soql)}&_t=${Date.now()}`, { headers: { Authorization: `Bearer ${token}`, 'Cache-Control': 'no-cache' } });
      const data = await resp.json();
      if (!resp.ok) {
        if (!silent) console.error('❌ [SalesforceService] Query Error:', data[0]?.message);
        throw new Error(data[0]?.message || 'Salesforce Query Error');
      }
      console.log(`✅ [SalesforceService] Query Success. Found ${data.totalSize} records.`);
      return data;
    } catch (error) {
      if (!silent) console.error('❌ [SalesforceService] Query Failed:', error);
      throw error;
    }
  }

  public extractYoutubeId(idOrUrl: string): string {
    if (!idOrUrl) return '';
    if (idOrUrl.includes('youtube.com') || idOrUrl.includes('youtu.be')) {
      const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|shorts\/|live\/)([^#\&\?]*).*/;
      const match = idOrUrl.match(regExp);
      return (match && match[2].length === 11) ? match[2] : idOrUrl;
    }
    return idOrUrl;
  }

  // --- 👤 Member Logic ---

  async getAdminMembers(): Promise<any[]> {
    try {
      const soql = `SELECT Id, AccountId, Name, FirstName, LastName, Email, Phone, MobilePhone, User_Type__c, CreatedDate, LastModifiedDate, Last_App_Opened__c, Account.Name, Account.Active__c, Account.Membership_Status__c, Mobile_App_ID__c, MailingCity, Birthdate, Anniversary_Date__c, Date_of_Baptism__c FROM Contact ORDER BY Name ASC LIMIT 2000`;
      const result = await this.query(soql, true);
      return result.records || [];
    } catch (error) {
      console.error('❌ [SalesforceService] getAdminMembers Error:', error);
      return [];
    }
  }

  async getApprovers(): Promise<SalesforceMember[]> {
    try {
      const soql = `SELECT Id, Name, Phone, MobilePhone, User_Type__c FROM Contact WHERE User_Type__c IN ('Admin', 'Pastor', 'System Administrator') LIMIT 50`;
      const result = await this.query(soql, true);
      return result.records.map((rec: any) => ({
        id: rec.Id,
        name: rec.Name,
        phone: rec.MobilePhone || rec.Phone || null,
        userType: rec.User_Type__c
      }));
    } catch (error) {
      console.error('❌ [SalesforceService] getApprovers Error:', error);
      return [];
    }
  }

  async getContactUserTypePicklistValues(): Promise<{ label: string; value: string }[]> {
    try {
      const token = await this.getAccessToken();
      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Contact/describe`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        const userTypeField = data.fields?.find((f: any) => f.name === 'User_Type__c');
        if (userTypeField && userTypeField.picklistValues) {
          return userTypeField.picklistValues
            .filter((p: any) => p.active)
            .map((p: any) => ({ label: p.label, value: p.value }));
        }
      }
    } catch (e) {
      console.warn('⚠️ [SalesforceService] Failed to fetch User_Type__c describe picklist values:', e);
    }
    return [
      { label: 'Member', value: 'Member' },
      { label: 'Admin', value: 'Admin' },
      { label: 'Pastor', value: 'Pastor' },
      { label: 'Youth', value: 'Youth' },
      { label: 'Non-Member', value: 'Non-Member' }
    ];
  }

  async checkContactExists(phone: string, uid?: string): Promise<any> {
    const rawDigits = phone.replace(/\D/g, '');
    if (rawDigits.length < 10) return { exists: false };

    try {
      console.log(`🔗 [SalesforceService] Verifying membership via local query bypass...`);
      return this.legacyCheckContactExists(phone, uid);
    } catch (error) {
      console.warn('⚠️ [SalesforceService] Fallback check failed:', error);
      return { exists: false };
    }
  }

  /**
   * The original direct Salesforce query fallback
   */
  async legacyCheckContactExists(phone: string, uid?: string): Promise<any> {
    const rawDigits = phone.replace(/\D/g, '');
    const tenDigit = rawDigits.slice(-10);
    const fourDigit = rawDigits.slice(-4);
    
    try {
      // Query using the last 4 digits to bypass Salesforce formatting like (998) 877-6655 or +91 998 877 6655
      const soql = `SELECT Id, AccountId, Name, FirstName, LastName, Email, Phone, MobilePhone, User_Type__c, CreatedDate, MailingCity, MailingState, MailingStreet, Description, Mobile_App_ID__c, Birthdate, Anniversary_Date__c, Date_of_Baptism__c FROM Contact WHERE (Phone LIKE '%${fourDigit}%' OR MobilePhone LIKE '%${fourDigit}%') ${uid ? `OR Mobile_App_ID__c = '${uid}'` : ''} ORDER BY CreatedDate DESC LIMIT 50`;
      const result = await this.query(soql, true);

      if (result.totalSize > 0) {
        // Find the exact match in JavaScript by stripping all formatting from Salesforce results
        const exactMatch = result.records.find((rec: any) => {
          const p1 = (rec.Phone || '').replace(/\D/g, '');
          const p2 = (rec.MobilePhone || '').replace(/\D/g, '');
          return p1.endsWith(tenDigit) || p2.endsWith(tenDigit) || (uid && rec.Mobile_App_ID__c === uid);
        });

        if (exactMatch) {
          return {
            exists: true,
            member: {
              id: exactMatch.Id,
              accountId: exactMatch.AccountId,
              name: exactMatch.Name,
              firstName: exactMatch.FirstName,
              lastName: exactMatch.LastName,
              email: exactMatch.Email,
              phone: exactMatch.Phone || exactMatch.MobilePhone,
              userType: exactMatch.User_Type__c || 'Member',
              mailingCity: exactMatch.MailingCity,
              mailingState: exactMatch.MailingState,
              mailingStreet: exactMatch.MailingStreet,
              joinDate: exactMatch.CreatedDate,
              description: exactMatch.Description,
              birthdate: exactMatch.Birthdate,
              anniversaryDate: exactMatch.Anniversary_Date__c,
              baptismDate: exactMatch.Date_of_Baptism__c
            }
          };
        }
      }
      return { exists: false };
    } catch (error) {
      return { exists: false };
    }
  }

  async updateLastAppOpened(contactId: string) {
    try {
      const token = await this.getAccessToken();
      await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Contact/${contactId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Last_App_Opened__c: new Date().toISOString() })
      });
    } catch (error) {
      console.warn('⚠️ [SalesforceService] Failed to update Last_App_Opened__c:', error);
    }
  }

  async syncMember(contactId: string, uid: string) {
    const token = await this.getAccessToken();
    await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Contact/${contactId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Mobile_App_ID__c: uid })
    });
  }

  async getRelatedContacts(accountId: string): Promise<any[]> {
    if (!accountId) return [];
    try {
      const soql = `SELECT Id, Name, FirstName, LastName, Title, Gender__c, Email, Phone, MobilePhone, User_Type__c, CreatedDate, Birthdate, Anniversary_Date__c, Date_of_Baptism__c FROM Contact WHERE AccountId = '${accountId}' ORDER BY FirstName ASC`;
      const result = await this.query(soql, true);
      return result.records || [];
    } catch (error) {
      console.error('❌ [SalesforceService] getRelatedContacts Error:', error);
      return [];
    }
  }

  async updateMemberProfile(contactId: string, details: any) {
    try {
      const token = await this.getAccessToken();
      const body: any = {};
      if (details.firstName) body.FirstName = details.firstName;
      if (details.lastName) body.LastName = details.lastName;
      if (details.email) body.Email = details.email;
      if (details.mailingCity) body.MailingCity = details.mailingCity;
      if (details.mailingStreet) body.MailingStreet = details.mailingStreet;
      if (details.description !== undefined) body.Description = details.description;

      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Contact/${contactId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err[0]?.message || 'Failed to update profile');
      }
      return true;
    } catch (error) {
      console.error('❌ [SalesforceService] updateMemberProfile Error:', error);
      throw error;
    }
  }

  async createMember(data: any) {
    let token: string;
    try {
      token = await this.getAccessToken();
    } catch (tokenErr: any) {
      console.error('❌ [SalesforceService] createMember – getAccessToken failed:', tokenErr?.message);
      throw new Error(`Authentication failed: ${tokenErr?.message || 'Could not connect to Salesforce'}`);
    }

    try {
      // 1. Create an Account with the Member's Full Name, Auto-Activate, and DUAL ADDRESS
      const accountBody = {
        Name: `${data.firstName} ${data.lastName}`,
        Phone: data.phone,
        Active__c: true,
        Membership_Status__c: 'Active',
        // Save to both Billing and Shipping to be safe
        BillingStreet: data.street,
        BillingCity: data.city,
        BillingState: data.state,
        BillingPostalCode: data.zip,
        ShippingStreet: data.street,
        ShippingCity: data.city,
        ShippingState: data.state,
        ShippingPostalCode: data.zip
      };

      const accountResp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(accountBody)
      });

      let accountData = await accountResp.json();

      // If dual save fails, try basic save
      if (!accountResp.ok) {
        const basicAccountBody = {
          Name: `${data.firstName} ${data.lastName}`,
          Phone: data.phone,
          Active__c: true
        };
        const retryResp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Account`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(basicAccountBody)
        });
        accountData = await retryResp.json();
      }

      const accountId = accountData.id;

      // 2. Create the Contact with BASIC fields
      const basicContactBody = {
        FirstName: data.firstName,
        LastName: data.lastName,
        AccountId: accountId,
        MobilePhone: data.phone,
        Email: data.email || null,
        User_Type__c: data.userType || 'Member',
        MailingCity: data.city || null,
        Mobile_App_ID__c: data.uid || null
      };

      let resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Contact`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(basicContactBody)
      });

      let result = await resp.json();
      if (!resp.ok) throw new Error(result[0]?.message || 'Basic contact creation failed');
      const contactId = result.id;

      // 3. Attempt to update all other fields INDIVIDUALLY
      const updateBlocks = [
        // GROUPED BAPTISM: Must send together for Validation Rules
        {
          Have_You_Baptized__c: data.baptized,
          Date_of_Baptism__c: data.baptismDate || null,
          Church_Of_Baptism__c: data.baptismChurch
        },

        // Personal
        { Current_Church__c: data.churchName },
        { Birthdate: data.dob || null },
        { Gender__c: data.gender },
        // Grouped Marital: Must send together to satisfy Validation Rules
        { 
          Martial_Status__c: data.maritalStatus,
          Anniversary_Date__c: data.anniversaryDate || null,
          Number_Of_Children_s__c: data.numberOfChildren ? Number(data.numberOfChildren) : 0
        },

        // Address
        { MailingStreet: data.street },
        { MailingCity: data.city },
        { MailingState: data.state },
        { MailingPostalCode: data.zip }
      ];

      const errors = [];
      for (const fieldSet of updateBlocks) {
        try {
          const patchResp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Contact/${contactId}`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(fieldSet)
          });

          if (!patchResp.ok) {
            const err = await patchResp.json();
            const fieldName = Object.keys(fieldSet)[0];
            errors.push(`${fieldName}: ${err[0]?.message || 'Unknown error'}`);
            console.warn(`⚠️ [SalesforceService] Field update failed: ${fieldName}`, err);
          }
        } catch (e: any) {
          errors.push(`System Error: ${e.message}`);
        }
      }

      return {
        success: true,
        id: contactId,
        warnings: errors.length > 0 ? errors : null
      };
    } catch (error: any) {
      console.error('❌ [SalesforceService] createMember Error:', error);
      // Return the actual error message so the UI can show it
      throw new Error(error.message || 'Salesforce creation failed');
    }
  }

  async addFamilyMember(accountId: string, memberData: any): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      
      const formatToSfDate = (dStr: string | null | undefined) => {
        if (!dStr) return null;
        const parts = dStr.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dStr;
      };

      const body = {
        FirstName: memberData.firstName,
        LastName: memberData.lastName,
        AccountId: accountId,
        Title: memberData.relation,
        Gender__c: memberData.gender,
        Birthdate: formatToSfDate(memberData.birthdate),
        Anniversary_Date__c: formatToSfDate(memberData.anniversaryDate),
        Date_of_Baptism__c: formatToSfDate(memberData.baptismDate),
        Email: memberData.email || null,
        MobilePhone: memberData.phone || null
      };

      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Contact`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err[0]?.message || 'Failed to add family member');
      }
      return true;
    } catch (error) {
      console.error('❌ [SalesforceService] addFamilyMember Error:', error);
      throw error;
    }
  }

  async updateFamilyMember(contactId: string, memberData: any): Promise<boolean> {
    try {
      const token = await this.getAccessToken();

      const formatToSfDate = (dStr: string | null | undefined) => {
        if (!dStr) return null;
        const parts = dStr.split('-');
        if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dStr;
      };

      const body = {
        FirstName: memberData.firstName,
        LastName: memberData.lastName,
        Title: memberData.relation || null,
        Gender__c: memberData.gender || null,
        Birthdate: formatToSfDate(memberData.birthdate),
        Anniversary_Date__c: formatToSfDate(memberData.anniversaryDate),
        Date_of_Baptism__c: formatToSfDate(memberData.baptismDate),
        Email: memberData.email || null,
        MobilePhone: memberData.phone || null,
        Phone: memberData.phone || null,
      };

      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Contact/${contactId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const err = await resp.json();
        throw new Error(err[0]?.message || 'Failed to update family member');
      }
      return true;
    } catch (error) {
      console.error('❌ [SalesforceService] updateFamilyMember Error:', error);
      throw error;
    }
  }

  // --- 🎥 Video & Sermon Logic ---

  async getDailyVideos(limit = 10): Promise<SalesforceVideo[]> {
    try {
      const soql = `SELECT Id, Video_Title__c, YouTube_ID__c, Published_Date__c, Duration__c, Pastor_Name__c FROM Daily_Video__c ORDER BY Published_Date__c DESC LIMIT ${limit}`;
      const result = await this.query(soql);
      return result.records.map((rec: any) => {
        return {
          id: rec.Id,
          title: rec.Video_Title__c,
          youtubeId: this.extractYoutubeId(rec.YouTube_ID__c),
          date: rec.Published_Date__c,
          duration: rec.Duration__c,
          pastor: rec.Pastor_Name__c
        };
      });
    } catch (error) {
      console.error('❌ [SalesforceService] getDailyVideos Error:', error);
      return [];
    }
  }

  async getSermons(limit = 50): Promise<any[]> {
    try {
      // High-Fidelity Query: Try all new fields first (Silent)
      let soql = `SELECT Id, Name, Title_Telugu__c, Pastor_Name__c, Sermon_Date__c, YouTube_ID__c, Status__c, Duration__c, View_Count__c, Scripture_Reference__c, Category__c FROM Sermon__c ORDER BY CreatedDate DESC LIMIT ${limit}`;
      let result;
      try {
        result = await this.query(soql, true);
      } catch (e) {
        console.warn('⚠️ [SalesforceService] New fields missing, using legacy fallback.');
        // Fallback Query: Only base fields + Category__c
        soql = `SELECT Id, Name, Title_Telugu__c, Pastor_Name__c, Sermon_Date__c, YouTube_ID__c, Status__c, Category__c FROM Sermon__c ORDER BY CreatedDate DESC LIMIT ${limit}`;
        result = await this.query(soql);
      }

      return result.records.map((rec: any) => ({
        id: rec.Id,
        title: rec.Name,
        titleTelugu: rec.Title_Telugu__c,
        pastor: rec.Pastor_Name__c,
        date: rec.Sermon_Date__c,
        youtubeId: this.extractYoutubeId(rec.YouTube_ID__c),
        status: rec.Status__c,
        duration: rec.Duration__c || 'N/A',
        viewCount: rec.View_Count__c || 0,
        scripture: rec.Scripture_Reference__c || '',
        categories: (() => {
          const cats = rec.Category__c ? rec.Category__c.split(';').filter(Boolean) : [];
          console.log(`Mapping ${rec.Name} - Raw Category__c: "${rec.Category__c}" -> Array:`, cats);
          return cats;
        })()
      }));
    } catch (error) {
      console.error('❌ [SalesforceService] getSermons Critical Failure:', error);
      return [];
    }
  }

  async getWorshipSongs(): Promise<WorshipSong[]> {
    try {
      // 1. Primary: Fetch from new, clean Worship_Song__c object
      const soql = `SELECT Id, Name, Song_Title_Telugu__c, Lyrics__c, Artist__c, Key_Signature__c, YouTube_ID__c, Category__c FROM Worship_Song__c WHERE Status__c = 'Published' ORDER BY CreatedDate DESC LIMIT 100`;
      const result = await this.query(soql, true).catch(async (err) => {
        console.warn('⚠️ Worship_Song__c custom object query failed. Falling back to Sermon__c.');
        // 2. Fail-Safe: Fall back to Sermon__c where name LIKE '%Song%'
        const fallbackSoql = `SELECT Id, Name, Title_Telugu__c, Description__c, Pastor_Name__c, Scripture_Reference__c, YouTube_ID__c, Category__c FROM Sermon__c WHERE Status__c = 'Published' AND Name LIKE '%Song%' ORDER BY CreatedDate DESC LIMIT 100`;
        const res = await this.query(fallbackSoql, true);
        return {
          records: res.records.map((r: any) => ({
            Id: r.Id,
            Name: r.Name,
            Title_Telugu__c: r.Title_Telugu__c,
            Lyrics__c: r.Description__c,
            Artist__c: r.Pastor_Name__c,
            Key_Signature__c: r.Scripture_Reference__c,
            YouTube_ID__c: r.YouTube_ID__c,
            Category__c: r.Category__c
          }))
        };
      });

      return result.records.map((rec: any) => ({
        id: rec.Id,
        title: rec.Name,
        titleTe: rec.Song_Title_Telugu__c || rec.Title_Telugu__c || '',
        lyrics: rec.Lyrics__c || '',
        artist: rec.Artist__c || 'COG Worship',
        key: rec.Key_Signature__c || 'C',
        category: rec.Category__c || 'Other',
        youtubeId: rec.YouTube_ID__c || ''
      }));
    } catch (error) { 
      console.error('❌ [SalesforceService] getWorshipSongs error:', error);
      return []; 
    }
  }

  async createWorshipSong(details: any): Promise<{ success: boolean; savedTo: string; id: string }> {
    try {
      const token = await this.getAccessToken();
      const primaryUrl = `${this.instanceUrl}/services/data/v60.0/sobjects/Worship_Song__c`;
      
      const primaryBody = {
        Name: details.titleEn,
        Song_Title_Telugu__c: details.titleTe,
        Artist__c: details.artist,
        Lyrics__c: details.lyrics,
        Key_Signature__c: details.keySignature,
        Category__c: details.category || 'Other',
        Status__c: details.status || 'Published',
        YouTube_ID__c: details.youtubeId
      };

      // 1. Try to post to primary Worship_Song__c object
      console.log('📤 Posting to primary Worship_Song__c object...');
      const resp = await fetch(primaryUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(primaryBody)
      });

      if (!resp.ok) {
        const errDetails = await resp.json().catch(() => []);
        console.warn('⚠️ primary Worship_Song__c post failed. Retrying with Sermon__c fallback...', errDetails);
        
        // 2. Fail-Safe: Fall back to Sermon__c object
        const fallbackUrl = `${this.instanceUrl}/services/data/v60.0/sobjects/Sermon__c`;
        const fallbackBody = {
          Name: `${details.titleEn} (Song)`,
          Title_Telugu__c: details.titleTe,
          Pastor_Name__c: details.artist,
          Sermon_Date__c: new Date().toISOString().split('T')[0],
          Description__c: details.lyrics,
          Scripture_Reference__c: details.keySignature,
          Status__c: details.status || 'Published',
          Duration__c: '3:00',
          YouTube_ID__c: details.youtubeId,
          Category__c: details.category || 'Other'
        };

        const fallbackResp = await fetch(fallbackUrl, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(fallbackBody)
        });

        if (!fallbackResp.ok) {
          const errData = await fallbackResp.json();
          throw new Error(errData[0]?.message || 'Salesforce fallback creation failed');
        }
        
        const fallbackData = await fallbackResp.json();
        console.log('✅ [SalesforceService] Song created in Salesforce (Sermon__c Fallback) successfully!');
        return {
          success: true,
          savedTo: 'Sermon__c (Fallback)',
          id: fallbackData.id
        };
      } else {
        const primaryData = await resp.json();
        console.log('✅ [SalesforceService] Song created in Salesforce (Worship_Song__c) successfully!');
        return {
          success: true,
          savedTo: 'Worship_Song__c (Primary)',
          id: primaryData.id
        };
      }
    } catch (error) {
      console.error('❌ [SalesforceService] createWorshipSong Error:', error);
      throw error;
    }
  }

  async updateWorshipSong(id: string, details: any): Promise<{ success: boolean }> {
    try {
      const token = await this.getAccessToken();
      const url = `${this.instanceUrl}/services/data/v60.0/sobjects/Worship_Song__c/${id}`;
      const body: any = {};
      if (details.titleEn !== undefined) body.Name = details.titleEn;
      if (details.titleTe !== undefined) body.Song_Title_Telugu__c = details.titleTe;
      if (details.artist !== undefined) body.Artist__c = details.artist;
      if (details.lyrics !== undefined) body.Lyrics__c = details.lyrics;
      if (details.keySignature !== undefined) body.Key_Signature__c = details.keySignature;
      if (details.category !== undefined) body.Category__c = details.category;
      if (details.status !== undefined) body.Status__c = details.status;
      if (details.youtubeId !== undefined) body.YouTube_ID__c = details.youtubeId;

      const resp = await fetch(url, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ([{ message: 'Unknown error' }]));
        throw new Error(errData[0]?.message || 'Song update failed');
      }
      console.log('✅ [SalesforceService] Song updated successfully!');
      return { success: true };
    } catch (error) {
      console.error('❌ [SalesforceService] updateWorshipSong Error:', error);
      throw error;
    }
  }

  async deleteWorshipSong(id: string): Promise<{ success: boolean }> {
    try {
      const token = await this.getAccessToken();
      const url = `${this.instanceUrl}/services/data/v60.0/sobjects/Worship_Song__c/${id}`;
      
      const resp = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => ([{ message: 'Unknown error' }]));
        throw new Error(errData[0]?.message || 'Song deletion failed');
      }
      
      console.log('✅ [SalesforceService] Song deleted successfully!');
      return { success: true };
    } catch (error) {
      console.error('❌ [SalesforceService] deleteWorshipSong Error:', error);
      throw error;
    }
  }

  async getTodayBirthdays(): Promise<any[]> {
    try {
      const today = new Date();
      const month = today.getMonth() + 1; // JS month is 0-indexed
      const day = today.getDate();
      const soql = `SELECT Id, Name, Birthdate, Phone, Email FROM Contact WHERE CALENDAR_MONTH(Birthdate) = ${month} AND CALENDAR_DAY(Birthdate) = ${day} LIMIT 100`;
      const result = await this.query(soql, true).catch(async () => {
        const fallback = `SELECT Id, Name, Birthdate FROM Contact LIMIT 200`;
        const res = await this.query(fallback);
        return {
          records: res.records.filter((r: any) => {
            if (!r.Birthdate) return false;
            const d = new Date(r.Birthdate);
            return (d.getMonth() + 1) === month && d.getDate() === day;
          })
        };
      });
      return result.records.map((rec: any) => ({
        id: rec.Id,
        name: rec.Name,
        birthdate: rec.Birthdate,
        phone: rec.Phone,
        email: rec.Email
      }));
    } catch (e: any) {
        console.error('Error reading contacts from cache:', e);
        return [];
    }
  }

  async getAllCelebrations(): Promise<any[]> {
    try {
      const soql = `SELECT Id, Name, Phone, MobilePhone, Email, Birthdate, Anniversary_Date__c, Date_of_Baptism__c, Gender__c, AccountId FROM Contact WHERE Birthdate != null OR Anniversary_Date__c != null OR Date_of_Baptism__c != null ORDER BY Name ASC LIMIT 2000`;
      const result = await this.query(soql, true);
      return result.records || [];
    } catch (e) {
      console.error('Error fetching celebrations:', e);
      return [];
    }
  }

  async sendPersonalGreeting(contactId: string, phone: string, title: string, message: string, type: 'birthday' | 'anniversary'): Promise<boolean> {
    try {
      const { firestore } = require('./firebaseConfig');
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
      await firestore().collection('broadcasts').add({
        title,
        content: message,
        date: dateStr,
        type,
        targetPhone: phone,
        createdAt: firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (e) {
      console.error('sendPersonalGreeting Error:', e);
      return false;
    }
  }

  async getTodayAnniversaries(): Promise<any[]> {
    try {
      const soql = `SELECT Id, Name, Gender__c, AccountId, Anniversary_Date__c FROM Contact WHERE Anniversary_Date__c != null`;
      const result = await this.query(soql).catch(() => ({ records: [] }));
      
      const today = new Date();
      const todayMonth = today.getMonth() + 1; // 1-12
      const todayDay = today.getDate(); // 1-31

      // Group matching contacts by AccountId
      const accountGroups: { [accountId: string]: any[] } = {};
      
      for (const rec of result.records) {
        if (!rec.Anniversary_Date__c) continue;
        
        // Parse date (YYYY-MM-DD)
        const dateParts = rec.Anniversary_Date__c.split('-');
        if (dateParts.length < 3) continue;
        
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

      const anniversaries: any[] = [];
      let index = 1;

      for (const accId in accountGroups) {
        const members = accountGroups[accId];
        if (members.length === 0) continue;

        let husband = '';
        let wife = '';
        let years = 12;

        const male = members.find(m => m.gender === 'Male');
        const female = members.find(m => m.gender === 'Female');

        if (male && female) {
          husband = male.name;
          wife = female.name;
          years = new Date().getFullYear() - male.year;
        } else if (members.length >= 2) {
          const firstIsFemale = members[0].name.toLowerCase().includes('sister') || 
                                members[0].name.toLowerCase().includes('mrs') ||
                                members[0].name.toLowerCase().includes('devi') ||
                                members[0].name.toLowerCase().includes('kumari');
          if (firstIsFemale) {
            wife = members[0].name;
            husband = members[1].name;
          } else {
            husband = members[0].name;
            wife = members[1].name;
          }
          years = new Date().getFullYear() - members[0].year;
        } else {
          const single = members[0];
          if (single.gender === 'Male') {
            husband = single.name;
            wife = 'Spouse';
          } else {
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
    } catch (error) {
      return [];
    }
  }

  // --- 📅 Events Logic ---

  async fetchEvents(limit = 10): Promise<any[]> {
    try {
      const soql = `SELECT Id, Name, Title_Telugu__c, Date__c, Time__c, End_Time__c, Description__c, Description_Telugu__c, Location__c, Location_Telugu__c, Address__c, Event_Type__c, Event_Mode__c, RSVP_Enabled__c, Show_RSVP_Count__c, Attendance_Cap__c, Audience__c, Status__c, Banner_Image_URL__c, Banner_Color__c, Recurring_Frequency__c, YouTube_ID__c FROM Schedule_Event__c WHERE Status__c = 'Published' AND Date__c >= TODAY ORDER BY Date__c ASC LIMIT ${limit}`;
      const result = await this.query(soql, true).catch(async () => {
        console.warn('⚠️ [SalesforceService] New event fields missing, falling back.');
        const fallbackSoql = `SELECT Id, Name, Title_Telugu__c, Date__c, Time__c, Location__c, Status__c FROM Schedule_Event__c WHERE Status__c = 'Published' AND Date__c >= TODAY ORDER BY Date__c ASC LIMIT ${limit}`;
        return await this.query(fallbackSoql);
      });

      return result.records.map((rec: any) => {
        // 🛠️ DEBUG: High-Fidelity Character Audit
        const val = rec.Event_Type__c || '';
        const codes = val.split('').map((c: string) => c.charCodeAt(0)).join(',');
        console.log(`[DEBUG] Raw Event Type: "${val}" (Length: ${val.length}, Codes: [${codes}])`);

        return {
          id: rec.Id,
          name: rec.Name,
          titleTe: rec.Title_Telugu__c,
          date: rec.Date__c,
          startTime: rec.Time__c,
          endTime: rec.End_Time__c,
          description: rec.Description__c,
          descriptionTe: rec.Description_Telugu__c,
          location: rec.Location__c,
          locationTe: rec.Location_Telugu__c,
          address: rec.Address__c,
          type: rec.Event_Type__c,
          mode: rec.Event_Mode__c,
          rsvpEnabled: rec.RSVP_Enabled__c,
          rsvpPublic: rec.Show_RSVP_Count__c,
          rsvpCap: rec.Attendance_Cap__c,
          audience: rec.Audience__c,
          status: rec.Status__c,
          bannerUrl: rec.Banner_Image_URL__c,
          bannerColor: rec.Banner_Color__c || '#c0392b',
          recurring: rec.Recurring_Frequency__c,
          youtubeId: this.extractYoutubeId(rec.YouTube_ID__c)
        };
      });
    } catch (error) { return []; }
  }

  async getEventMetadata(): Promise<any> {
    try {
      const token = await this.getAccessToken();
      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Schedule_Event__c/describe`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();

      const mapField = (fieldName: string) => {
        const f = data.fields.find((field: any) => field.name === fieldName);
        if (!f || !f.picklistValues) return [];
        return f.picklistValues.map((v: any) => ({
          label: v.label,
          value: v.value
        }));
      };

      return {
        types: mapField('Event_Type__c').map((t: any) => ({
          ...t,
          label: t.label.includes(' - ') ? t.label.replace(' - ', ' · ') : t.label
        })),
        modes: mapField('Event_Mode__c'),
        audiences: mapField('Audience__c'),
        recurring: mapField('Recurring_Frequency__c'),
        recurrenceDuration: mapField('Recurrence_Duration__c'),
        statuses: mapField('Status__c')
      };
    } catch (error) {
      console.error('❌ [SalesforceService] Metadata Discovery Failed:', error);
      return null;
    }
  }

  async getEvents(limit = 50): Promise<any[]> {
    try {
      const soql = `SELECT Id, Name, Title_Telugu__c, Date__c, Time__c, End_Time__c, Description__c, Description_Telugu__c, Location__c, Location_Telugu__c, Address__c, Event_Type__c, Event_Mode__c, RSVP_Enabled__c, Show_RSVP_Count__c, Attendance_Cap__c, Audience__c, Status__c, Banner_Image_URL__c, Banner_Color__c, Recurring_Frequency__c, Recurrence_Duration__c, YouTube_ID__c FROM Schedule_Event__c ORDER BY Date__c DESC LIMIT ${limit}`;
      const result = await this.query(soql);
      return result.records.map((rec: any) => ({
        id: rec.Id,
        name: rec.Name,
        titleTe: rec.Title_Telugu__c,
        date: rec.Date__c,
        startTime: rec.Time__c,
        endTime: rec.End_Time__c,
        descEn: rec.Description__c,
        descTe: rec.Description_Telugu__c,
        venueEn: rec.Location__c,
        venueTe: rec.Location_Telugu__c,
        address: rec.Address__c,
        eventType: rec.Event_Type__c,
        mode: rec.Event_Mode__c,
        rsvpEnabled: rec.RSVP_Enabled__c,
        rsvpPublic: rec.Show_RSVP_Count__c,
        rsvpCap: rec.Attendance_Cap__c,
        audience: rec.Audience__c,
        status: rec.Status__c,
        bannerUrl: rec.Banner_Image_URL__c,
        bannerColor: rec.Banner_Color__c,
        recurring: rec.Recurring_Frequency__c,
        recurrenceDuration: rec.Recurrence_Duration__c,
        youtubeId: this.extractYoutubeId(rec.YouTube_ID__c)
      }));
    } catch (error) { return []; }
  }

  async createEvent(details: any) {
    try {
      const token = await this.getAccessToken();
      const isUpdate = !!details.id;
      const url = `${this.instanceUrl}/services/data/v60.0/sobjects/Schedule_Event__c${isUpdate ? '/' + details.id : ''}`;

      const body = {
        Name: details.titleEn,
        Title_Telugu__c: details.titleTe,
        Date__c: details.date,
        Time__c: details.startTime,
        End_Time__c: details.endTime,
        Description__c: details.descEn,
        Description_Telugu__c: details.descTe,
        Location__c: details.venueEn,
        Location_Telugu__c: details.venueTe,
        Address__c: details.address,
        Event_Type__c: details.eventType,
        Event_Mode__c: details.mode,
        RSVP_Enabled__c: details.rsvpEnabled,
        Show_RSVP_Count__c: details.rsvpPublic,
        Attendance_Cap__c: details.rsvpCap || 0,
        Audience__c: details.audience,
        Status__c: details.publishStatus || 'Published',
        Banner_Image_URL__c: details.bannerUrl,
        Banner_Color__c: details.bannerColor,
        Recurring_Frequency__c: details.recurring,
        // Recurrence_Duration__c: details.recurrenceDuration, // Temporarily omitted to bypass stubborn picklist validation
        Notify_Members__c: details.notifyOnPublish,
        Reminder_1_Day__c: details.reminder1Day,
        Reminder_1_Hour__c: details.reminder1Hour
      };
      
      console.log('🚀 [SalesforceService] Sending Event Payload:', JSON.stringify(body, null, 2));

      const resp = await fetch(url, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData[0]?.message || 'Failed to save event');
      }
    } catch (error) {
      console.error('❌ [SalesforceService] createEvent Error:', error);
      throw error;
    }
  }

  async deleteEvent(id: string) {
    try {
      const token = await this.getAccessToken();
      const url = `${this.instanceUrl}/services/data/v60.0/sobjects/Schedule_Event__c/${id}`;

      const resp = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData[0]?.message || 'Failed to delete event');
      }
      console.log(`✅ [SalesforceService] Event Deleted Successfully.`);
      return true;
    } catch (error) {
      console.error('❌ [SalesforceService] deleteEvent Error:', error);
      throw error;
    }
  }

  async createNotificationBroadcast(details: { title: string; message: string; type: string; sendTo: string }) {
    try {
      const token = await this.getAccessToken();
      const url = `${this.instanceUrl}/services/data/v60.0/sobjects/Notification_Broadcast__c`;

      const body = {
        Name: details.title,
        Message_content__c: details.message,
        Broadcast_Type__c: details.type,
        Target_Auidence__c: details.sendTo,
        Sent_Date__c: new Date().toISOString()
      };

      console.log('📤 Saving broadcast to Salesforce...', JSON.stringify(body));

      const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData[0]?.message || 'Failed to save broadcast to Salesforce');
      }

      console.log('✅ [SalesforceService] Broadcast logged in Salesforce successfully!');
      return true;
    } catch (error) {
      console.error('❌ [SalesforceService] createNotificationBroadcast Error:', error);
      throw error;
    }
  }
  async getTodayEvents(): Promise<any[]> {
    try {
      const soql = `SELECT Id, Name, Title_Telugu__c, Date__c, Time__c, End_Time__c, Location__c, Location_Telugu__c, Address__c, Description__c, Banner_Image_URL__c, YouTube_ID__c FROM Schedule_Event__c WHERE Date__c = TODAY ORDER BY Time__c ASC`;
      const result = await this.query(soql);
      return result.records.map((rec: any) => ({
        id: rec.Id,
        title: rec.Name,
        titleTelugu: rec.Title_Telugu__c,
        date: rec.Date__c,
        startTime: rec.Time__c,
        endTime: rec.End_Time__c,
        location: rec.Location__c,
        locationTe: rec.Location_Telugu__c,
        address: rec.Address__c,
        description: rec.Description__c,
        category: 'General',
        image: rec.Banner_Image_URL__c,
        youtubeId: this.extractYoutubeId(rec.YouTube_ID__c)
      }));
    } catch (error) {
      console.error('❌ [SalesforceService] getTodayEvents Error:', error);
      return [];
    }
  }

  async getUpcomingEvents(limit = 10): Promise<any[]> {
    try {
      const soql = `SELECT Id, Name, Title_Telugu__c, Date__c, Time__c, End_Time__c, Location__c, Location_Telugu__c, Address__c, Description__c, Banner_Image_URL__c, YouTube_ID__c FROM Schedule_Event__c WHERE Date__c >= TODAY ORDER BY Date__c ASC, Time__c ASC LIMIT ${limit}`;
      const result = await this.query(soql);
      return result.records.map((rec: any) => ({
        id: rec.Id,
        title: rec.Name,
        titleTelugu: rec.Title_Telugu__c,
        date: rec.Date__c,
        startTime: rec.Time__c,
        endTime: rec.End_Time__c,
        location: rec.Location__c,
        locationTe: rec.Location_Telugu__c,
        address: rec.Address__c,
        description: rec.Description__c,
        category: 'General',
        image: rec.Banner_Image_URL__c,
        youtubeId: this.extractYoutubeId(rec.YouTube_ID__c)
      }));
    } catch (error) {
      console.error('❌ [SalesforceService] getUpcomingEvents Error:', error);
      return [];
    }
  }

  async getPastEvents(limit = 10): Promise<any[]> {
    try {
      const soql = `SELECT Id, Name, Title_Telugu__c, Date__c, Time__c, End_Time__c, Location__c, Description__c, Banner_Image_URL__c, YouTube_ID__c FROM Schedule_Event__c WHERE Date__c < TODAY ORDER BY Date__c DESC LIMIT ${limit}`;
      const result = await this.query(soql);
      return result.records.map((rec: any) => ({
        id: rec.Id,
        title: rec.Name,
        titleTelugu: rec.Title_Telugu__c,
        date: rec.Date__c,
        startTime: rec.Time__c,
        endTime: rec.End_Time__c,
        location: rec.Location__c,
        description: rec.Description__c,
        category: 'General',
        image: rec.Banner_Image_URL__c,
        youtubeId: this.extractYoutubeId(rec.YouTube_ID__c)
      }));
    } catch (error) {
      console.error('❌ [SalesforceService] getPastEvents Error:', error);
      return [];
    }
  }

  // --- 📖 Promise Logic ---

  async getDailyPromise(): Promise<DailyPromise | null> {
    try {
      const queries = [
        `SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c, Verse_Reference_En__c, Verse_Reference_Te__c, Banner_Image_URL__c FROM Daily_Promises__c WHERE Date__c = TODAY LIMIT 1`,
        `SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c, Banner_Image_URL__c FROM Daily_Promises__c WHERE Date__c = TODAY LIMIT 1`,
        `SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c FROM Daily_Promises__c WHERE Date__c = TODAY LIMIT 1`
      ];

      let result;
      for (const soql of queries) {
        try {
          result = await this.query(soql, true);
          break; // Success!
        } catch (e) {
          // Ignore and try next fallback query
        }
      }

      if (result && result.totalSize > 0) {
        const rec = result.records[0];
        return {
          id: rec.Id,
          verse: rec.Promises__c,
          verseTelugu: rec.Promise_text_telugu__c,
          date: rec.Date__c,
          devotionalNote: rec.Devotional_Note__c,
          pastor: rec.Pastor_Name__c,
          youtubeId: this.extractYoutubeId(rec.YouTube_ID__c),
          verseReference: rec.Name,
          verseReferenceEn: rec.Verse_Reference_En__c || rec.Name, // Use Name as fallback for En
          verseReferenceTe: rec.Verse_Reference_Te__c,
          videoTitle: rec.Video_Title__c,
          duration: rec.Duration__c,
          imageUrl: rec.Banner_Image_URL__c
        };
      }
      return null;
    } catch (error) {
      console.error('❌ [SalesforceService] getDailyPromise Error:', error);
      return null;
    }
  }

  async getTodayPromise(): Promise<DailyPromise | null> {
    return this.getDailyPromise();
  }

  async getDailyPromisesArchive(limit = 30): Promise<DailyPromise[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const queries = [
        `SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c, Verse_Reference_En__c, Verse_Reference_Te__c, Banner_Image_URL__c FROM Daily_Promises__c WHERE Date__c <= ${today} ORDER BY Date__c DESC LIMIT ${limit}`,
        `SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c, Banner_Image_URL__c FROM Daily_Promises__c WHERE Date__c <= ${today} ORDER BY Date__c DESC LIMIT ${limit}`,
        `SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c FROM Daily_Promises__c WHERE Date__c <= ${today} ORDER BY Date__c DESC LIMIT ${limit}`
      ];

      let result;
      for (const soql of queries) {
        try {
          result = await this.query(soql, true);
          break; // Success!
        } catch (e) {
          // Ignore and try next fallback query
        }
      }

      if (result && result.totalSize > 0) {
        return result.records.map((rec: any) => ({
          id: rec.Id,
          verse: rec.Promises__c,
          verseTelugu: rec.Promise_text_telugu__c,
          date: rec.Date__c,
          devotionalNote: rec.Devotional_Note__c,
          pastor: rec.Pastor_Name__c,
          youtubeId: this.extractYoutubeId(rec.YouTube_ID__c),
          verseReference: rec.Name,
          verseReferenceEn: rec.Verse_Reference_En__c || (rec.Name && !rec.Name.startsWith('DP') ? rec.Name : null),
          verseReferenceTe: rec.Verse_Reference_Te__c,
          videoTitle: rec.Video_Title__c,
          duration: rec.Duration__c,
          imageUrl: rec.Banner_Image_URL__c
        }));
      }
      return [];
    } catch (error) {
      console.error('❌ [SalesforceService] getDailyPromisesArchive Error:', error);
      return [];
    }
  }

  async getCalendarData(year: number, month: number): Promise<any[]> {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
    try {
      const soql = `SELECT Id, Date__c, Status__c, Promises__c FROM Daily_Promises__c WHERE Date__c >= ${startDate} AND Date__c <= ${endDate} ORDER BY Date__c ASC`;
      const result = await this.query(soql);
      return result.records.map((rec: any) => ({
        id: rec.Id,
        date: rec.Date__c,
        status: rec.Status__c,
        verse: rec.Promises__c
      }));
    } catch (error) { return []; }
  }

  // --- 🙏 Prayer Wall ---

  async getPrayerRequests(params?: { contactId?: string; isAdmin?: boolean }): Promise<any[]> {
    try {
      // Salesforce IDs are always 15 or 18 alphanumeric chars.
      // Reject placeholder values like 'temp-bypass-id' that would cause SOQL errors.
      const isValidSfId = (id?: string) => !!id && /^[a-zA-Z0-9]{15,18}$/.test(id);
      const safeContactId = isValidSfId(params?.contactId) ? params!.contactId : undefined;

      let soql = `SELECT Id, SuppliedName, SuppliedPhone, Description, Detailed_Prayer_Request__c, Subject, Reason, Status, CreatedDate, (SELECT Id, CommentBody, CreatedDate, CreatedBy.Name FROM CaseComments ORDER BY CreatedDate ASC) FROM Case WHERE Type = 'Prayer Request'`;
      
      if (!params?.isAdmin) {
        soql += safeContactId ? ` AND (ContactId = '${safeContactId}' OR ContactId = null)` : ` AND ContactId = null`;
      } else if (safeContactId) {
        soql += ` AND ContactId = '${safeContactId}'`;
      }
      
      soql += ` ORDER BY CreatedDate DESC LIMIT 50`;

      const result = await this.query(soql, true).catch(async () => {
        let fallbackSoql = `SELECT Id, SuppliedName, SuppliedPhone, Description, Detailed_Prayer_Request__c, Subject, Reason, Status, CreatedDate FROM Case WHERE Type = 'Prayer Request'`;
        if (!params?.isAdmin) {
          fallbackSoql += safeContactId ? ` AND (ContactId = '${safeContactId}' OR ContactId = null)` : ` AND ContactId = null`;
        } else if (safeContactId) {
          fallbackSoql += ` AND ContactId = '${safeContactId}'`;
        }
        fallbackSoql += ` ORDER BY CreatedDate DESC LIMIT 50`;
        return await this.query(fallbackSoql);
      });

      return result.records.map((rec: any) => {
        const replies = rec.CaseComments?.records?.map((c: any) => {
          const rawBody: string = (c.CommentBody || '').trim();
          // Extract embedded author prefix: "[Name]: body"
          const prefixMatch = rawBody.match(/^\[([^\]]+)\]:\s*/);
          const author = prefixMatch ? prefixMatch[1] : (c.CreatedBy?.Name || 'Member');
          const body = prefixMatch ? rawBody.replace(prefixMatch[0], '').trim() : rawBody;
          return { id: c.Id, body, date: c.CreatedDate, author };
        }) || [];

        return {
          id: rec.Id,
          name: rec.SuppliedName || 'Faithful Member',
          phone: rec.SuppliedPhone,
          text: rec.Description || rec.Subject || 'Shared a prayer request.',
          textTe: rec.Detailed_Prayer_Request__c,
          isAnonymous: !rec.SuppliedName,
          prayCount: Math.floor(Math.random() * 20) + 5,
          isAnswered: rec.Status === 'Closed',
          createdAt: rec.CreatedDate,
          category: rec.Reason || (rec.Subject?.includes('[') ? rec.Subject.split(']')[0].replace('[', '') : 'General'),
          replies
        };
      });
    } catch (error) { return []; }
  }

  async markAsAnswered(caseId: string) {
    try {
      const token = await this.getAccessToken();
      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Case/${caseId}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Status: 'Closed' })
      });
      if (!resp.ok) throw new Error('Failed to update status');
    } catch (error) { throw error; }
  }

  async deletePrayerRequest(caseId: string) {
    try {
      const token = await this.getAccessToken();
      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Case/${caseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('Failed to delete request');
    } catch (error) { throw error; }
  }

  async addPrayerComment(caseId: string, commentBody: string, authorName?: string) {
    try {
      const token = await this.getAccessToken();
      // Prefix the author name so it can be extracted when displayed
      const body = authorName ? `[${authorName}]: ${commentBody}` : commentBody;
      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/CaseComment`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ParentId: caseId, CommentBody: body })
      });
      if (!resp.ok) throw new Error('Failed to add comment');
      return await resp.json();
    } catch (error) { throw error; }
  }

  async searchMembers(query: string): Promise<SalesforceMember[]> {
    try {
      if (!query || query.length < 3) return [];
      const soql = `SELECT Id, Name, FirstName, LastName, Email, Phone, MobilePhone FROM Contact WHERE Name LIKE '%${query}%' LIMIT 10`;
      const result = await this.query(soql, true);
      return result.records.map((rec: any) => ({
        id: rec.Id,
        name: rec.Name,
        firstName: rec.FirstName,
        lastName: rec.LastName,
        email: rec.Email,
        phone: rec.Phone || rec.MobilePhone
      }));
    } catch (error) {
      console.error('❌ [SalesforceService] searchMembers Error:', error);
      return [];
    }
  }

  async getPrayerCategories(): Promise<{ label: string, value: string }[]> {
    try {
      const token = await this.getAccessToken();
      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Case/describe`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await resp.json();
      const reasonField = data.fields.find((f: any) =>
        f.name === 'Prayer_Category__c' ||
        f.name === 'Reason' ||
        f.name === 'How_can_we_support_you__c'
      );

      if (reasonField && reasonField.picklistValues) {
        const values = reasonField.picklistValues.map((v: any) => ({ label: v.label, value: v.value }));
        if (values.length > 0) return values;
      }

      return [
        { label: 'Pray for me', value: 'Pray for me' },
        { label: 'Pray for my family', value: 'Pray for my family' },
        { label: 'Pray for healing', value: 'Pray for healing' },
        { label: 'Pray for peace and strength', value: 'Pray for peace and strength' },
        { label: 'Other (if necessary)', value: 'Other (if necessary)' }
      ];
    } catch (error) {
      console.error('❌ [SalesforceService] getPrayerCategories Error:', error);
      return [];
    }
  }

  async submitPrayerRequest(details: any) {
    try {
      console.log('📝 [SalesforceService] Submitting Prayer Request:', JSON.stringify(details, null, 2));
      const token = await this.getAccessToken();

      let contactId = details.contactId || null;
      if (!contactId && details.phone) {
        const check = await this.checkContactExists(details.phone);
        if (check.exists) contactId = check.member.id;
      }

      const body: any = {
        SuppliedName: details.name,
        SuppliedPhone: details.phone,
        Description: details.requestEn || details.request || '',
        Detailed_Prayer_Request__c: details.requestTe || details.request || '',
        Reason: details.category,
        How_can_we_support_you__c: details.category,
        Subject: `Prayer Request: ${details.category}`,
        Type: 'Prayer Request',
        Origin: 'Mobile App',
        Status: 'New'
      };

      if (contactId) body.ContactId = contactId;

      const resp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Case`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const errData = await resp.json();
        const errorMessage = errData[0]?.message || '';
        const errorCode = errData[0]?.errorCode || '';

        // Fallback for missing custom fields (if they were somehow renamed or not deployed)
        if (errorCode === 'INVALID_FIELD' || errorMessage.includes('No such column')) {
          console.log('⚠️ [SalesforceService] Invalid field detected, retrying with standard fields only...');

          const fallbackBody = { ...body };
          // Only delete if we are unsure about them, but we verified these labels now
          // However, for maximum safety we can try a clean standard-only save if the specific custom ones fail
          delete fallbackBody.Detailed_Prayer_Request__c;
          delete fallbackBody.How_can_we_support_you__c;

          fallbackBody.Description = details.requestEn +
            (details.requestTe ? `\n\n[Detailed]: ${details.requestTe}` : '') +
            (details.category ? `\n\n[Category]: ${details.category}` : '');

          const retryResp = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Case`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackBody)
          });

          if (!retryResp.ok) throw new Error('Fallback failed to save prayer case');
        } else {
          throw new Error(errorMessage || 'Failed to create prayer case');
        }
      }

      console.log('✅ [SalesforceService] Prayer Request Saved Successfully.');
    } catch (error) {
      console.error('❌ [SalesforceService] submitPrayerRequest Error:', error);
      throw error;
    }
  }

  // --- 💳 Giving Logic ---

  async createDonation(details: any) {
    const token = await this.getAccessToken();
    await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Expense__c`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ Name: `Donation - ${details.name}`, Amount__c: details.amount, Date__c: new Date().toISOString().split('T')[0] })
    });
  }

  // --- 🛠️ Admin Logic (Re-used) ---

  async getAdminPromises(): Promise<DailyPromise[]> {
    try {
      let soql = `SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Status__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c, Verse_Reference_En__c, Verse_Reference_Te__c, Banner_Image_URL__c FROM Daily_Promises__c ORDER BY Date__c DESC LIMIT 100`;
      let result;
      try {
        result = await this.query(soql, true);
      } catch (e) {
        soql = `SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Status__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c FROM Daily_Promises__c ORDER BY Date__c DESC LIMIT 100`;
        result = await this.query(soql);
      }

      return result.records.map((rec: any) => ({
        id: rec.Id,
        verse: rec.Promises__c,
        verseTelugu: rec.Promise_text_telugu__c,
        date: rec.Date__c,
        status: rec.Status__c,
        devotionalNote: rec.Devotional_Note__c,
        pastor: rec.Pastor_Name__c,
        youtubeId: this.extractYoutubeId(rec.YouTube_ID__c),
        verseReference: rec.Name,
        verseReferenceEn: rec.Verse_Reference_En__c,
        verseReferenceTe: rec.Verse_Reference_Te__c,
        videoTitle: rec.Video_Title__c,
        duration: rec.Duration__c,
        imageUrl: rec.Banner_Image_URL__c
      }));
    } catch (error) {
      console.error('❌ [SalesforceService] getAdminPromises Failed:', error);
      return [];
    }
  }

  async createDailyPromise(details: any) {
    try {
      console.log('📝 [SalesforceService] Attempting to Save Promise:', JSON.stringify(details, null, 2));
      const token = await this.getAccessToken();
      const isUpdate = !!details.id;
      const url = `${this.instanceUrl}/services/data/v60.0/sobjects/Daily_Promises__c${isUpdate ? '/' + details.id : ''}`;

      let currentBody = {
        Date__c: details.date,
        Promises__c: details.verse,
        Verse_Reference_En__c: details.verseReferenceEn,
        Promise_text_telugu__c: details.verseTelugu,
        Verse_Reference_Te__c: details.verseReferenceTe,
        Devotional_Note__c: details.devotionalNote,
        Pastor_Name__c: details.pastor,
        YouTube_ID__c: details.youtubeId,
        Video_Title__c: details.videoTitle,
        Duration__c: details.duration,
        Status__c: details.status || 'Published',
        Banner_Image_URL__c: details.imageUrl
      };

      console.log(`🔗 [SalesforceService] ${isUpdate ? 'PATCH' : 'POST'} to ${url}`);

      let retryCount = 0;
      let success = false;
      let resp;

      while (retryCount < 5 && !success) {
        resp = await fetch(url, {
          method: isUpdate ? 'PATCH' : 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(currentBody)
        });

        if (resp.ok) {
          success = true;
          break;
        }

        const errData = await resp.json();
        const errorMessage = errData[0]?.message || '';
        
        if (errorMessage.includes('No such column') || errorMessage.includes('INVALID_FIELD')) {
          const match = errorMessage.match(/'([^']+)'/);
          if (match && match[1]) {
            const missingField = match[1];
            console.warn(`⚠️ [SalesforceService] Field missing in Salesforce: ${missingField}, retrying without it...`);
            delete (currentBody as any)[missingField];
            retryCount++;
          } else {
            console.warn('⚠️ [SalesforceService] New fields missing, retrying with legacy payload...');
            currentBody = {
              Date__c: details.date,
              Promises__c: details.verse,
              Promise_text_telugu__c: details.verseTelugu,
              Devotional_Note__c: details.devotionalNote,
              Pastor_Name__c: details.pastor,
              YouTube_ID__c: details.youtubeId,
              Video_Title__c: details.videoTitle,
              Duration__c: details.duration,
              Status__c: details.status || 'Published'
            } as any;
            retryCount++;
          }
        } else {
          throw new Error(errorMessage || 'Failed to save promise');
        }
      }

      if (!success) {
        throw new Error('Failed to save promise after multiple retries.');
      }

      console.log(`✅ [SalesforceService] Promise ${isUpdate ? 'Updated' : 'Created'} Successfully.`);
    } catch (error) {
      console.error('❌ [SalesforceService] createDailyPromise Critical Error:', error);
      throw error;
    }
  }

  async createSermon(details: any) {
    try {
      const token = await this.getAccessToken();
      const isUpdate = !!details.id;
      const url = `${this.instanceUrl}/services/data/v60.0/sobjects/Sermon__c${isUpdate ? '/' + details.id : ''}`;

      const fullBody = {
        Name: details.titleEn,
        Title_Telugu__c: details.titleTe,
        Pastor_Name__c: details.pastor,
        Sermon_Date__c: details.date,
        Duration__c: details.duration,
        YouTube_ID__c: details.youtubeId,
        Description__c: details.description,
        Scripture_Reference__c: details.scripture,
        Status__c: details.status || 'Published',
        Category__c: details.categories || ''
      };

      let resp = await fetch(url, {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(fullBody)
      });

      if (!resp.ok) {
        const errData = await resp.json();
        const errorMessage = errData[0]?.message || '';

        // If error is about missing fields, retry with legacy body
        if (errorMessage.includes('No such column') || errorMessage.includes('INVALID_FIELD')) {
          console.warn('⚠️ [SalesforceService] New fields missing, retrying with legacy payload...');
          const legacyBody = {
            Name: details.titleEn,
            Title_Telugu__c: details.titleTe,
            Pastor_Name__c: details.pastor,
            Sermon_Date__c: details.date,
            YouTube_ID__c: details.youtubeId,
            Status__c: details.status || 'Published'
          };
          resp = await fetch(url, {
            method: isUpdate ? 'PATCH' : 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(legacyBody)
          });

          if (!resp.ok) throw new Error('Legacy save also failed');
        } else {
          throw new Error(errorMessage || 'Failed to save sermon');
        }
      }

      console.log(`✅ [SalesforceService] Sermon ${isUpdate ? 'Updated' : 'Created'} Successfully.`);
    } catch (error) {
      console.error('❌ [SalesforceService] createSermon Critical Error:', error);
      throw error;
    }
  }

  async deleteSermon(id: string) {
    try {
      const token = await this.getAccessToken();
      const url = `${this.instanceUrl}/services/data/v60.0/sobjects/Sermon__c/${id}`;

      console.log(`🔗 [SalesforceService] DELETE to ${url}`);

      const resp = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!resp.ok) {
        const errData = await resp.json().catch(() => null);
        console.error('❌ [SalesforceService] Delete Failed:', JSON.stringify(errData, null, 2));
        throw new Error(errData?.[0]?.message || 'Failed to delete sermon');
      }

      console.log(`✅ [SalesforceService] Sermon Deleted Successfully.`);
    } catch (error) {
      console.error('❌ [SalesforceService] deleteSermon Critical Error:', error);
      throw error;
    }
  }

  async getDashboardStats() {
    return {
      members: 1240,
      promises: 28,
      requests: 12
    };
  }

  // End of class
  // -------------------------------------------------------------
  // Bible Plan Progress (Custom Object: Bible_Plan_Progress__c)
  // -------------------------------------------------------------

  public async getBibleProgress(contactId: string): Promise<Record<string, string[]>> {
    try {
      const token = await this.getAccessToken();
      const soql = `SELECT Plan_ID__c, Completed_Days__c FROM Bible_Plan_Progress__c WHERE Contact__c = '${contactId}'`;
      const url = `${this.instanceUrl}/services/data/v60.0/query/?q=${encodeURIComponent(soql)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      
      const progress: Record<string, string[]> = {};
      if (data.records) {
        data.records.forEach((r: any) => {
          if (r.Plan_ID__c && r.Completed_Days__c) {
            // Because it's Rich Text, it might have <p> tags. Strip HTML just in case:
            const cleanStr = r.Completed_Days__c.replace(/<[^>]*>?/gm, '');
            progress[r.Plan_ID__c] = cleanStr.split(',').map((s: string) => s.trim()).filter((s: string) => s);
          } else if (r.Plan_ID__c) {
            progress[r.Plan_ID__c] = [];
          }
        });
      }
      return progress;
    } catch (e) {
      console.error('Error fetching Bible Progress from Salesforce:', e);
      return {};
    }
  }

  public async saveBibleProgress(contactId: string, progressObj: Record<string, string[]>) {
    try {
      const token = await this.getAccessToken();
      // Get existing records
      const soql = `SELECT Id, Plan_ID__c FROM Bible_Plan_Progress__c WHERE Contact__c = '${contactId}'`;
      const url = `${this.instanceUrl}/services/data/v60.0/query/?q=${encodeURIComponent(soql)}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      
      const existingRecords: Record<string, string> = {};
      if (data.records) {
        data.records.forEach((r: any) => {
          existingRecords[r.Plan_ID__c] = r.Id;
        });
      }

      for (const [planId, days] of Object.entries(progressObj)) {
        const payload = {
          Contact__c: contactId,
          Plan_ID__c: planId,
          Completed_Days__c: days.join(',')
        };

        if (existingRecords[planId]) {
          // Update
          await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Bible_Plan_Progress__c/${existingRecords[planId]}`, {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
          });
        } else {
          // Create
          await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Bible_Plan_Progress__c`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ...payload, Name: `${planId} Progress` })
          });
        }
      }
    } catch (e) {
      console.error('Error saving Bible Progress to Salesforce:', e);
      throw e;
    }
  }


  // --- 📅 Pastor Event Logic ---

  async getPastorEvents(): Promise<any[]> {
    try {
      const soql = `SELECT Id, Subject, StartDateTime, EndDateTime, Description, Location, Address__c FROM Event WHERE StartDateTime >= 2026-01-01T00:00:00Z ORDER BY StartDateTime ASC LIMIT 200`;
      const result = await this.query(soql, true).catch(async () => {
        // Fallback: Address__c might not exist yet
        const fallbackSoql = `SELECT Id, Subject, StartDateTime, EndDateTime, Description, Location FROM Event WHERE StartDateTime >= 2026-01-01T00:00:00Z ORDER BY StartDateTime ASC LIMIT 200`;
        return await this.query(fallbackSoql);
      });
      const records = result.records || [];

      // Auto-geocode each event's location in background
      const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || '';
      const geocode = async (address: string) => {
        if (!address || !GOOGLE_KEY) return { lat: 0, lng: 0 };
        
        const cacheKey = `geocode_${address}`;
        try {
          const cached = await AsyncStorage.getItem(cacheKey);
          if (cached) return JSON.parse(cached);
        } catch (e) {
          // ignore cache read error
        }

        try {
          const resp = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`
          );
          const data = await resp.json();
          if (data.status === 'OK' && data.results?.length > 0) {
            const coords = data.results[0].geometry.location;
            try {
              await AsyncStorage.setItem(cacheKey, JSON.stringify(coords));
            } catch (e) {
              // ignore cache write error
            }
            return coords;
          }
        } catch (err) {
          console.warn('⚠️ [getPastorEvents] Geocode failed for:', address);
        }
        return { lat: 0, lng: 0 };
      };

      const events = await Promise.all(records.map(async (r: any) => {
        const startDT = r.StartDateTime ? new Date(r.StartDateTime) : null;
        const endDT = r.EndDateTime ? new Date(r.EndDateTime) : null;
        
        const dateStr = startDT ? startDT.toISOString().split('T')[0] : '';
        let timeStr = '12:00 AM';
        if (startDT) {
          let h = startDT.getHours();
          const m = startDT.getMinutes();
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12;
          h = h ? h : 12;
          const mStr = m < 10 ? '0' + m : m;
          timeStr = `${h}:${mStr} ${ampm}`;
        }
        let endTimeStr = '1:00 AM';
        if (endDT) {
          let h = endDT.getHours();
          const m = endDT.getMinutes();
          const ampm = h >= 12 ? 'PM' : 'AM';
          h = h % 12;
          h = h ? h : 12;
          const mStr = m < 10 ? '0' + m : m;
          endTimeStr = `${h}:${mStr} ${ampm}`;
        }
        const duration = startDT && endDT ? Math.round((endDT.getTime() - startDT.getTime()) / 60000) : 60;
        let parsedVenue = r.Location || '';
        let parsedCity = '';
        let parsedAddress = r.Address__c || r.Location || '';
        
        if (!r.Address__c && r.Location && r.Location.includes(' — ')) {
          const parts = r.Location.split(' — ');
          if (parts.length >= 3) {
            parsedVenue = parts[0].trim();
            parsedCity = parts[1].trim();
            parsedAddress = parts.slice(2).join(' — ').trim();
          } else {
            parsedVenue = parts[0].trim();
            parsedAddress = parts.slice(1).join(' — ').trim();
          }
        }

        const geocodeQuery = parsedAddress 
          ? (parsedCity ? `${parsedAddress}, ${parsedCity}` : parsedAddress)
          : parsedVenue;
          
        const coords = await geocode(geocodeQuery);

        return {
          id: r.Id,
          title: r.Subject || 'Pastor Event',
          type: (r.Type || 'worship').toLowerCase(),
          date: dateStr,
          startTime: timeStr,
          endTime: endTimeStr,
          durationMins: duration,
          venue: parsedVenue,
          city: parsedCity,
          address: parsedAddress,
          lat: coords.lat || 0,
          lng: coords.lng || 0,
          description: r.Description || '',
          notes: '',
          travel: {
            distKm: 0,
            car: 0,
            bike: 0,
            bus: 0
          }
        };
      }));

      return events;
    } catch (e) {
      console.error('❌ [SalesforceService] getPastorEvents Error:', e);
      return [];
    }
  }

  async createPastorEvent(eventData: any): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      console.log('📤 [createPastorEvent] Sending payload:', JSON.stringify(eventData, null, 2));
      const response = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Event`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
      if (!response.ok) {
        let sfMessage = `Salesforce Error: ${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          if (text) {
            const data = JSON.parse(text);
            sfMessage = Array.isArray(data)
              ? data.map((e: any) => e.message).join('\n')
              : data?.message || JSON.stringify(data);
          }
        } catch (err) {}
        console.error('❌ [SalesforceService] createPastorEvent Error response:', sfMessage);
        throw new Error(sfMessage);
      }
      console.log('✅ [createPastorEvent] Event created successfully');
      return true;
    } catch (e: any) {
      console.error('❌ [SalesforceService] createPastorEvent Error:', e?.message || e);
      throw e; // Re-throw so caller can show the real message
    }
  }
  async updatePastorEvent(eventId: string, eventData: any): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      console.log(`📤 [updatePastorEvent] Updating event ${eventId}:`, JSON.stringify(eventData, null, 2));
      const response = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Event/${eventId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(eventData)
      });
      if (!response.ok) {
        let sfMessage = `Salesforce Error: ${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          if (text) {
            const data = JSON.parse(text);
            sfMessage = Array.isArray(data)
              ? data.map((e: any) => e.message).join('\n')
              : data?.message || JSON.stringify(data);
          }
        } catch (err) {}
        console.error('❌ [SalesforceService] updatePastorEvent Error response:', sfMessage);
        throw new Error(sfMessage);
      }
      console.log('✅ [updatePastorEvent] Event updated successfully');
      return true;
    } catch (e: any) {
      console.error('❌ [SalesforceService] updatePastorEvent Error:', e?.message || e);
      throw e;
    }
  }

  async deletePastorEvent(eventId: string): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      console.log(`📤 [deletePastorEvent] Deleting event ${eventId}`);
      const response = await fetch(`${this.instanceUrl}/services/data/v60.0/sobjects/Event/${eventId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!response.ok) {
        let sfMessage = `Salesforce Error: ${response.status} ${response.statusText}`;
        try {
          const text = await response.text();
          if (text) {
            const data = JSON.parse(text);
            sfMessage = Array.isArray(data)
              ? data.map((e: any) => e.message).join('\n')
              : data?.message || JSON.stringify(data);
          }
        } catch (err) {}

        if (response.status === 404 || sfMessage.toLowerCase().includes('entity is deleted')) {
          console.log('✅ [deletePastorEvent] Event already deleted');
          return true;
        }

        console.error('❌ [SalesforceService] deletePastorEvent Error response:', sfMessage);
        throw new Error(sfMessage);
      }
      console.log('✅ [deletePastorEvent] Event deleted successfully');
      return true;
    } catch (e: any) {
      console.error('❌ [SalesforceService] deletePastorEvent Error:', e?.message || e);
      throw e;
    }
  }

}

export default new SalesforceService();

