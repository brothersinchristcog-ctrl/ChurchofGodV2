const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'screens', 'ProfileScreen.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Imports
content = content.replace(
  /import \{\s*ChevronRight,/,
  `import {\n  Star,\n  MapPin,\n  Calendar,\n  ChevronRight,`
);

// 2. JSX Replacements
const oldHero = `      {/* ── Hero Section (Navy) ── */}
      <View style={styles.heroSection}>
        <View style={styles.headerTop}>
          <View style={{ width: 40 }} />
          <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
             <Text style={styles.themeToggleText}>{isDark ? '🌙 Dark' : '☀️ Light'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.avatarContainer}>
          {localPhotoUrl ? (
            <Image source={{ uri: localPhotoUrl }} style={styles.avatarImg} />
          ) : (
            <View style={styles.avatarCircle}>
               <Text style={styles.avatarText}>{getInitials(member?.name || user?.displayName || 'User')}</Text>
            </View>
          )}
          <View style={styles.verifiedBadge}>
            <Text style={{ fontSize: 10 }}>✨</Text>
          </View>
        </View>

        <View style={styles.userInfo}>
          <Text style={styles.userName}>{member?.name || user?.displayName || 'Beloved Member'}</Text>
          <Text style={styles.userSub}>
            Church of GOD{member?.mailingCity ? \`, \${member.mailingCity}\` : ''} · 
            Member since {member?.joinDate ? new Date(member.joinDate).getFullYear() : '2024'}
          </Text>
          
          <View style={styles.badgeRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Telugu</Text>
            </View>
            {member?.mailingCity && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{member.mailingCity}</Text>
              </View>
            )}
            <View style={[styles.badge, styles.badgeActive]}>
              <Text style={styles.badgeText}>🙏 {member?.userType || 'Active member'}</Text>
            </View>
          </View>
        </View>
      </View>`;

const newHero = `      {/* 🔥 Hero Section (Navy) 🔥 */}
      <View style={[styles.heroSection, { backgroundColor: isDark ? '#0a1020' : '#0a192f' }]}>
        {/* Background circular outlines */}
        <View style={styles.bgCircle1} />
        <View style={styles.bgCircle2} />
        
        <View style={[styles.headerTop, { zIndex: 10 }]}>
          <View style={{ width: 40 }} />
          <TouchableOpacity style={styles.themeToggle} onPress={toggleTheme}>
             <Text style={styles.themeToggleText}>{isDark ? '🌙 Dark' : '☀️ Light'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.avatarContainer, { zIndex: 10 }]}>
          <View style={styles.avatarGlowWrapper}>
            {localPhotoUrl ? (
              <Image source={{ uri: localPhotoUrl }} style={styles.avatarImg} />
            ) : (
              <View style={styles.avatarCircle}>
                 <Text style={styles.avatarText}>{getInitials(member?.name || user?.displayName || 'User')}</Text>
              </View>
            )}
            <View style={styles.verifiedBadge}>
              <Star size={16} color="#0f172a" fill="#0f172a" />
            </View>
          </View>
        </View>

        <View style={[styles.userInfo, { zIndex: 10 }]}>
          <View style={styles.parishMemberRow}>
            <View style={styles.goldLine} />
            <Text style={styles.parishMemberText}>PARISH MEMBER</Text>
            <View style={styles.goldLine} />
          </View>
          
          <Text style={styles.userName}>{member?.name || user?.displayName || 'Beloved Member'}</Text>
          
          <View style={styles.adminBadge}>
            <Shield size={14} color="#0f172a" fill="#0f172a" />
            <Text style={styles.adminBadgeText}>{member?.userType === 'Admin' ? 'Admin' : 'Member'}</Text>
          </View>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.statIconBox}>
                <MapPin size={16} color="#FCD34D" />
              </View>
              <Text style={styles.statValue} numberOfLines={1}>{member?.mailingCity || 'Unknown'}</Text>
              <Text style={styles.statLabel}>VILLAGE</Text>
            </View>
            
            <View style={styles.statBox}>
              <View style={styles.statIconBox}>
                <Text style={{ color: '#FCD34D', fontSize: 14, fontWeight: 'bold' }}>文</Text>
              </View>
              <Text style={styles.statValue} numberOfLines={1}>Telugu</Text>
              <Text style={styles.statLabel}>LANGUAGE</Text>
            </View>

            <View style={styles.statBox}>
              <View style={styles.statIconBox}>
                <Calendar size={16} color="#FCD34D" />
              </View>
              <Text style={styles.statValue} numberOfLines={1}>{member?.joinDate ? new Date(member.joinDate).getFullYear() : '2024'}</Text>
              <Text style={styles.statLabel}>MEMBER SINCE</Text>
            </View>
          </View>

          <View style={styles.churchBrandRow}>
            <Shield size={16} color="#FCD34D" />
            <Text style={styles.churchBrandText}>CHURCH OF GOD</Text>
          </View>
        </View>
        
        {/* Effective Line Curve at bottom matching other screens */}
        <View style={styles.bottomCurveLine} />
      </View>`;

content = content.replace(oldHero, newHero);

// 3. Styles Replace
const oldStyles = `  // Hero Section
    heroSection: { 
      backgroundColor: '#1a2d5a', 
      paddingTop: Platform.OS === 'ios' ? 60 : 20, 
      paddingBottom: 40,
      borderBottomLeftRadius: 30,
      borderBottomRightRadius: 30,
      alignItems: 'center'
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center', alignSelf: 'stretch' },
    themeToggle: { backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    themeToggleText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  
    avatarContainer: { alignItems: 'center', marginTop: 10 },
    avatarCircle: { 
      width: 90, height: 90, borderRadius: 45, backgroundColor: '#c0392b', 
      justifyContent: 'center', alignItems: 'center', borderWidth: 4, borderColor: '#FCD34D' 
    },
    avatarImg: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: '#FCD34D' },
    avatarText: { color: '#fff', fontSize: 32, fontWeight: '800' },
    verifiedBadge: { 
      position: 'absolute', 
      bottom: 0, 
      right: -5, 
      backgroundColor: '#FCD34D', 
      width: 24, 
      height: 24, 
      borderRadius: 12, 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderWidth: 2, 
      borderColor: '#1a2d5a',
      elevation: 4,
      shadowColor: '#000',
      shadowOpacity: 0.2,
      shadowRadius: 3
    },
  
    userInfo: { alignItems: 'center', marginTop: 15 },
    userName: { fontSize: 22, fontWeight: '800', color: '#fff' },
    userSub: { fontSize: 12, color: '#aac4e8', marginTop: 4, textAlign: 'center' },
    badgeRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    badge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    badgeActive: { backgroundColor: '#FCD34D' },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },`;

const newStyles = `  // Hero Section
    heroSection: { 
      paddingTop: Platform.OS === 'ios' ? 60 : 30, 
      paddingBottom: 30,
      borderBottomLeftRadius: 35,
      borderBottomRightRadius: 35,
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden'
    },
    bgCircle1: {
      position: 'absolute',
      width: width * 1.5,
      height: width * 1.5,
      borderRadius: width * 0.75,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.05)',
      top: -width * 0.3,
      left: -width * 0.25,
      zIndex: 1
    },
    bgCircle2: {
      position: 'absolute',
      width: width * 1.2,
      height: width * 1.2,
      borderRadius: width * 0.6,
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.03)',
      top: -width * 0.1,
      left: -width * 0.1,
      zIndex: 1
    },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, alignItems: 'center', alignSelf: 'stretch' },
    themeToggle: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    themeToggleText: { color: '#fff', fontSize: 10, fontWeight: '800' },
  
    avatarContainer: { alignItems: 'center', marginTop: 15 },
    avatarGlowWrapper: {
      position: 'relative',
      borderRadius: 65,
      padding: 4,
      backgroundColor: 'transparent',
      shadowColor: '#FCD34D',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 20,
      elevation: 15,
    },
    avatarCircle: { 
      width: 110, height: 110, borderRadius: 55, backgroundColor: '#c0392b', 
      justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#FCD34D' 
    },
    avatarImg: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#FCD34D' },
    avatarText: { color: '#fff', fontSize: 36, fontWeight: '800' },
    verifiedBadge: { 
      position: 'absolute', 
      bottom: 5, 
      right: 0, 
      backgroundColor: '#FCD34D', 
      width: 32, 
      height: 32, 
      borderRadius: 16, 
      justifyContent: 'center', 
      alignItems: 'center', 
      borderWidth: 3, 
      borderColor: '#0a192f',
      elevation: 5,
    },
  
    userInfo: { alignItems: 'center', marginTop: 25, width: '100%', paddingHorizontal: 20 },
    parishMemberRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    goldLine: { height: 1, width: 30, backgroundColor: '#FCD34D', opacity: 0.7 },
    parishMemberText: { color: '#FCD34D', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
    
    userName: { 
      fontSize: 26, 
      fontWeight: 'bold', 
      color: '#fff', 
      fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
      marginBottom: 12,
      textAlign: 'center'
    },
    
    adminBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#FCD34D',
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
      gap: 6,
      marginBottom: 30,
      shadowColor: '#FCD34D',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.5,
      shadowRadius: 10,
      elevation: 5,
    },
    adminBadgeText: { color: '#0f172a', fontSize: 13, fontWeight: '800' },
    
    statsRow: { flexDirection: 'row', gap: 12, alignSelf: 'stretch', justifyContent: 'space-between', marginBottom: 25 },
    statBox: { 
      flex: 1, 
      backgroundColor: '#111e36', 
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.08)',
      borderRadius: 16, 
      paddingVertical: 16,
      paddingHorizontal: 8,
      alignItems: 'center' 
    },
    statIconBox: { 
      width: 36, height: 36, borderRadius: 18, 
      backgroundColor: 'rgba(255, 255, 255, 0.05)', 
      justifyContent: 'center', alignItems: 'center',
      marginBottom: 8
    },
    statValue: { color: '#fff', fontSize: 13, fontWeight: '800', marginBottom: 4, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif' },
    statLabel: { color: '#64748b', fontSize: 9, fontWeight: '700', letterSpacing: 1 },
    
    churchBrandRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    churchBrandText: { color: '#FCD34D', fontSize: 13, fontWeight: '800', letterSpacing: 1.5 },
    
    bottomCurveLine: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: 4,
      backgroundColor: '#3b82f6',
      shadowColor: '#60a5fa',
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 8,
    },`;

content = content.replace(oldStyles, newStyles);

fs.writeFileSync(filePath, content);
console.log('Profile UI Updated!');
