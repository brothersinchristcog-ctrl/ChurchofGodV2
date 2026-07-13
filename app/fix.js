const fs = require('fs');
let file = 'src/screens/admin/AdminCODCelebs.tsx';
let c = fs.readFileSync(file, 'utf8');
c = c.replace(/\\`/g, '`');
c = c.replace(/\\\$/g, '$');
fs.writeFileSync(file, c);
