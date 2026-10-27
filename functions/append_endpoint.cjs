const fs = require('fs');

const snippet = `

export const triggerTestPromise = onRequest({ invoker: 'public' }, async (req, res) => {
  try {
    const promise = await getSf().getDailyPromise();
    if (!promise) {
      res.json({success:false, error:'No promise found'});
      return;
    }
    const enContent = promise.Promises__c ? promise.Promises__c.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim() : '';
    const teContent = promise.Promise_text_telugu__c ? promise.Promise_text_telugu__c.replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim() : '';
    const content = (enContent && teContent) ? '📖 ' + enContent + '\\n\\nదువా / వాగ్దానం:\\n📖 ' + teContent : (enContent || teContent || 'Grace and Peace be multiplied to you today.');
    const notifBody = (enContent && teContent) ? '✝️ ' + enContent.slice(0, 70) + '...\\n📖 ' + teContent.slice(0, 70) + '...' : content.slice(0, 120);

    const tokens: string[] = [];
    const snapshot = await getDb().collection('users').get();
    snapshot.forEach((doc: any) => {
      if (doc.data().fcmToken) tokens.push(doc.data().fcmToken);
    });

    await sendInChunks(tokens, {
      notification: { title: '📖 Today\\'s Promise · ఈ రోజు వాగ్దానం', body: notifBody },
      data: { type: 'promise' },
      android: {
        priority: 'high',
        notification: { sound: 'default', priority: 'max', channelId: 'default' }
      }
    } as any);

    res.json({success:true, sent: tokens.length});
  } catch (err: any) {
    res.json({success:false, error: err.message});
  }
});
`;

let f = fs.readFileSync('src/index.ts', 'utf8');
const idx = f.indexOf('export const triggerTestPromise');
if (idx !== -1) f = f.substring(0, idx);
fs.writeFileSync('src/index.ts', f + snippet);
console.log('Appended securely with TS types');
