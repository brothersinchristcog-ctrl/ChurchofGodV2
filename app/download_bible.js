const fs = require('fs');
const https = require('https');
const path = require('path');

const books = [
  "genesis", "exodus", "leviticus", "numbers", "deuteronomy", "joshua", "judges", "ruth", "1samuel", "2samuel",
  "1kings", "2kings", "1chronicles", "2chronicles", "ezra", "nehemiah", "esther", "job", "psalms", "proverbs",
  "ecclesiastes", "songofsolomon", "isaiah", "jeremiah", "lamentations", "ezekiel", "daniel", "hosea", "joel", "amos",
  "obadiah", "jonah", "micah", "nahum", "habakkuk", "zephaniah", "haggai", "zechariah", "malachi",
  "matthew", "mark", "luke", "john", "acts", "romans", "1corinthians", "2corinthians", "galatians", "ephesians",
  "philippians", "colossians", "1thessalonians", "2thessalonians", "1timothy", "2timothy", "titus", "philemon", "hebrews", "james",
  "1peter", "2peter", "1john", "2john", "3john", "jude", "revelation"
];

const BIBLE_DATA = {};
let completed = 0;

console.log('Downloading Telugu Bible... This may take a minute.');

books.forEach((book) => {
  const url = `https://raw.githubusercontent.com/granthas/telugu-bible-json/master/json/${book}.json`;
  
  https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      try {
        const jsonData = JSON.parse(data);
        // Format the data to match our app's structure
        BIBLE_DATA[book] = {};
        jsonData.chapters.forEach((chapterData, index) => {
          const chapterNum = index + 1;
          BIBLE_DATA[book][chapterNum] = chapterData.verses.map((v, i) => ({
            verse: i + 1,
            text: v
          }));
        });
        
        completed++;
        process.stdout.write(`\rDownloaded ${completed}/66 books...`);
        
        if (completed === books.length) {
          const outputPath = path.join(__dirname, 'assets', 'telugu_bible_full.json');
          fs.writeFileSync(outputPath, JSON.stringify(BIBLE_DATA));
          console.log('\n✅ Successfully downloaded and bundled full Telugu Bible to assets/telugu_bible_full.json!');
        }
      } catch (e) {
        console.error(`\nFailed to parse ${book}: ${e.message}`);
      }
    });
  }).on('error', (e) => {
    console.error(`\nFailed to download ${book}: ${e.message}`);
  });
});
