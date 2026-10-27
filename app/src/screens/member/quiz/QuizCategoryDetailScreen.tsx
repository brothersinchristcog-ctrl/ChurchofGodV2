import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { 
  ChevronLeft, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Play, 
  Layers, 
  BookOpen, 
  Scroll, 
  BookMarked, 
  Users, 
  Shield, 
  Heart, 
  Sparkles, 
  Feather, 
  CheckSquare, 
  Sun, 
  Church, 
  Globe, 
  Flame, 
  Compass, 
  Trophy,
  Award
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../../context/ThemeContext';
import BibleQuizService from '../../../services/BibleQuizService';
import { QuizCategory, QuizSubcategory, QuizFilterCriteria, DifficultyLevel } from '../../../types/quiz';
import AiQuizLoadingModal from '../../../components/AiQuizLoadingModal';

export default function QuizCategoryDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { isDark } = useTheme();

  const category: QuizCategory = route.params?.category;

  const [selectedSubId, setSelectedSubId] = useState<string>('all');
  const [expandedSubIds, setExpandedSubIds] = useState<{ [key: string]: boolean }>({});
  const [difficulty, setDifficulty] = useState<DifficultyLevel | 'mixed'>('mixed');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(false);

  if (!category) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
        <View style={{ padding: 20 }}>
          <Text style={{ color: isDark ? '#ffffff' : '#000000' }}>Category not found</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 10 }}>
            <Text style={{ color: '#7c3aed' }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderIcon = (iconName: string, size: number = 18, color: string = '#7c3aed') => {
    switch (iconName) {
      case 'Scroll': return <Scroll size={size} color={color} />;
      case 'BookMarked': return <BookMarked size={size} color={color} />;
      case 'Users': return <Users size={size} color={color} />;
      case 'Shield': return <Shield size={size} color={color} />;
      case 'Flame': return <Flame size={size} color={color} />;
      case 'Compass': return <Compass size={size} color={color} />;
      case 'Heart': return <Heart size={size} color={color} />;
      case 'Sparkles': return <Sparkles size={size} color={color} />;
      case 'Feather': return <Feather size={size} color={color} />;
      case 'CheckSquare': return <CheckSquare size={size} color={color} />;
      case 'Sun': return <Sun size={size} color={color} />;
      case 'Church': return <Church size={size} color={color} />;
      case 'Globe': return <Globe size={size} color={color} />;
      case 'Award': return <Award size={size} color={color} />;
      case 'Trophy': return <Trophy size={size} color={color} />;
      default: return <BookOpen size={size} color={color} />;
    }
  };

  const toggleExpand = (subId: string) => {
    setExpandedSubIds(prev => ({
      ...prev,
      [subId]: !prev[subId]
    }));
  };

  const handleSelectSubcategory = (subId: string) => {
    setSelectedSubId(subId);
    if (subId !== 'all') {
      // Auto-expand the selected subcategory so the user sees the details
      setExpandedSubIds(prev => ({
        ...prev,
        [subId]: true
      }));
    }
  };

  const selectedSubcategory = category.subcategories.find(s => s.id === selectedSubId);

  // Background pre-warm: starts generating while user browses/configures
  // When user taps "Start", questions are already ready (instant launch)!
  React.useEffect(() => {
    if (!category) return;
    BibleQuizService.prewarmQuiz({
      testament: category.testamentScope,
      difficulty,
      questionCount,
      categoryId: category.id,
      categoryTitle: category.title,
      subcategoryId: selectedSubId !== 'all' ? selectedSubId : undefined,
      subcategoryTitle: selectedSubcategory?.name
    });
  }, [category?.id, selectedSubId, difficulty, questionCount]);

  const handleStartQuiz = async () => {
    setLoading(true);

    const criteria: QuizFilterCriteria = {
      testament: category.testamentScope,
      difficulty,
      questionCount,
      categoryId: category.id,
      categoryTitle: category.title,
      subcategoryId: selectedSubId !== 'all' ? selectedSubId : undefined,
      subcategoryTitle: selectedSubcategory?.name
    };

    try {
      const questions = await BibleQuizService.getAutomaticQuiz(criteria);
      if (!questions || questions.length === 0) {
        Alert.alert('Notice', 'No questions found for the selected criteria. Please broaden your selection.');
        return;
      }

      const quizTitle = selectedSubcategory 
        ? `${selectedSubcategory.name} Quiz`
        : `${category.title} Quiz`;

      navigation.navigate('QuizPlay', {
        quizTitle,
        quizType: 'automatic',
        questions,
        filterCriteria: criteria
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate quiz. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const testamentLabel = 
    category.testamentScope === 'ot' ? 'Old Testament' :
    category.testamentScope === 'nt' ? 'New Testament' : 'Entire Bible';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#090d16' : '#f8fafc' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header Bar */}
      <View style={[styles.headerBar, { borderBottomColor: isDark ? '#1e293b' : '#e2e8f0' }]}>
        <TouchableOpacity 
          style={[styles.backBtn, { backgroundColor: isDark ? '#1e293b' : '#ede9fe' }]}
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ChevronLeft size={22} color={isDark ? '#e2e8f0' : '#4338ca'} />
        </TouchableOpacity>

        <View style={styles.headerTitleWrap}>
          <Text style={[styles.headerTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]} numberOfLines={1}>
            {category.title}
          </Text>
          <Text style={[styles.headerSub, { color: isDark ? '#94a3b8' : '#64748b' }]} numberOfLines={1}>
            {category.subcategories.length} Subcategories • {testamentLabel}
          </Text>
        </View>

        <View style={[styles.categoryHeaderBadge, { backgroundColor: category.color || '#7c3aed' }]}>
          {renderIcon(category.icon, 16, '#ffffff')}
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Hero Banner */}
        <LinearGradient
          colors={isDark ? ['#1e1b4b', '#1e293b'] : ['#f5f3ff', '#ede9fe']}
          style={styles.heroCard}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={[styles.heroIconBox, { backgroundColor: category.color || '#7c3aed' }]}>
              {renderIcon(category.icon, 22, '#ffffff')}
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <View style={[styles.scopeBadge, { backgroundColor: isDark ? '#312e81' : '#ddd6fe' }]}>
                  <Text style={[styles.scopeBadgeText, { color: isDark ? '#c4b5fd' : '#5b21b6' }]}>
                    {testamentLabel}
                  </Text>
                </View>
                <View style={[styles.scopeBadge, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
                  <Text style={[styles.scopeBadgeText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                    {category.subcategories.length} Topics
                  </Text>
                </View>
              </View>
              <Text style={[styles.heroTitle, { color: isDark ? '#f8fafc' : '#1e1b4b' }]}>
                {category.title}
              </Text>
              <Text style={[styles.heroSub, { color: isDark ? '#cbd5e1' : '#4b5563' }]}>
                {category.subtitle}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Section 1: Subcategory Cards */}
        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : '#0f172a' }]}>
            1. Select Subcategory Focus
          </Text>
          <Text style={[styles.sectionHint, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            Tap to select or expand
          </Text>
        </View>

        {/* Option A: Comprehensive "All Subcategories" */}
        <TouchableOpacity
          style={[
            styles.subCard,
            { 
              backgroundColor: isDark ? '#111827' : '#ffffff',
              borderColor: selectedSubId === 'all' ? '#7c3aed' : (isDark ? '#1f2937' : '#e2e8f0')
            },
            selectedSubId === 'all' && { borderWidth: 2, backgroundColor: isDark ? '#1e1b4b' : '#faf5ff' }
          ]}
          onPress={() => handleSelectSubcategory('all')}
          activeOpacity={0.8}
        >
          <View style={styles.subCardHeaderRow}>
            <View style={[
              styles.radioCircle, 
              selectedSubId === 'all' && { borderColor: '#7c3aed', backgroundColor: '#7c3aed' }
            ]}>
              {selectedSubId === 'all' && <Check size={12} color="#ffffff" strokeWidth={3} />}
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[
                styles.subCardTitle, 
                { color: isDark ? '#f8fafc' : '#0f172a' },
                selectedSubId === 'all' && { color: '#7c3aed', fontWeight: '800' }
              ]}>
                All Subcategories (Comprehensive)
              </Text>
              <Text style={[styles.subCardDesc, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                Tests knowledge across all {category.subcategories.length} subtopics within this category
              </Text>
            </View>
            <View style={[styles.countPill, { backgroundColor: isDark ? '#1e293b' : '#ede9fe' }]}>
              <Layers size={13} color="#7c3aed" style={{ marginRight: 4 }} />
              <Text style={[styles.countPillText, { color: '#7c3aed' }]}>All</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Option B: Individual Subcategories */}
        {category.subcategories.map(sub => {
          const isSelected = selectedSubId === sub.id;
          const isExpanded = expandedSubIds[sub.id] || isSelected;

          return (
            <View
              key={sub.id}
              style={[
                styles.subCard,
                { 
                  backgroundColor: isDark ? '#111827' : '#ffffff',
                  borderColor: isSelected ? (category.color || '#7c3aed') : (isDark ? '#1f2937' : '#e2e8f0')
                },
                isSelected && { borderWidth: 2, backgroundColor: isDark ? '#1e1b4b' : '#faf5ff' }
              ]}
            >
              {/* Card Header (Tap to select or toggle expand) */}
              <TouchableOpacity
                style={styles.subCardHeaderRow}
                onPress={() => handleSelectSubcategory(sub.id)}
                activeOpacity={0.8}
              >
                <View style={[
                  styles.radioCircle, 
                  isSelected && { borderColor: category.color || '#7c3aed', backgroundColor: category.color || '#7c3aed' }
                ]}>
                  {isSelected && <Check size={12} color="#ffffff" strokeWidth={3} />}
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[
                    styles.subCardTitle, 
                    { color: isDark ? '#f8fafc' : '#0f172a' },
                    isSelected && { color: category.color || '#7c3aed', fontWeight: '800' }
                  ]}>
                    {sub.name}
                  </Text>
                  {!isExpanded && sub.description && (
                    <Text style={[styles.subCardDesc, { color: isDark ? '#94a3b8' : '#64748b' }]} numberOfLines={1}>
                      {sub.description}
                    </Text>
                  )}
                </View>

                <TouchableOpacity 
                  onPress={() => toggleExpand(sub.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  style={[styles.chevronBox, { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }]}
                >
                  {isExpanded ? (
                    <ChevronUp size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  ) : (
                    <ChevronDown size={16} color={isDark ? '#cbd5e1' : '#64748b'} />
                  )}
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Expanded Details: Full Description and Topics Tags */}
              {isExpanded && (
                <View style={[styles.expandedContent, { borderTopColor: isDark ? '#1e293b' : '#f1f5f9' }]}>
                  {sub.description && (
                    <Text style={[styles.expandedDesc, { color: isDark ? '#cbd5e1' : '#475569' }]}>
                      {sub.description}
                    </Text>
                  )}

                  {sub.topics && sub.topics.length > 0 && (
                    <View style={styles.topicChipsWrap}>
                      {sub.topics.map((t, idx) => (
                        <View 
                          key={idx}
                          style={[
                            styles.topicChip,
                            { backgroundColor: isDark ? '#1e293b' : '#f3e8ff', borderColor: isDark ? '#334155' : '#e9d5ff' }
                          ]}
                        >
                          <Text style={[styles.topicChipText, { color: isDark ? '#c4b5fd' : '#6d28d9' }]}>
                            {t}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {/* Section 2: Difficulty Level */}
        <View style={[styles.configCard, { backgroundColor: isDark ? '#111827' : '#ffffff', borderColor: isDark ? '#1f2937' : '#e2e8f0' }]}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 10 }]}>
            2. Difficulty Level
          </Text>
          <View style={styles.pillRow}>
            {[
              { id: 'mixed', label: 'Mixed' },
              { id: 'easy', label: 'Beginner' },
              { id: 'medium', label: 'Intermediate' },
              { id: 'hard', label: 'Advanced' }
            ].map(item => (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.pill,
                  { backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
                  difficulty === item.id && { backgroundColor: category.color || '#7c3aed' }
                ]}
                onPress={() => setDifficulty(item.id as any)}
              >
                <Text style={[
                  styles.pillText,
                  { color: isDark ? '#cbd5e1' : '#475569' },
                  difficulty === item.id && { color: '#ffffff', fontWeight: 'bold' }
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Section 3: Number of Questions */}
          <Text style={[styles.sectionTitle, { color: isDark ? '#f8fafc' : '#0f172a', marginTop: 12, marginBottom: 10 }]}>
            3. Number of Questions
          </Text>
          <View style={styles.pillRow}>
            {[5, 10, 20].map(count => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.pill,
                  { backgroundColor: isDark ? '#1e293b' : '#f1f5f9', flex: 1, alignItems: 'center' },
                  questionCount === count && { backgroundColor: category.color || '#7c3aed' }
                ]}
                onPress={() => setQuestionCount(count)}
              >
                <Text style={[
                  styles.pillText,
                  { color: isDark ? '#cbd5e1' : '#475569' },
                  questionCount === count && { color: '#ffffff', fontWeight: 'bold' }
                ]}>
                  {count} Questions
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Start Button & Rewards Info */}
        <TouchableOpacity 
          style={[styles.startQuizBtn, { backgroundColor: category.color || '#7c3aed' }]}
          onPress={handleStartQuiz}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <>
              <Play size={18} color="#ffffff" fill="#ffffff" style={{ marginRight: 8 }} />
              <Text style={styles.startQuizBtnText} numberOfLines={1}>
                {selectedSubcategory 
                  ? `Start ${selectedSubcategory.name} (${questionCount} Qs)`
                  : `Start ${category.title} (${questionCount} Qs)`
                }
              </Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 10, marginBottom: 24 }}>
          <Text style={{ fontSize: 13, color: isDark ? '#94a3b8' : '#64748b' }}>
            🪙 Score <Text style={{ fontWeight: '700', color: isDark ? '#fbbf24' : '#d97706' }}>2 Points</Text> per correct question
          </Text>
        </View>

      </ScrollView>

      {/* AI Quiz Generation Modal */}
      <AiQuizLoadingModal
        visible={loading}
        title={selectedSubcategory ? `${selectedSubcategory.name} Quiz` : `${category.title} Quiz`}
        topic={`${category.title} • ${questionCount} Questions`}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerTitleWrap: {
    flex: 1,
    marginHorizontal: 12
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800'
  },
  headerSub: {
    fontSize: 12,
    marginTop: 2
  },
  categoryHeaderBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40
  },
  heroCard: {
    padding: 16,
    borderRadius: 16,
    marginBottom: 20
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  scopeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  scopeBadgeText: {
    fontSize: 10,
    fontWeight: '700'
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 2
  },
  heroSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800'
  },
  sectionHint: {
    fontSize: 11
  },
  subCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10
  },
  subCardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#94a3b8',
    alignItems: 'center',
    justifyContent: 'center'
  },
  subCardTitle: {
    fontSize: 14,
    fontWeight: '700'
  },
  subCardDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16
  },
  countPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10
  },
  countPillText: {
    fontSize: 11,
    fontWeight: '700'
  },
  chevronBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8
  },
  expandedContent: {
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1
  },
  expandedDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 8
  },
  topicChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6
  },
  topicChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1
  },
  topicChipText: {
    fontSize: 11,
    fontWeight: '600'
  },
  configCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 10,
    marginBottom: 16
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  pill: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600'
  },
  startQuizBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4
  },
  startQuizBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: 'bold'
  }
});
