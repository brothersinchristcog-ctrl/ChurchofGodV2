const fs = require('fs');
let code = fs.readFileSync('c:/Users/user/CHURCHOFGOD/ChurchofGodV1/app/src/screens/admin/AdminPromiseCalendar.tsx', 'utf8');

// Add useTheme import
code = code.replace(/import \{ AdminTabContext \} from '\.\.\/\.\.\/context\/AdminTabContext';/, 
  "import { AdminTabContext } from '../../context/AdminTabContext';\nimport { useTheme } from '../../context/ThemeContext';\nimport { useMemo } from 'react';");

// Update component
code = code.replace(/export default function AdminPromiseCalendar\(\) \{/, 
  "export default function AdminPromiseCalendar() {\n  const { colors, isDark } = useTheme();\n  const styles = useMemo(() => getStyles(colors, isDark), [colors, isDark]);");

// Fix headerInner and center title
code = code.replace(/<LinearGradient colors=\{\['#1a2d5a', '#23314d'\]\} style=\{styles\.headerInner\}>\s*<TouchableOpacity onPress=\{openDrawer\} style=\{\{ padding: 4, marginRight: 10 \}\}>\s*<Menu size=\{26\} color=\"#fff\" \/>\s*<\/TouchableOpacity>\s*<Text style=\{styles\.headerTitle\}>Promise Calendar<\/Text>\s*<\/LinearGradient>/,
  `<LinearGradient colors={['#1a2d5a', '#23314d']} style={styles.headerInner}>
            <View style={{ flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'center', position: 'relative' }}>
              <TouchableOpacity onPress={openDrawer} style={{ position: 'absolute', left: 0, padding: 4, zIndex: 10 }}>
                <Menu size={26} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Promise Calendar</Text>
            </View>
          </LinearGradient>`);

// Fix LegendItem to use dynamic styles
code = code.replace(/function LegendItem\(\{ color, border, label \}: any\) \{/g, 
  "function LegendItem({ color, border, label, styles }: any) {");

code = code.replace(/<LegendItem color="#F0FDF4" border="#BBF7D0" label="Published" \/>/g, 
  "<LegendItem color={isDark ? '#064e3b' : '#F0FDF4'} border={isDark ? '#065f46' : '#BBF7D0'} label=\"Published\" styles={styles} />");
code = code.replace(/<LegendItem color="#FFFBEB" border="#FDE68A" label="Draft" \/>/g,
  "<LegendItem color={isDark ? '#78350f' : '#FFFBEB'} border={isDark ? '#92400e' : '#FDE68A'} label=\"Draft\" styles={styles} />");
code = code.replace(/<LegendItem color="#FEF2F2" border="#FECACA" label="Missing" \/>/g,
  "<LegendItem color={isDark ? '#7f1d1d' : '#FEF2F2'} border={isDark ? '#991b1b' : '#FECACA'} label=\"Missing\" styles={styles} />");
code = code.replace(/<LegendItem color="#1a2d5a" border="#1a2d5a" label="Today" \/>/g,
  "<LegendItem color={isDark ? '#FCD34D' : '#1a2d5a'} border={isDark ? '#FCD34D' : '#1a2d5a'} label=\"Today\" styles={styles} />");

// Now update styles
let stylesIndex = code.indexOf('const styles = StyleSheet.create({');
if (stylesIndex !== -1) {
  let stylesStr = code.substring(stylesIndex);
  stylesStr = stylesStr.replace(/const styles = StyleSheet\.create\(\{/, 'const getStyles = (colors: any, isDark: boolean) => StyleSheet.create({');
  
  // Replace colors
  stylesStr = stylesStr.replace(/backgroundColor: '#f0f2f7'/g, "backgroundColor: colors.background");
  stylesStr = stylesStr.replace(/backgroundColor: '#fff'/g, "backgroundColor: colors.card");
  stylesStr = stylesStr.replace(/borderColor: '#e5e7eb'/g, "borderColor: colors.border");
  stylesStr = stylesStr.replace(/color: '#111827'/g, "color: colors.text");
  stylesStr = stylesStr.replace(/backgroundColor: '#f3f4f6'/g, "backgroundColor: isDark ? '#1e293b' : '#f3f4f6'");
  stylesStr = stylesStr.replace(/backgroundColor: '#f9fafb'/g, "backgroundColor: isDark ? '#1e293b' : '#f9fafb'");
  
  // Fix calendar day colors
  stylesStr = stylesStr.replace(/cPub: \{ backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' \}/, "cPub: { backgroundColor: isDark ? '#064e3b' : '#F0FDF4', borderColor: isDark ? '#065f46' : '#BBF7D0' }");
  stylesStr = stylesStr.replace(/cDft: \{ backgroundColor: '#FFFBEB', borderColor: '#FDE68A' \}/, "cDft: { backgroundColor: isDark ? '#78350f' : '#FFFBEB', borderColor: isDark ? '#92400e' : '#FDE68A' }");
  stylesStr = stylesStr.replace(/cDftNum: \{ color: '#92400E' \}/, "cDftNum: { color: isDark ? '#fde68a' : '#92400E' }");
  stylesStr = stylesStr.replace(/cDftStatus: \{ color: '#D97706' \}/, "cDftStatus: { color: isDark ? '#fcd34d' : '#D97706' }");
  stylesStr = stylesStr.replace(/cMiss: \{ backgroundColor: '#FEF2F2', borderColor: '#FECACA' \}/, "cMiss: { backgroundColor: isDark ? '#7f1d1d' : '#FEF2F2', borderColor: isDark ? '#991b1b' : '#FECACA' }");
  stylesStr = stylesStr.replace(/cMissNum: \{ color: '#991B1B' \}/, "cMissNum: { color: isDark ? '#fecaca' : '#991B1B' }");
  stylesStr = stylesStr.replace(/cMissStatus: \{ color: '#DC2626' \}/, "cMissStatus: { color: isDark ? '#f87171' : '#DC2626' }");
  stylesStr = stylesStr.replace(/cToday: \{ backgroundColor: '#1a2d5a', borderColor: '#1a2d5a' \}/, "cToday: { backgroundColor: isDark ? '#FCD34D' : '#1a2d5a', borderColor: isDark ? '#FCD34D' : '#1a2d5a' }");
  stylesStr = stylesStr.replace(/cTodayNum: \{ color: '#FCD34D' \}/, "cTodayNum: { color: isDark ? '#1a2d5a' : '#FCD34D' }");
  stylesStr = stylesStr.replace(/cTodayStatus: \{ color: '#aac4e8' \}/, "cTodayStatus: { color: isDark ? '#5c4b1b' : '#aac4e8' }");

  stylesStr = stylesStr.replace(/color: '#6B7280'/g, "color: isDark ? '#94a3b8' : '#6B7280'");
  stylesStr = stylesStr.replace(/color: '#9CA3AF'/g, "color: isDark ? '#64748b' : '#9CA3AF'");
  stylesStr = stylesStr.replace(/borderColor: '#d1d5db'/g, "borderColor: isDark ? '#334155' : '#d1d5db'");
  
  // also fix importTxt color
  stylesStr = stylesStr.replace(/importTabTxtActive: \{ color: '#1a2d5a' \}/, "importTabTxtActive: { color: isDark ? '#60a5fa' : '#1a2d5a' }");
  stylesStr = stylesStr.replace(/progressTxt: \{ fontSize: 12, fontWeight: '700', color: '#1a2d5a' \}/, "progressTxt: { fontSize: 12, fontWeight: '700', color: isDark ? '#60a5fa' : '#1a2d5a' }");

  code = code.substring(0, stylesIndex) + stylesStr;
}

fs.writeFileSync('c:/Users/user/CHURCHOFGOD/ChurchofGodV1/app/src/screens/admin/AdminPromiseCalendar.tsx', code);
console.log('Patched');
