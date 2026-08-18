import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, ChevronRight, PlusSquare, FileText } from 'lucide-react-native';
import { COLORS, formatCurrency } from './AdminDonationsUtils';

export default function AdminDonationsDashboard({ donations, onNavigate }: any) {
  const today = new Date().toDateString();
  
  // Calculate start dates
  const now = new Date();
  const startWeek = new Date(now);
  startWeek.setDate(now.getDate() - now.getDay()); // Sunday as start of week
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startYear = new Date(now.getFullYear(), 0, 1);

  const buckets = { today: [] as any[], week: [] as any[], month: [] as any[], year: [] as any[] };

  donations.forEach((d: any) => {
    if (!d.date) return;
    const dt = new Date(d.date);
    if (dt.toDateString() === today) buckets.today.push(d);
    if (dt >= startWeek) buckets.week.push(d);
    if (dt >= startMonth) buckets.month.push(d);
    if (dt >= startYear) buckets.year.push(d);
  });

  const getAmt = (arr: any[]) => arr.reduce((s, d) => s + (Number(d.amount) || 0), 0);

  return (
    <View style={styles.container}>
      <View style={styles.topbar}>
        <View style={styles.topbarRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => {
            // Because we are inside AdminNavigator, we can just use navigation context to go back to dashboard?
            // Actually, AdminNavigator uses AdminTabContext. Let's just emit an event or go back if possible.
            // But usually the Dashboard tab is activeTab = 0.
            // A simple way is to use DeviceEventEmitter.emit('NAVIGATE_ADMIN', 0);
            import('react-native').then(({ DeviceEventEmitter }) => {
              DeviceEventEmitter.emit('NAVIGATE_ADMIN', 0);
            });
          }}>
            <ArrowLeft color="#fff" size={20} />
          </TouchableOpacity>
          <View>
            <Text style={styles.eyebrow}>CHURCH OF GOD</Text>
            <Text style={styles.title}>Donations</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.statGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statAmount}>{formatCurrency(getAmt(buckets.today))}</Text>
            <Text style={styles.statCount}>{buckets.today.length} donation{buckets.today.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This Week</Text>
            <Text style={styles.statAmount}>{formatCurrency(getAmt(buckets.week))}</Text>
            <Text style={styles.statCount}>{buckets.week.length} donation{buckets.week.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This Month</Text>
            <Text style={styles.statAmount}>{formatCurrency(getAmt(buckets.month))}</Text>
            <Text style={styles.statCount}>{buckets.month.length} donation{buckets.month.length !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>This Year</Text>
            <Text style={styles.statAmount}>{formatCurrency(getAmt(buckets.year))}</Text>
            <Text style={styles.statCount}>{buckets.year.length} donation{buckets.year.length !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "Each of you should give what you have decided in your heart to give, not reluctantly or under compulsion, for God loves a cheerful giver."
          </Text>
          <Text style={styles.quoteRef}>— 2 Corinthians 9:7</Text>
        </View>
      </ScrollView>

      <View style={{ paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={[styles.singleBadgeContainer, { overflow: 'hidden', padding: 0 }]}>
          <TouchableOpacity style={[styles.badgeBtn, { backgroundColor: 'transparent' }]} onPress={() => onNavigate('create')} activeOpacity={0.8}>
            <PlusSquare color={COLORS.indigo} size={20} />
            <Text style={[styles.badgeBtnText, { color: COLORS.indigo }]}>Create</Text>
          </TouchableOpacity>

          <View style={styles.badgeDivider} />

          <TouchableOpacity style={[styles.badgeBtn, { backgroundColor: 'transparent' }]} onPress={() => onNavigate('list')} activeOpacity={0.8}>
            <FileText color={COLORS.indigo} size={20} />
            <Text style={[styles.badgeBtnText, { color: COLORS.indigo }]}>View All</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.parchment,
  },
  topbar: {
    backgroundColor: COLORS.indigo, // Fallback
    paddingTop: 45, // Assuming some safe area padding
    paddingBottom: 45,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  topbarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    color: COLORS.goldLight,
    fontWeight: '600',
    opacity: 0.9,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    color: '#fff',
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 20,
    zIndex: 2,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.paper,
    borderRadius: 14,
    padding: 16,
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.10,
    shadowRadius: 30,
    elevation: 5,
    borderColor: COLORS.line,
    borderWidth: 1,
  },
  statLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: COLORS.inkSoft,
    fontWeight: '600',
  },
  statAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.indigo,
    marginTop: 4,
  },
  statCount: {
    fontSize: 12,
    color: COLORS.inkSoft,
    marginTop: 2,
  },
  quoteCard: {
    backgroundColor: 'rgba(201, 162, 39, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginTop: 24,
    borderWidth: 1,
    borderColor: 'rgba(201, 162, 39, 0.3)',
  },
  quoteText: {
    fontSize: 14.5,
    fontStyle: 'italic',
    color: COLORS.indigo,
    lineHeight: 22,
    textAlign: 'center',
  },
  quoteRef: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gold,
    textAlign: 'center',
    marginTop: 10,
  },
  singleBadgeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 30,
    marginTop: 25,
    shadowColor: COLORS.indigo,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: COLORS.line,
  },
  badgeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 8,
  },
  badgeDivider: {
    width: 1,
    backgroundColor: COLORS.line,
    marginVertical: 12,
  },
  badgeBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.indigo,
  }
});
