import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput, SafeAreaView, Dimensions, ActivityIndicator, Image, Alert, Modal } from 'react-native';
import { ChevronRight, Search, SlidersHorizontal, Image as ImageIcon, Book, Eye, Edit2, MessageCircle, Check, Gift, Cake, Focus, Cross, ArrowLeft, Home, Calendar, Plus } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import {
  TODAY, CATEGORIES, fetchCelebrations, VERSES, THEMES, Member,
  occurrenceThisYear, stripTime, nextOccurrence, daysUntil, isToday, isPastThisYear, isThisWeek, isThisMonth, formatDate, yearsLabel, initials, paletteFor, catMeta, uniqueValues
} from './CODCelebsData';

import functions from '@react-native-firebase/functions';
import ViewShot from 'react-native-view-shot';

const { width } = Dimensions.get('window');

type Screen = 'dashboard' | 'list' | 'details' | 'customize' | 'theme' | 'add_theme' | 'verse' | 'upload' | 'preview' | 'whatsapp' | 'confirm';

export default function AdminCODCelebs() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [stack, setStack] = useState<Screen[]>(['dashboard']);
  const [category, setCategory] = useState<string | null>(null);
  const [filter, setFilter] = useState('upcoming');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('nearest');
  const [showFilters, setShowFilters] = useState(false);
  const [ministry, setMinistry] = useState('all');
  const [family, setFamily] = useState('all');
  const [age, setAge] = useState('all');
  const [year, setYear] = useState('all');
  
  const [memberId, setMemberId] = useState<string | null>(null);
  const [theme, setTheme] = useState<string | null>(null);
  const [verse, setVerse] = useState<{ref: string, text: string} | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  
  const [customThemes, setCustomThemes] = useState<{key: string, name: string, c: readonly [string, string, ...string[]], bgImage?: string}[]>([]);
  const [customThemeName, setCustomThemeName] = useState('');
  const [customThemeHex, setCustomThemeHex] = useState('');
  const [customThemeBgImage, setCustomThemeBgImage] = useState<string | null>(null);
  const [showColorDropdown, setShowColorDropdown] = useState(false);
  const [themeToDelete, setThemeToDelete] = useState<{key: string, name: string} | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sendingWhatsapp, setSendingWhatsapp] = useState(false);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const viewShotRef = React.useRef<ViewShot>(null);

  const currentScreen = stack[stack.length - 1];

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImage(result.assets[0].uri);
      back();
    }
  };

  const pickThemeBgImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setCustomThemeBgImage(result.assets[0].uri);
    }
  };

  useEffect(() => {
    AsyncStorage.getItem('cog_custom_themes').then(res => {
      if (res) setCustomThemes(JSON.parse(res));
    });

    fetchCelebrations().then(data => {
      setMembers(data);
      setLoading(false);
    }).catch(err => {
      console.error("Error fetching celebrations:", err);
      setLoading(false);
    });
  }, []);

  const go = (screen: Screen, patch: any = {}) => {
    if (patch.category !== undefined) setCategory(patch.category);
    if (patch.filter !== undefined) setFilter(patch.filter);
    if (patch.search !== undefined) setSearch(patch.search);
    if (patch.ministry !== undefined) setMinistry(patch.ministry);
    if (patch.family !== undefined) setFamily(patch.family);
    if (patch.age !== undefined) setAge(patch.age);
    if (patch.year !== undefined) setYear(patch.year);
    if (patch.showFilters !== undefined) setShowFilters(patch.showFilters);
    if (patch.sort !== undefined) setSort(patch.sort);
    if (patch.memberId !== undefined) setMemberId(patch.memberId);
    if (patch.theme !== undefined) setTheme(patch.theme);
    if (patch.verse !== undefined) setVerse(patch.verse);
    if (patch.image !== undefined) setImage(patch.image);
    if (patch.message !== undefined) setMessage(patch.message);
    
    setStack([...stack, screen]);
  };

  const back = () => {
    if (stack.length > 1) {
      setStack(stack.slice(0, -1));
    }
  };

  const resetTo = (screen: Screen) => {
    setStack([screen]);
  };

  const filteredMembers = useMemo(() => {
    let list = members.filter(m => m.category === category);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q));
    }
    if (ministry !== 'all') list = list.filter(m => m.ministry === ministry);
    if (family !== 'all') list = list.filter(m => m.family === family);

    if (category === 'birthday' && age !== 'all') {
      list = list.filter(m => {
        const memberAge = TODAY.getFullYear() - m.refYear;
        if (age === 'u18') return memberAge < 18;
        if (age === '18-40') return memberAge >= 18 && memberAge <= 40;
        if (age === '41-60') return memberAge >= 41 && memberAge <= 60;
        if (age === '60p') return memberAge > 60;
        return true;
      });
    }
    
    if (category === 'wedding' && year !== 'all') {
      list = list.filter(m => String(m.refYear) === year);
    }
    if (category === 'baptism' && year !== 'all') {
      list = list.filter(m => String(m.refYear) === year);
    }

    switch (filter) {
      case 'today': list = list.filter(isToday); break;
      case 'upcoming': list = list.filter(m => !isPastThisYear(m)); break;
      case 'week': list = list.filter(isThisWeek); break;
      case 'month': list = list.filter(isThisMonth); break;
      case 'past': list = list.filter(isPastThisYear); break;
      case 'all': default: break;
    }

    if (sort === 'nearest') {
      list = [...list].sort((a, b) => daysUntil(a) - daysUntil(b));
    } else {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    }
    return list;
  }, [category, filter, search, ministry, family, age, year, sort]);

  const defaultMessage = (m: Member) => {
    if(m.category==='birthday') return `Dear ${m.name.split(' ')[0]}, wishing you a joy-filled birthday surrounded by God's love and grace. May this new year of life be your best yet!`;
    if(m.category==='wedding') return `Congratulations ${m.name} on ${TODAY.getFullYear()-m.refYear} beautiful years of marriage! May your love continue to grow deeper, rooted in faith.`;
    if(m.category==='marriage') return `Celebrating ${m.name} today! ${TODAY.getFullYear()-m.refYear} years of covenant love — may the Lord continue to bless your journey together.`;
    return `Celebrating ${m.name}'s baptism anniversary today — ${TODAY.getFullYear()-m.refYear} years walking in the light of Christ. God bless you always!`;
  };

  const getCatIcon = (iconName: string, color: string) => {
    if (iconName === 'cake') return <Cake size={20} color={color} />;
    if (iconName === 'rings') return <Focus size={20} color={color} />; // approximation for rings
    if (iconName === 'dove') return <Focus size={20} color={color} />; // approximation for dove
    if (iconName === 'cross') return <Cross size={20} color={color} />;
    return <Cake size={20} color={color} />;
  }

  // ---- Renders ----
  const renderDashboard = () => {
    if (loading) {
      return (
        <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#1B2242" />
          <Text style={{ marginTop: 12, color: '#1B2242' }}>Fetching records from database...</Text>
        </View>
      );
    }
    const total = members.length;
    const todays = members.filter(isToday).length;
    const thisWeek = members.filter(isThisWeek).length;

    return (
      <View style={styles.screen}>
        <View style={[styles.heroCard, { backgroundColor: ['#1E2A63', '#2B3A80', '#37469B'][0] }]}>
          <Text style={styles.heroEyebrow}>This Season</Text>
          <Text style={styles.heroTitle}>Celebrations{"\n"}worth remembering</Text>
          <Text style={styles.heroSub}>Browse birthdays, anniversaries and baptisms across the parish, and prepare a beautiful wish in moments.</Text>
          
          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{total}</Text>
              <Text style={styles.heroStatLbl}>TOTAL RECORDS</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{todays}</Text>
              <Text style={styles.heroStatLbl}>TODAY</Text>
            </View>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{thisWeek}</Text>
              <Text style={styles.heroStatLbl}>THIS WEEK</Text>
            </View>
          </View>
        </View>
        
        <Text style={styles.sectionLabel}>Celebration Categories</Text>
        
        <View style={styles.catGrid}>
          {CATEGORIES.map((c, idx) => {
            const count = members.filter(m => m.category === c.key).length;
            const soon = members.filter(m => m.category === c.key && isThisWeek(m)).length;
            
            return (
              <TouchableOpacity key={c.key} style={[styles.catCard, { width: idx === 0 ? '100%' : '48%', backgroundColor: c.tint.replace('0.10', '0.25').replace('0.08', '0.20'), borderColor: c.grad[1], borderWidth: 1.5 }]} onPress={() => go('list', {
                category: c.key, filter: 'upcoming', search: '', ministry: 'all', family: 'all', age: 'all', year: 'all', showFilters: false, sort: 'nearest'
              })}>
                <View style={styles.catIconFrame}>
                  {getCatIcon(c.icon, c.grad[1])}
                </View>
                <Text style={styles.catName}>{c.label}</Text>
                <Text style={styles.catCount}>
                  <Text style={styles.catCountBold}>{count}</Text> members
                  {soon > 0 && <Text style={{color: c.grad[1]}}> · {soon} this week</Text>}
                </Text>
              </TouchableOpacity>
            )
          })}
        </View>
        <Text style={styles.footerNote}>Grace Community Church · Celebrations Module</Text>
      </View>
    )
  }

  const renderList = () => {
    const cat = catMeta(category!);
    
    return (
      <View style={styles.screen}>
        <Text style={styles.sectionLabel}>{cat?.label}</Text>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {['today', 'upcoming', 'week', 'month', 'past', 'all'].map(t => (
            <TouchableOpacity key={t} style={[styles.filterChip, filter === t && styles.filterChipActive]} onPress={() => setFilter(t)}>
              <Text style={[styles.filterChipText, filter === t && styles.filterChipTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1).replace('upcoming', 'Upcoming')}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={16} color="#5B6280" />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search by name…" 
              value={search} 
              onChangeText={setSearch} 
              placeholderTextColor="#5B6280"
            />
          </View>
          <TouchableOpacity style={[styles.iconBtn, showFilters && styles.iconBtnActive]} onPress={() => setShowFilters(!showFilters)}>
            <SlidersHorizontal size={17} color="#1E2A63" />
          </TouchableOpacity>
        </View>

        <Text style={styles.resultCount}>{filteredMembers.length} member{filteredMembers.length === 1 ? '' : 's'} found</Text>
        
        {filteredMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No celebrations match these filters yet.</Text>
          </View>
        ) : (
          filteredMembers.map(m => {
            const dateLbl = formatDate(m);
            const yrsLbl = yearsLabel(m.category, m.refYear);
            const [c1, c2] = paletteFor(m.id);
            return (
              <TouchableOpacity key={m.id} style={styles.memberCard} onPress={() => go('details', { memberId: m.id })}>
                <View style={[styles.avatar, { backgroundColor: [c1, c2][0] }]}>
                  <Text style={styles.avatarText}>{initials(m.name)}</Text>
                </View>
                <View style={styles.mcInfo}>
                  <Text style={styles.mcName}>{m.name}</Text>
                  <View style={styles.mcMeta}>
                    <View style={[styles.badge, { backgroundColor: cat!.grad[0] }]}>
                      <Text style={styles.badgeText}>{cat!.label.replace(' Anniversary', '')}</Text>
                    </View>
                    <Text style={styles.mcDate}>· {dateLbl}</Text>
                    <Text style={styles.mcYrs}>· {yrsLbl}</Text>
                  </View>
                </View>
                <View style={styles.mcActions}>
                  <TouchableOpacity style={styles.miniBtn}>
                    <MessageCircle size={15} color="#25D366" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => go('customize', { memberId: m.id })}>
                    <Gift size={15} color="#BE9A3A" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )
          })
        )}
      </View>
    );
  }

  const renderDetails = () => {
    const m = members.find(x => x.id === memberId)!;
    const cat = catMeta(m.category)!;
    const [c1, c2] = paletteFor(m.id);
    
    return (
      <View style={styles.screen}>
        <View style={styles.detailsHero}>
          <View style={[styles.avatarLg, { backgroundColor: [c1, c2][0] }]}>
            <Text style={styles.avatarLgText}>{initials(m.name)}</Text>
          </View>
          <View style={[styles.catTag, { backgroundColor: cat.grad[0] }]}>
            <Text style={styles.catTagText}>{cat.label}</Text>
          </View>
          <Text style={styles.detailsName}>{m.name}</Text>
        </View>
        
        <View style={styles.infoGrid}>
          <View style={styles.infoTile}>
            <Text style={styles.infoLbl}>Celebration Date</Text>
            <Text style={styles.infoVal}>{formatDate(m)}</Text>
          </View>
          <View style={styles.infoTile}>
            <Text style={styles.infoLbl}>{m.category === 'birthday' ? 'Turning' : 'Years Completed'}</Text>
            <Text style={styles.infoVal}>{TODAY.getFullYear() - m.refYear} {m.category === 'birthday' ? 'yrs old' : 'yrs'}</Text>
          </View>
          <View style={styles.infoTile}>
            <Text style={styles.infoLbl}>Ministry</Text>
            <Text style={styles.infoVal}>{m.ministry}</Text>
          </View>
          <View style={styles.infoTile}>
            <Text style={styles.infoLbl}>Family</Text>
            <Text style={styles.infoVal}>{m.family}</Text>
          </View>
          <View style={[styles.infoTile, styles.infoTileFull]}>
            <Text style={styles.infoLbl}>WhatsApp Number</Text>
            <Text style={styles.infoVal}>{m.phone}</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.primaryBtnGold} onPress={() => go('customize', { memberId: m.id, message: '', verse: null, theme: null, image: null })}>
          <Gift size={16} color="#3a2c05" />
          <Text style={styles.primaryBtnGoldText}>Prepare Wish</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtnOutline}>
          <MessageCircle size={16} color="#1E2A63" />
          <Text style={styles.primaryBtnOutlineText}>Message on WhatsApp</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderCustomize = () => {
    const m = members.find(x => x.id === memberId)!;
    const activeMsg = message || defaultMessage(m);
    const activeVerse = verse || VERSES[m.category][0];
    const activeTheme = theme ? THEMES.find(t => t.key === theme) : null;
    
    return (
      <View style={styles.screen}>
        <Text style={styles.sectionLabel}>Personalize the Greeting</Text>
        <Text style={styles.subtext}>for <Text style={{color: '#1B2242', fontWeight: 'bold'}}>{m.name}</Text></Text>
        
        <TouchableOpacity style={styles.optionRow} onPress={() => go('theme', {message: activeMsg, verse: activeVerse})}>
          <View style={styles.optionLeft}>
            <View style={styles.optionIcon}><Eye size={18} color="#BE9A3A" /></View>
            <View>
              <Text style={styles.optionTitle}>Choose Theme</Text>
              <Text style={styles.optionSub}>{activeTheme ? activeTheme.name : 'Select a greeting style'}</Text>
            </View>
          </View>
          <ChevronRight size={16} color="#5B6280" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionRow} onPress={() => go('upload', {message: activeMsg, verse: activeVerse})}>
          <View style={styles.optionLeft}>
            <View style={styles.optionIcon}><ImageIcon size={18} color="#BE9A3A" /></View>
            <View>
              <Text style={styles.optionTitle}>Photo</Text>
              <Text style={styles.optionSub}>{image ? image : "Use member's profile picture"}</Text>
            </View>
          </View>
          <ChevronRight size={16} color="#5B6280" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.optionRow} onPress={() => go('verse', {message: activeMsg, verse: activeVerse})}>
          <View style={styles.optionLeft}>
            <View style={styles.optionIcon}><Book size={18} color="#BE9A3A" /></View>
            <View>
              <Text style={styles.optionTitle}>Bible Verse</Text>
              <Text style={styles.optionSub}>{activeVerse.ref}</Text>
            </View>
          </View>
          <ChevronRight size={16} color="#5B6280" />
        </TouchableOpacity>
        
        <View style={styles.dividerLabel}>
          <Text style={styles.dividerLabelText}>GREETING MESSAGE</Text>
          <View style={styles.dividerLine} />
        </View>
        
        <TextInput 
          style={styles.msgInput} 
          multiline 
          value={activeMsg} 
          onChangeText={setMessage} 
        />
        
        <TouchableOpacity style={[styles.primaryBtnGold, {marginTop: 15}]} onPress={() => go('preview', {message: activeMsg, verse: activeVerse})}>
          <Eye size={16} color="#3a2c05" />
          <Text style={styles.primaryBtnGoldText}>Preview Greeting</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const saveCustomTheme = async () => {
    if (!customThemeName.trim()) {
      setValidationError('Please enter a name for your custom theme.');
      return;
    }
    if (!customThemeHex.trim() && !customThemeBgImage) {
      setValidationError('Please pick a background color or upload an image.');
      return;
    }

    let finalImageUri = customThemeBgImage || undefined;
    
    if (finalImageUri && finalImageUri.startsWith('file://') && FileSystem.documentDirectory) {
      try {
        const filename = finalImageUri.split('/').pop() || `theme_${Date.now()}.jpg`;
        const permanentUri = FileSystem.documentDirectory + filename;
        await FileSystem.copyAsync({
          from: finalImageUri,
          to: permanentUri
        });
        finalImageUri = permanentUri;
      } catch (err) {
        console.error("Error saving image permanently:", err);
      }
    }

    const hex = customThemeHex.trim() || '#1E2A63';
    const newTheme = {
      key: 'custom_' + Date.now(),
      name: customThemeName.trim(),
      c: [hex, '#1E2A63'] as any,
      bgImage: finalImageUri
    };
    const updated = [...customThemes, newTheme];
    setCustomThemes(updated);
    await AsyncStorage.setItem('cog_custom_themes', JSON.stringify(updated));
    setTheme(newTheme.key);
    back();
  };

  const deleteCustomTheme = (themeKey: string) => {
    const t = customThemes.find(x => x.key === themeKey);
    if (t) setThemeToDelete({key: t.key, name: t.name});
  };

  const confirmDeleteTheme = async () => {
    if (!themeToDelete) return;
    const updated = customThemes.filter(t => t.key !== themeToDelete.key);
    setCustomThemes(updated);
    await AsyncStorage.setItem('cog_custom_themes', JSON.stringify(updated));
    if (theme === themeToDelete.key) {
      setTheme(null);
    }
    setThemeToDelete(null);
    setDeleteSuccess(true);
    setTimeout(() => setDeleteSuccess(false), 3000);
  };

  const renderTheme = () => {
    const allThemes = [...THEMES, ...customThemes];
    return (
      <View style={styles.screen}>
        <Text style={styles.sectionLabel}>Choose Celebration Theme</Text>
        <View style={styles.themeGrid}>
          {allThemes.map(t => (
            <TouchableOpacity 
              key={t.key} 
              style={[styles.themeCard, theme === t.key && styles.themeCardSelected]} 
              onPress={() => { setTheme(t.key); back(); }}
              onLongPress={() => {
                if (t.key.startsWith('custom_')) {
                  deleteCustomTheme(t.key);
                }
              }}
            >
              <View style={[styles.themePreview, { backgroundColor: t.c[0] }]}>
                {t.bgImage && <Image source={{uri: t.bgImage}} style={StyleSheet.absoluteFill} resizeMode="cover" />}
              </View>
              <View style={styles.themeLabelContainer}>
                <Text style={styles.themeLabelText}>{t.name}</Text>
              </View>
              {theme === t.key && <View style={styles.themeCheck}><Check size={12} color="#fff" /></View>}
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.themeCard, { justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed' }]} onPress={() => {setCustomThemeName(''); setCustomThemeHex(''); setCustomThemeBgImage(null); go('add_theme');}}>
            <Plus size={24} color="#BE9A3A" />
            <Text style={{fontSize: 12, fontWeight: 'bold', color: '#BE9A3A', marginTop: 8}}>Custom Theme</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderAddTheme = () => {
    const SUGGESTED_COLORS = [
      '#FF6B6B', '#FF9F43', '#1DD1A1', '#0ABDE3', '#54A0FF', '#5F27CD', 
      '#EE5253', '#00D2D3', '#2E86DE', '#341F97', '#8395A7', '#222F3E',
      '#F368E0', '#FF9FF3', '#00A8FF', '#9C88FF', '#FBC531', '#4CD137',
      '#487EB0', '#E1B12C', '#44BD32', '#C23616', '#B33939', '#218C74',
      '#FDA7DF', '#D980FA', '#12CBC4', '#1289A7', '#ED4C67', '#B53471'
    ];
    return (
      <View style={styles.screen}>
        <Text style={styles.sectionLabel}>Add Custom Theme</Text>
        
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Theme Name</Text>
          <TextInput style={styles.input} placeholder="e.g. Ocean Blue" value={customThemeName} onChangeText={setCustomThemeName} />
        </View>
        
        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Background Color</Text>
          <TouchableOpacity style={[styles.input, {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'}]} onPress={() => setShowColorDropdown(!showColorDropdown)}>
            <Text style={{color: customThemeHex ? '#1B2242' : '#999', fontSize: 13.5}}>{customThemeHex || 'Select a color'}</Text>
            {customThemeHex ? <View style={{width: 24, height: 24, borderRadius: 6, backgroundColor: customThemeHex, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)'}} /> : null}
          </TouchableOpacity>
        </View>

        {showColorDropdown && (
          <ScrollView nestedScrollEnabled={true} style={{backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', marginBottom: 16, maxHeight: 240}}>
            {SUGGESTED_COLORS.map(c => (
              <TouchableOpacity key={c} style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(27,34,66,0.05)', backgroundColor: customThemeHex === c ? 'rgba(30,42,99,0.05)' : 'transparent'}} onPress={() => {setCustomThemeHex(c); setShowColorDropdown(false);}}>
                <Text style={{fontSize: 13.5, color: '#1B2242', fontWeight: customThemeHex === c ? 'bold' : 'normal'}}>{c}</Text>
                <View style={{width: 24, height: 24, borderRadius: 6, backgroundColor: c, borderWidth: 1, borderColor: 'rgba(0,0,0,0.1)'}} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>Background Image (Optional)</Text>
          <TouchableOpacity style={[styles.input, {height: 80, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 2}]} onPress={pickThemeBgImage}>
            {customThemeBgImage ? (
              <Image source={{uri: customThemeBgImage}} style={{width: '100%', height: '100%', borderRadius: 14}} resizeMode="cover" />
            ) : (
              <View style={{alignItems: 'center'}}>
                <ImageIcon size={24} color="#BE9A3A" />
                <Text style={{fontSize: 12, color: '#5B6280', marginTop: 4}}>Tap to upload</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.primaryBtnRoyal, {marginTop: 4}]} onPress={saveCustomTheme}>
          <Check size={16} color="#fff" />
          <Text style={styles.primaryBtnRoyalText}>Save & Apply</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const renderVerse = () => {
    const m = members.find(x => x.id === memberId)!;
    const vList = VERSES[m.category];
    return (
      <View style={styles.screen}>
        <Text style={styles.sectionLabel}>Select Bible Verse</Text>
        <Text style={styles.subtext}>Suggested for {catMeta(m.category)?.label.toLowerCase()}</Text>
        {vList.map((v, i) => (
          <TouchableOpacity key={i} style={[styles.verseCard, verse?.ref === v.ref && styles.verseCardSelected]} onPress={() => { setVerse(v); back(); }}>
            <Text style={styles.verseText}>"{v.text}"</Text>
            <Text style={styles.verseRef}>{v.ref}</Text>
          </TouchableOpacity>
        ))}
      </View>
    )
  }
  
  const renderUpload = () => {
    const m = members.find(x => x.id === memberId)!;
    return (
      <View style={styles.screen}>
        <Text style={styles.sectionLabel}>Upload Image</Text>
        <TouchableOpacity style={styles.uploadZone} onPress={pickImage}>
          <ImageIcon size={40} color="#BE9A3A" />
          <Text style={styles.uploadZoneText}>Tap to upload a custom photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.primaryBtnOutline, {marginTop: 14}]} onPress={() => {
          setImage(`https://ui-avatars.com/api/?name=${m.name.split(' ').join('+')}&size=400&background=random`);
          back();
        }}>
          <ImageIcon size={16} color="#1E2A63" />
          <Text style={styles.primaryBtnOutlineText}>Use {m.name.split(' ')[0]}'s Profile Picture</Text>
        </TouchableOpacity>
        
      </View>
    )
  }

  const renderPreview = () => {
    const m = members.find(x => x.id === memberId)!;
    const cat = catMeta(m.category)!;
    const allThemes = [...THEMES, ...customThemes];
    const t = theme ? allThemes.find(x => x.key === theme) : allThemes[2];
    
    return (
      <View style={styles.screen}>
        <Text style={styles.sectionLabel}>Greeting Preview</Text>
        
        <ViewShot ref={viewShotRef} options={{ format: 'jpg', quality: 0.9, result: 'base64' }} style={styles.greetingFrame}>
          <View style={[styles.greetingBg, { backgroundColor: t!.c[0] }]}>
            {t!.bgImage && (
              <>
                <Image source={{uri: t!.bgImage}} style={StyleSheet.absoluteFill} resizeMode="cover" />
                <View style={[StyleSheet.absoluteFill, {backgroundColor: 'rgba(0,0,0,0.45)'}]} />
              </>
            )}
            <Text style={styles.gCrest}>Grace Community Church</Text>
            {image && (image.startsWith('http') || image.startsWith('file')) && (
              <Image source={{ uri: image }} style={{ width: 120, height: 120, borderRadius: 60, alignSelf: 'center', marginVertical: 12, borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' }} />
            )}
            <Text style={styles.gTitle}>{cat.label}</Text>
            <Text style={styles.gName}>{m.name}</Text>
            <Text style={styles.gMsg}>{message}</Text>
            <Text style={styles.gVerse}>"{verse?.text.length! > 90 ? verse?.text.slice(0,90)+'…' : verse?.text}"{"\n"}— {verse?.ref}</Text>
            <Text style={styles.gSender}>Sent with love, Grace Community Church</Text>
          </View>
        </ViewShot>
        
        <View style={styles.secondaryRow}>
          <TouchableOpacity style={[styles.primaryBtnOutline, {flex: 1}]} onPress={() => back()}>
            <Edit2 size={16} color="#1E2A63" />
            <Text style={styles.primaryBtnOutlineText}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtnRoyal, {flex: 1}]} onPress={async () => {
            if (viewShotRef.current && viewShotRef.current.capture) {
              try {
                const b64 = await viewShotRef.current.capture();
                setImageBase64(b64);
              } catch (e) {
                console.warn(e);
              }
            }
            go('whatsapp');
          }}>
            <MessageCircle size={16} color="#fff" />
            <Text style={styles.primaryBtnRoyalText}>Next</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const handleSendWhatsapp = async () => {
    const m = members.find(x => x.id === memberId);
    if (!m) return;
    setSendingWhatsapp(true);
    try {
      let cleanPhone = m.phone.replace(/[^0-9]/g, '');
      if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
      
      const sendWish = functions().httpsCallable('sendWhatsAppWish');
      await sendWish({
        phoneNumber: cleanPhone,
        messageBody: message,
        verse: verse,
        imageBase64: imageBase64
      });
      
      setSendingWhatsapp(false);
      go('confirm');
    } catch (error: any) {
      setSendingWhatsapp(false);
      Alert.alert('Error', error.message || 'Failed to send WhatsApp message');
    }
  };

  const renderWhatsapp = () => {
    const m = members.find(x => x.id === memberId)!;
    const [c1, c2] = paletteFor(m.id);
    const allThemes = [...THEMES, ...customThemes];
    const t = theme ? allThemes.find(x => x.key === theme) : allThemes[2];
    
    return (
      <View style={styles.screen}>
        <Text style={styles.sectionLabel}>WhatsApp Preview</Text>
        <View style={styles.waHeader}>
          <View style={[styles.waAvatar, { backgroundColor: [c1, c2][0] }]}>
            <Text style={styles.waAvatarText}>{initials(m.name)}</Text>
          </View>
          <View>
            <Text style={styles.waNm}>{m.name}</Text>
            <Text style={styles.waSt}>{m.phone}</Text>
          </View>
        </View>
        <View style={styles.waBody}>
          <View style={styles.waBubble}>
            <View style={[{height: 120, borderRadius: 6}, {backgroundColor: t!.c[0]}]} />
            <Text style={styles.waCaption}>{message}</Text>
            <Text style={styles.waVerse}>"{verse?.ref}"</Text>
            <Text style={styles.waTime}>9:41 AM ✓✓</Text>
          </View>
        </View>
        
        <View style={styles.secondaryRow}>
          <TouchableOpacity style={[styles.primaryBtnOutline, {flex: 1}]} onPress={() => back()} disabled={sendingWhatsapp}>
            <Edit2 size={16} color="#1E2A63" />
            <Text style={styles.primaryBtnOutlineText}>Edit Message</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryBtnRoyal, {flex: 1}, sendingWhatsapp && {opacity: 0.7}]} onPress={handleSendWhatsapp} disabled={sendingWhatsapp}>
            {sendingWhatsapp ? <ActivityIndicator size="small" color="#fff" /> : <MessageCircle size={16} color="#fff" />}
            <Text style={styles.primaryBtnRoyalText}>{sendingWhatsapp ? 'Sending...' : 'Send via WhatsApp'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  const renderConfirm = () => {
    const m = members.find(x => x.id === memberId)!;
    return (
      <View style={styles.screen}>
        <View style={styles.confirmWrap}>
          <View style={[styles.confirmCheck, { backgroundColor: ['#E7C767', '#BE9A3A'][0] }]}>
            <Check size={40} color="#fff" strokeWidth={3} />
          </View>
          <Text style={styles.confirmTitle}>Greeting Sent!</Text>
          <Text style={styles.confirmSub}>Your {catMeta(m.category)?.label.toLowerCase()} wish for <Text style={{fontWeight: 'bold'}}>{m.name}</Text> has been sent via WhatsApp.</Text>
          
          <TouchableOpacity style={styles.primaryBtnRoyal} onPress={() => resetTo('dashboard')}>
            <Home size={16} color="#fff" />
            <Text style={styles.primaryBtnRoyalText}>Back to Celebrations</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  // ---- App Bar ----
  const getAppTitles = () => {
    switch (currentScreen) {
      case 'dashboard': return { eb: 'Church Companion', ti: 'Celebrations' };
      case 'list': return { eb: 'Celebrations', ti: category ? catMeta(category)?.label : '' };
      case 'details': return { eb: 'Celebration', ti: 'Member Details' };
      case 'customize': return { eb: 'Prepare Wish', ti: 'Personalize' };
      case 'theme': return { eb: 'Prepare Wish', ti: 'Choose Theme' };
      case 'add_theme': return { eb: 'Prepare Wish', ti: 'Custom Theme' };
      case 'verse': return { eb: 'Prepare Wish', ti: 'Bible Verse' };
      case 'upload': return { eb: 'Prepare Wish', ti: 'Upload Photo' };
      case 'preview': return { eb: 'Prepare Wish', ti: 'Preview' };
      case 'whatsapp': return { eb: 'Prepare Wish', ti: 'WhatsApp' };
      case 'confirm': return { eb: 'Celebrations', ti: 'Sent' };
      default: return { eb: 'Church Companion', ti: 'Celebrations' };
    }
  }
  
  const { eb, ti } = getAppTitles();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.appbar}>
        {stack.length > 1 ? (
          <TouchableOpacity style={styles.backBtn} onPress={back}>
            <ArrowLeft size={20} color="#1E2A63" />
          </TouchableOpacity>
        ) : (
          <View style={[styles.backBtn, {opacity: 0}]} />
        )}
        <View style={styles.titleContainer}>
          <Text style={styles.eyebrow}>{eb}</Text>
          <Text style={styles.appTitle}>{ti}</Text>
        </View>
      </View>
      
      <ScrollView style={styles.screenRoot} contentContainerStyle={{paddingBottom: 100}}>
        {currentScreen === 'dashboard' && renderDashboard()}
        {currentScreen === 'list' && renderList()}
        {currentScreen === 'details' && renderDetails()}
        {currentScreen === 'customize' && renderCustomize()}
        {currentScreen === 'theme' && renderTheme()}
        {currentScreen === 'add_theme' && renderAddTheme()}
        {currentScreen === 'verse' && renderVerse()}
        {currentScreen === 'upload' && renderUpload()}
        {currentScreen === 'preview' && renderPreview()}
        {currentScreen === 'whatsapp' && renderWhatsapp()}
        {currentScreen === 'confirm' && renderConfirm()}
      </ScrollView>

      <Modal visible={!!themeToDelete} transparent={true} animationType="fade">
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'}}>
          <View style={{width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center'}}>
            <View style={{width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(220,53,69,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16}}>
              <Cross size={32} color="#dc3545" />
            </View>
            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1B2242', marginBottom: 8}}>Delete Theme?</Text>
            <Text style={{fontSize: 14, color: '#5B6280', textAlign: 'center', marginBottom: 24}}>
              Are you sure you want to delete the "{themeToDelete?.name}" theme? This action cannot be undone.
            </Text>
            <View style={{flexDirection: 'row', width: '100%', justifyContent: 'space-between'}}>
              <TouchableOpacity style={{flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#f1f3f5', marginRight: 8, alignItems: 'center'}} onPress={() => setThemeToDelete(null)}>
                <Text style={{fontSize: 15, fontWeight: 'bold', color: '#1B2242'}}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#dc3545', marginLeft: 8, alignItems: 'center'}} onPress={confirmDeleteTheme}>
                <Text style={{fontSize: 15, fontWeight: 'bold', color: '#fff'}}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!validationError} transparent={true} animationType="fade">
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center'}}>
          <View style={{width: '80%', backgroundColor: '#fff', borderRadius: 20, padding: 24, alignItems: 'center'}}>
            <View style={{width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(243,156,18,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 16}}>
              <MessageCircle size={28} color="#f39c12" />
            </View>
            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1B2242', marginBottom: 8}}>Missing Info</Text>
            <Text style={{fontSize: 14, color: '#5B6280', textAlign: 'center', marginBottom: 24}}>
              {validationError}
            </Text>
            <TouchableOpacity style={{width: '100%', paddingVertical: 14, borderRadius: 12, backgroundColor: '#1E2A63', alignItems: 'center'}} onPress={() => setValidationError(null)}>
              <Text style={{fontSize: 15, fontWeight: 'bold', color: '#fff'}}>Got it</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {deleteSuccess && (
        <View style={{position: 'absolute', bottom: 40, left: 20, right: 20, backgroundColor: '#1ABC9C', padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: {width: 0, height: 4}, elevation: 5}}>
          <View style={{width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', marginRight: 12}}>
            <Check size={18} color="#fff" />
          </View>
          <Text style={{color: '#fff', fontSize: 15, fontWeight: '600'}}>Theme successfully deleted</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7EF' },
  appbar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingBottom: 14, paddingTop: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', alignItems: 'center', justifyContent: 'center', marginRight: 12, shadowColor: '#1E2A63', shadowOffset: {width: 0, height: 6}, shadowOpacity: 0.08, shadowRadius: 20 },
  titleContainer: { flex: 1 },
  eyebrow: { fontSize: 10.5, letterSpacing: 1.6, textTransform: 'uppercase', color: '#BE9A3A', fontWeight: 'bold', marginBottom: 2 },
  appTitle: { fontSize: 19, fontWeight: 'bold', color: '#1E2A63' },
  screenRoot: { flex: 1 },
  screen: { paddingHorizontal: 18, paddingTop: 2 },
  
  // Dashboard
  heroCard: { borderRadius: 30, padding: 22, paddingTop: 26, paddingBottom: 24, overflow: 'hidden', shadowColor: '#1E2A63', shadowOffset: {width: 0, height: 16}, shadowOpacity: 0.3, shadowRadius: 34, marginTop: 6 },
  heroEyebrow: { fontSize: 10.5, letterSpacing: 2, textTransform: 'uppercase', color: '#E7C767', fontWeight: 'bold', marginBottom: 8 },
  heroTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.78)', lineHeight: 20, maxWidth: 280 },
  heroStats: { flexDirection: 'row', marginTop: 18 },
  heroStat: { marginRight: 18 },
  heroStatNum: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  heroStatLbl: { fontSize: 10.5, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.5 },
  sectionLabel: { fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: '#5B6280', fontWeight: 'bold', marginHorizontal: 2, marginTop: 26, marginBottom: 12 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  catCard: { width: '48%', borderRadius: 22, padding: 16, marginBottom: 14, backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.6)', overflow: 'hidden' },
  catCardTint: { ...StyleSheet.absoluteFillObject, opacity: 0.5 },
  catIconFrame: { marginBottom: 14 },
  catName: { fontSize: 15.5, fontWeight: 'bold', color: '#1B2242', marginBottom: 4 },
  catCount: { fontSize: 11.5, color: '#5B6280' },
  catCountBold: { color: '#1E2A63', fontWeight: 'bold' },
  footerNote: { textAlign: 'center', fontSize: 10.5, color: '#5B6280', opacity: 0.7, marginTop: 26, letterSpacing: 0.3 },
  
  // List
  filterScroll: { flexDirection: 'row', paddingBottom: 14, paddingTop: 4 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', marginRight: 8 },
  filterChipActive: { backgroundColor: '#1E2A63', borderColor: 'transparent' },
  filterChipText: { fontSize: 12.5, fontWeight: 'bold', color: '#5B6280' },
  filterChipTextActive: { color: '#fff' },
  searchRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  searchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', borderRadius: 16, paddingHorizontal: 14, height: 40, marginRight: 8 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 13.5, color: '#1B2242' },
  iconBtn: { width: 40, height: 40, borderRadius: 16, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { borderColor: '#BE9A3A' },
  resultCount: { fontSize: 12, color: '#5B6280', marginHorizontal: 2, marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyStateText: { fontSize: 13, color: '#5B6280', textAlign: 'center' },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)', borderRadius: 22, padding: 12, marginBottom: 10 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  mcInfo: { flex: 1, marginLeft: 12 },
  mcName: { fontSize: 15, fontWeight: 'bold', color: '#1B2242', marginBottom: 3 },
  mcMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 6 },
  badgeText: { fontSize: 9.5, fontWeight: 'bold', color: '#fff', textTransform: 'uppercase' },
  mcDate: { fontSize: 11, color: '#BE9A3A', fontWeight: 'bold' },
  mcYrs: { fontSize: 11, color: '#5B6280' },
  mcActions: { flexDirection: 'column', marginLeft: 10 },
  miniBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  
  // Details
  detailsHero: { alignItems: 'center', paddingTop: 16, paddingBottom: 6 },
  avatarLg: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,255,255,0.6)', marginBottom: 14 },
  avatarLgText: { color: '#fff', fontSize: 30, fontWeight: 'bold' },
  catTag: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, marginBottom: 4 },
  catTagText: { fontSize: 11, fontWeight: 'bold', color: '#fff' },
  detailsName: { fontSize: 22, fontWeight: 'bold', color: '#1B2242' },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 20 },
  infoTile: { width: '48%', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', borderRadius: 16, padding: 14, marginBottom: 10 },
  infoTileFull: { width: '100%' },
  infoLbl: { fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: '#5B6280', fontWeight: 'bold', marginBottom: 5 },
  infoVal: { fontSize: 14, fontWeight: 'bold', color: '#1B2242' },
  primaryBtnGold: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#E7C767', paddingVertical: 15, borderRadius: 16, marginTop: 22 },
  primaryBtnGoldText: { fontSize: 14, fontWeight: 'bold', color: '#3a2c05', marginLeft: 8 },
  primaryBtnOutline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#1E2A63', paddingVertical: 15, borderRadius: 16, marginTop: 10 },
  primaryBtnOutlineText: { fontSize: 14, fontWeight: 'bold', color: '#1E2A63', marginLeft: 8 },
  primaryBtnRoyal: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1E2A63', paddingVertical: 15, borderRadius: 16, marginTop: 10 },
  primaryBtnRoyalText: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginLeft: 8 },
  secondaryRow: { flexDirection: 'row', gap: 10, marginTop: 16 },

  // Customize
  subtext: { fontSize: 12.5, color: '#5B6280', marginHorizontal: 2, marginBottom: 16, marginTop: -6 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', borderRadius: 16, padding: 14, marginBottom: 10 },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  optionIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(190,154,58,0.16)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  optionTitle: { fontSize: 13.5, fontWeight: 'bold', color: '#1B2242' },
  optionSub: { fontSize: 11.5, color: '#5B6280', marginTop: 2 },
  dividerLabel: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 2, marginTop: 22, marginBottom: 12 },
  dividerLabelText: { fontSize: 11, letterSpacing: 1.5, color: '#5B6280', fontWeight: 'bold', marginRight: 10 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(27,34,66,0.09)' },
  msgInput: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', borderRadius: 16, padding: 14, fontSize: 13.5, color: '#1B2242', minHeight: 88, textAlignVertical: 'top' },
  fieldBlock: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: 'bold', color: '#1E2A63', marginBottom: 6, marginLeft: 2 },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', borderRadius: 16, paddingHorizontal: 14, height: 48, fontSize: 13.5, color: '#1B2242' },

  // Theme
  themeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  themeCard: { width: '48%', borderRadius: 22, overflow: 'hidden', marginBottom: 14, borderWidth: 2, borderColor: 'transparent' },
  themeCardSelected: { borderColor: '#BE9A3A' },
  themePreview: { height: 96 },
  themeLabelContainer: { padding: 10, backgroundColor: '#FFFFFF' },
  themeLabelText: { fontSize: 12, fontWeight: 'bold', color: '#1B2242' },
  themeCheck: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: '#BE9A3A', alignItems: 'center', justifyContent: 'center' },

  // Verse
  verseCard: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: 'rgba(27,34,66,0.09)', borderLeftWidth: 4, borderLeftColor: '#E7C767', borderRadius: 22, padding: 16, marginBottom: 12 },
  verseCardSelected: { borderLeftColor: '#1E2A63', backgroundColor: 'rgba(55,70,155,0.06)' },
  verseText: { fontStyle: 'italic', fontSize: 15.5, lineHeight: 22, color: '#1B2242', marginBottom: 8 },
  verseRef: { fontSize: 11.5, fontWeight: 'bold', color: '#1E2A63', letterSpacing: 0.3 },

  // Upload
  uploadZone: { borderWidth: 2, borderColor: 'rgba(27,34,66,0.09)', borderStyle: 'dashed', borderRadius: 22, paddingVertical: 38, paddingHorizontal: 20, alignItems: 'center', backgroundColor: '#FFFFFF', marginTop: 10 },
  uploadZoneText: { fontSize: 13, color: '#5B6280', marginTop: 10 },
  uploadZoneHint: { fontSize: 11, color: '#5B6280', opacity: 0.7, marginTop: 4 },
  sampleGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 16 },
  sampleThumb: { width: '31%', aspectRatio: 1, borderRadius: 10, overflow: 'hidden', marginBottom: 10, borderWidth: 2, borderColor: 'transparent' },
  sampleThumbSelected: { borderColor: '#BE9A3A' },

  // Preview
  greetingFrame: { borderRadius: 30, overflow: 'hidden', marginTop: 10 },
  greetingBg: { padding: 26, alignItems: 'center', minHeight: 400, justifyContent: 'center' },
  gCrest: { fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', color: '#fff', opacity: 0.85, marginBottom: 10 },
  gTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  gName: { fontSize: 17, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  gMsg: { fontSize: 12.5, lineHeight: 18, color: '#fff', textAlign: 'center', marginBottom: 12 },
  gVerse: { fontStyle: 'italic', fontSize: 13, color: '#fff', textAlign: 'center', opacity: 0.9 },
  gSender: { fontSize: 10.5, color: '#fff', opacity: 0.75, marginTop: 14 },

  // WhatsApp
  waHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#075E54', padding: 12, borderTopLeftRadius: 16, borderTopRightRadius: 16, marginTop: 8 },
  waAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  waAvatarText: { color: '#fff', fontSize: 13 },
  waNm: { fontSize: 13.5, fontWeight: 'bold', color: '#fff' },
  waSt: { fontSize: 10.5, color: '#fff', opacity: 0.8 },
  waBody: { backgroundColor: '#E5DDD5', padding: 16, borderBottomLeftRadius: 16, borderBottomRightRadius: 16 },
  waBubble: { backgroundColor: '#fff', borderRadius: 10, padding: 8, maxWidth: '90%', alignSelf: 'flex-end', shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.15, shadowRadius: 2 },
  waCaption: { fontSize: 12.5, color: '#111', marginTop: 8 },
  waVerse: { fontStyle: 'italic', fontSize: 12.5, color: '#333', marginTop: 4 },
  waTime: { fontSize: 10, color: '#8b8b8b', textAlign: 'right', marginTop: 4 },

  // Confirm
  confirmWrap: { alignItems: 'center', paddingTop: 70 },
  confirmCheck: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  confirmTitle: { fontSize: 21, fontWeight: 'bold', color: '#1B2242', marginBottom: 8 },
  confirmSub: { fontSize: 13.5, color: '#5B6280', textAlign: 'center', maxWidth: 260, lineHeight: 20, marginBottom: 30 }
});
