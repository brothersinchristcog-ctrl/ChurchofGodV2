const fs = require('fs');
const https = require('https');

const url = 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBKOARIhYXBwX2NvbXBhbmlvbl91c2VyX3VwbG9hZGVkX2ZpbGVzGmkKM3VzZXJfdXBsb2FkZWRfaHRtbF8wMDA2NTY1NzRjZjY1ZmQxMDMzODQ3YWE5ZDA5MzEyYxILEgcQ2qXoy8cDGAGSASQKCnByb2plY3RfaWQSFkIUMTAwODQ2MzQzNTk2OTIwODU1MDg&filename=&opi=89354086';
https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // Escape backticks and dollars for template literal
    const escaped = data.replace(//g, '\\').replace(/\$/g, '\\$');
    const tsContent = 'export const htmlContent = \\n' + escaped + '\\n;';
    fs.writeFileSync('app/src/screens/admin/stitchCelebrationsHtml.ts', tsContent);
    console.log('Conversion complete.');
  });
}).on('error', (err) => {
  console.error('Error:', err.message);
});
