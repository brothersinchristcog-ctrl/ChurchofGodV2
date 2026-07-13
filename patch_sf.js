const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'app/src/services/SalesforceService.ts');
let content = fs.readFileSync(file, 'utf8');

const createDailyPromiseRegex = /async createDailyPromise\(details: any\) \{[\s\S]*?console\.log\(`✅ \[SalesforceService\] Promise \$\{isUpdate \? 'Updated' : 'Created'\} Successfully\.`\);\n\s*\} catch \(error\) \{[\s\S]*?\}\n  \}/;

const getDailyPromiseRegex = /async getDailyPromise\(\): Promise<DailyPromise \| null> \{[\s\S]*?return null;\n\s*\}\n  \}/;

const getDailyPromisesArchiveRegex = /async getDailyPromisesArchive\(limit = 30\): Promise<DailyPromise\[\]> \{[\s\S]*?return \[\];\n\s*\}\n  \}/;


// Update createDailyPromise
content = content.replace(createDailyPromiseRegex, `async createDailyPromise(details: any) {
    try {
      console.log('📝 [SalesforceService] Attempting to Save Promise:', JSON.stringify(details, null, 2));
      const token = await this.getAccessToken();
      const isUpdate = !!details.id;
      const url = \`\${this.instanceUrl}/services/data/v60.0/sobjects/Daily_Promises__c\${isUpdate ? '/' + details.id : ''}\`;

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

      console.log(\`🔗 [SalesforceService] \${isUpdate ? 'PATCH' : 'POST'} to \${url}\`);

      let retryCount = 0;
      let success = false;
      let resp;

      while (retryCount < 5 && !success) {
        resp = await fetch(url, {
          method: isUpdate ? 'PATCH' : 'POST',
          headers: { Authorization: \`Bearer \${token}\`, 'Content-Type': 'application/json' },
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
            console.warn(\`⚠️ [SalesforceService] Field missing in Salesforce: \${missingField}, retrying without it...\`);
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

      console.log(\`✅ [SalesforceService] Promise \${isUpdate ? 'Updated' : 'Created'} Successfully.\`);
    } catch (error) {
      console.error('❌ [SalesforceService] createDailyPromise Critical Error:', error);
      throw error;
    }
  }`);

// Update getDailyPromise
content = content.replace(getDailyPromiseRegex, `async getDailyPromise(): Promise<DailyPromise | null> {
    try {
      const queries = [
        \`SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c, Verse_Reference_En__c, Verse_Reference_Te__c, Banner_Image_URL__c FROM Daily_Promises__c WHERE Date__c = TODAY LIMIT 1\`,
        \`SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c, Banner_Image_URL__c FROM Daily_Promises__c WHERE Date__c = TODAY LIMIT 1\`,
        \`SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c FROM Daily_Promises__c WHERE Date__c = TODAY LIMIT 1\`
      ];

      let result;
      for (const soql of queries) {
        try {
          result = await this.query(soql, true);
          break; // Success!
        } catch (e) {
          // Ignore and try next
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
          verseReferenceEn: rec.Verse_Reference_En__c || rec.Name,
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
  }`);

// Update getDailyPromisesArchive
content = content.replace(getDailyPromisesArchiveRegex, `async getDailyPromisesArchive(limit = 30): Promise<DailyPromise[]> {
    try {
      const queries = [
        \`SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c, Verse_Reference_En__c, Verse_Reference_Te__c, Banner_Image_URL__c FROM Daily_Promises__c ORDER BY Date__c DESC LIMIT \${limit}\`,
        \`SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c, Banner_Image_URL__c FROM Daily_Promises__c ORDER BY Date__c DESC LIMIT \${limit}\`,
        \`SELECT Id, Promises__c, Promise_text_telugu__c, Date__c, Devotional_Note__c, Pastor_Name__c, YouTube_ID__c, Name, Video_Title__c, Duration__c FROM Daily_Promises__c ORDER BY Date__c DESC LIMIT \${limit}\`
      ];

      let result;
      for (const soql of queries) {
        try {
          result = await this.query(soql, true);
          break; // Success!
        } catch (e) {
          // Ignore and try next
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
          verseReferenceEn: rec.Verse_Reference_En__c || rec.Name,
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
  }`);


fs.writeFileSync(file, content, 'utf8');
console.log('Successfully patched SalesforceService.ts!');
