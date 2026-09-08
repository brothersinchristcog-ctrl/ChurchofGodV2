import React, { useState, useEffect, useContext, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, ScrollView } from 'react-native';
import { ChevronLeft, MessageCircle } from 'lucide-react-native';
import { AdminTabContext } from '../../context/AdminTabContext';
import firestore from '@react-native-firebase/firestore';
import { useTheme } from '../../context/ThemeContext';

export default function AdminFeedbackList() {
  const { goBack } = useContext(AdminTabContext);
  const { isDark, colors } = useTheme();
  
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('Excellent');

  const fetchFeedbacks = async () => {
    try {
      const snapshot = await firestore()
        .collection('feedback')
        .orderBy('createdAt', 'desc')
        .get();
        
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFeedbacks(data);
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeedbacks();
  };

  const getRatingColor = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'excellent': return '#10B981'; // Green
      case 'good': return '#3B82F6'; // Blue
      case 'okay': return '#F59E0B'; // Yellow
      case 'fair': return '#F97316'; // Orange
      case 'poor': return '#EF4444'; // Red
      default: return '#6B7280'; // Gray
    }
  };

  const renderFeedback = ({ item }: { item: any }) => {
    const date = item.createdAt ? item.createdAt.toDate().toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : 'Just now';

    return (
      <View style={[styles.card, { backgroundColor: isDark ? '#1e293b' : '#ffffff' }]}>
        <View style={styles.cardHeader}>
          <View style={styles.userSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.userName?.charAt(0)?.toUpperCase() || 'U'}</Text>
            </View>
            <View>
              <Text style={[styles.userName, { color: colors.text }]}>{item.userName}</Text>
              <Text style={styles.date}>{date}</Text>
            </View>
          </View>
          <View style={[styles.ratingPill, { backgroundColor: getRatingColor(item.ratingLabel) + '20' }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
            <Text style={[styles.ratingText, { color: getRatingColor(item.ratingLabel) }]}>
              {item.ratingLabel}
            </Text>
          </View>
        </View>

        <View style={styles.messageContainer}>
          {item.message && item.message.trim().length > 0 ? (
            <Text style={[styles.messageText, { color: isDark ? '#cbd5e1' : '#334155' }]}>
              {item.message}
            </Text>
          ) : (
            <Text style={[styles.messageTextEmpty, { color: isDark ? '#64748b' : '#94a3b8' }]}>
              No comment added
            </Text>
          )}
        </View>
      </View>
    );
  };

  const counts: Record<string, number> = {
    Excellent: feedbacks.filter(f => f.ratingLabel === 'Excellent').length,
    Good: feedbacks.filter(f => f.ratingLabel === 'Good').length,
    Okay: feedbacks.filter(f => f.ratingLabel === 'Okay').length,
    Fair: feedbacks.filter(f => f.ratingLabel === 'Fair').length,
    Poor: feedbacks.filter(f => f.ratingLabel === 'Poor').length,
  };

  const filters = ['Excellent', 'Good', 'Okay', 'Fair', 'Poor'];

  const filteredFeedbacks = feedbacks.filter(f => f.ratingLabel === selectedFilter);

  const averageScore = useMemo(() => {
    if (feedbacks.length === 0) return 0;
    const total = feedbacks.reduce((acc, curr) => {
      // Poor = 0, Fair = 1, Okay = 2, Good = 3, Excellent = 4
      // Scale to 1-5 by adding 1
      const score = (curr.ratingIndex !== undefined ? curr.ratingIndex : 
        ['Poor', 'Fair', 'Okay', 'Good', 'Excellent'].indexOf(curr.ratingLabel)) + 1;
      return acc + (score > 0 ? score : 3); // Fallback to 3 if unknown
    }, 0);
    return (total / feedbacks.length).toFixed(1);
  }, [feedbacks]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Remove back button header as standard admin navigator provides one if needed, or keep for specific screen design */}
      {/* We are in AdminNavigator, which doesn't show a top header for non-main tabs, so we MUST render our own here */}
      <View style={[styles.header, { backgroundColor: isDark ? '#0f172a' : '#ffffff' }]}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>User Feedback</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {filters.map((filter) => {
            const isSelected = selectedFilter === filter;
            const filterColor = getRatingColor(filter);
            
            return (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.filterChip,
                  { 
                    backgroundColor: isSelected ? filterColor : isDark ? '#1e293b' : '#ffffff',
                    borderColor: filterColor,
                  }
                ]}
                onPress={() => setSelectedFilter(filter)}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.filterText,
                  { color: isSelected ? '#ffffff' : filterColor }
                ]}>
                  {filter} ({counts[filter]})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {feedbacks.length > 0 && (
        <View style={styles.summaryCardWrapper}>
          <View style={[styles.summaryCard, { backgroundColor: isDark ? '#1e293b' : '#0f172a' }]}>
            <View style={styles.summaryLeft}>
              <Text style={styles.summaryScore}>{averageScore}</Text>
              <Text style={styles.summaryMax}> / 5.0 avg</Text>
            </View>
            <View style={styles.summaryRight}>
              <Text style={styles.summaryResponsesCount}>{feedbacks.length}</Text>
              <Text style={styles.summaryResponsesText}> responses</Text>
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3B82F6" />
        </View>
      ) : filteredFeedbacks.length === 0 ? (
        <View style={styles.center}>
          <MessageCircle size={48} color="#94A3B8" />
          <Text style={[styles.emptyText, { color: colors.text }]}>No feedback found.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredFeedbacks}
          keyExtractor={(item) => item.id}
          renderItem={renderFeedback}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3B82F6" />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 4,
    width: 32,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    flex: 1,
  },
  headerRightPlaceholder: {
    width: 32,
  },
  summaryCardWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    marginTop: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#475569', // Ash/slate color border
  },
  summaryLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryScore: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FCD34D',
  },
  summaryMax: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginLeft: 4,
  },
  summaryRight: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  summaryResponsesCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  summaryResponsesText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94a3b8',
    marginLeft: 4,
  },
  filterWrapper: {
    paddingVertical: 12,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    marginRight: 8,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 8,
  },
  emoji: {
    fontSize: 16,
    marginRight: 6,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '700',
  },
  messageContainer: {
    marginTop: 4,
    paddingHorizontal: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 22,
  },
  messageTextEmpty: {
    fontSize: 14,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
