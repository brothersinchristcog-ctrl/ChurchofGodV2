const fs = require('fs');
let file = 'src/screens/admin/AdminCODCelebs.tsx';
let c = fs.readFileSync(file, 'utf8');

c = c.replace(/import \{ LinearGradient \} from 'expo-linear-gradient';\n/g, '');

c = c.replace(/<LinearGradient colors=\{([^}]+)\} style=\{([^}]+)\} \/>/g, '<View style={[$2, { backgroundColor: $1[0] }]} />');

c = c.replace(/<LinearGradient colors=\{([^}]+)\} style=\{([^}]+)\}>/g, '<View style={[$2, { backgroundColor: $1[0] }]}>');

c = c.replace(/<\/LinearGradient>/g, '</View>');

fs.writeFileSync(file, c);
