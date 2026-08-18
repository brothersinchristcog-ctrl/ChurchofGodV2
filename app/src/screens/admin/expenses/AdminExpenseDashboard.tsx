import React, { useMemo } from 'react';
import { 
  StyleSheet, 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  Platform
} from 'react-native';
import Svg, { Path, Circle } from 'react-native-svg';
import { CalendarDays, Receipt, ChevronRight } from 'lucide-react-native';
import { COLORS, fmt, todayISO, GroupOf, getCategoryIconComponent } from './AdminExpenseUtils';

const StatCard = ({ label, value, sub, accent, style, onPress }: { label: string, value: string, sub?: string, accent: string, style?: any, onPress?: () => void }) => (
  <TouchableOpacity style={[styles.statCard, style]} onPress={onPress} disabled={!onPress} activeOpacity={0.7}>
    <View style={[styles.statCardBar, { backgroundColor: accent }]} />
    <Text style={styles.statCardLabel}>{label}</Text>
    <Text style={styles.statCardValue}>{value}</Text>
    {sub && <Text style={styles.statCardSub}>{sub}</Text>}
  </TouchableOpacity>
);

export default function AdminExpenseDashboard({ expenses, goTo, goToRange }: { expenses: any[], goTo: (tab: string) => void, goToRange: (range: string) => void }) {
  const totals = useMemo(() => {
    const d = new Date();
    const today = d.toISOString().split('T')[0];
    const month = today.slice(0, 7);
    d.setDate(d.getDate() - 7);
    const weekAgo = d.toISOString().split('T')[0];

    let total = 0, todayTotal = 0, weekTotal = 0, monthTotal = 0;
    let totalCount = 0, todayCount = 0, weekCount = 0, monthCount = 0;
    let pendingTotal = 0, pendingCount = 0;
    const byGroup: any = { Electricity: 0, Water: 0, Food: 0, Maintenance: 0, Others: 0 };
    expenses.forEach((e) => {
      const sum = e.items.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
      total += sum;
      totalCount += 1;
      
      if (e.paymentMethod === 'Pending') {
        pendingTotal += sum;
        pendingCount += 1;
      }
      
      if (e.date === today) { todayTotal += sum; todayCount += 1; }
      if (e.date >= weekAgo && e.date <= today) { weekTotal += sum; weekCount += 1; }
      if (e.date.slice(0, 7) === month) { monthTotal += sum; monthCount += 1; }
      
      e.items.forEach((i: any) => { byGroup[GroupOf(i.category)] += Number(i.amount || 0); });
    });
    return { 
      total, todayTotal, weekTotal, monthTotal, byGroup, 
      totalCount, todayCount, weekCount, monthCount, 
      pendingTotal, pendingCount 
    };
  }, [expenses]);

  const pieData = Object.entries(totals.byGroup).filter(([, v]) => (v as number) > 0).map(([name, value]) => ({ name, value: value as number }));
  const recent = [...expenses].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 5);

  const eventSplit = useMemo(() => {
    const events: any = {};
    let normalTotal = 0, normalCount = 0;
    expenses.forEach((e) => {
      const sum = e.items.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
      if (e.eventName) {
        if (!events[e.eventName]) events[e.eventName] = { total: 0, count: 0 };
        events[e.eventName].total += sum;
        events[e.eventName].count += 1;
      } else {
        normalTotal += sum;
        normalCount += 1;
      }
    });
    const eventList = Object.entries(events).map(([name, v]: any) => ({ name, ...v })).sort((a, b) => b.total - a.total);
    return { eventList, normalTotal, normalCount };
  }, [expenses]);

  const getGroupColor = (name: string) => {
    const colors: any = { Electricity: COLORS.brass, Water: "#3E7A8C", Food: "#5B7A4F", Maintenance: "#8B5E3C", Others: "#7A6A8A" };
    return colors[name] || "#7A6A8A";
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.statGrid}>
          <StatCard label="Today" value={fmt(totals.todayTotal)} sub={`${totals.todayCount} entries`} accent={COLORS.greenMid} onPress={() => goToRange("today")} />
          <StatCard label="This Week" value={fmt(totals.weekTotal)} sub={`${totals.weekCount} entries`} accent="#3E7A8C" onPress={() => goToRange("week")} />
          <StatCard label="This Month" value={fmt(totals.monthTotal)} sub={`${totals.monthCount} entries`} accent={COLORS.greenDeep} onPress={() => goToRange("month")} />
          <StatCard label="Pending" value={fmt(totals.pendingTotal)} sub={`${totals.pendingCount} bills due`} accent={COLORS.redInk} onPress={() => goToRange("pending")} />
          <StatCard label="Total Spent" value={fmt(totals.total)} sub={`${totals.totalCount} total entries`} accent={COLORS.brass} style={{ width: '100%' }} onPress={() => goToRange("all")} />
        </View>



        <View style={styles.ledgerCard}>
          <View style={styles.ledgerCardHeadRowSpaced}>
            <Text style={styles.ledgerCardHead}>Recent Entries</Text>
            <TouchableOpacity style={styles.linkBtn} onPress={() => goToRange("all")}>
              <Text style={styles.linkBtnText}>All</Text>
              <ChevronRight size={13} color={COLORS.greenDeep} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.recentList}>
            {recent.map((e, idx) => {
              const sum = e.items.reduce((s: number, i: any) => s + Number(i.amount || 0), 0);
              const cat = e.items[0]?.category || "Miscellaneous";
              const CatIcon = getCategoryIconComponent(cat);
              const isLast = idx === recent.length - 1;
              
              return (
                <View key={e.id} style={[styles.recentRow, isLast && { borderBottomWidth: 0 }]}>
                  <View style={styles.recentIcon}>
                    <CatIcon size={16} color={COLORS.greenMid} strokeWidth={1.75} />
                  </View>
                  <View style={styles.recentMid}>
                    <Text style={styles.recentTitle}>{e.eventName ? e.eventName : 'Normal Expense'}</Text>
                    <View style={styles.recentDateRow}>
                      <Text style={styles.recentDate}>{e.date}</Text>
                      {/* Removed the event pill since the title is now the event name */}
                    </View>
                  </View>
                  <Text style={styles.recentAmt}>{fmt(sum)}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.ledgerCard}>
          <Text style={styles.ledgerCardHead}>Spend by Category</Text>
          
          {/* SVG Pie Chart & Legend */}
          <View style={styles.pieChartContainer}>
            <View style={styles.pieWrapper}>
              <Svg width={140} height={140} viewBox="0 0 140 140">
                {(() => {
                  let currentAngle = -Math.PI / 2; // start from top
                  const radius = 70;
                  const center = 70;
                  
                  if (!totals.total) {
                    return <Circle cx={center} cy={center} r={radius} fill="#eee" />;
                  }

                  return pieData.map((d) => {
                    if (d.value === 0) return null;
                    const sliceAngle = (d.value / totals.total) * 2 * Math.PI;
                    const nextAngle = currentAngle + sliceAngle;
                    
                    if (d.value === totals.total) {
                      return <Circle key={d.name} cx={center} cy={center} r={radius} fill={getGroupColor(d.name)} />;
                    }

                    const startX = center + radius * Math.cos(currentAngle);
                    const startY = center + radius * Math.sin(currentAngle);
                    const endX = center + radius * Math.cos(nextAngle);
                    const endY = center + radius * Math.sin(nextAngle);
                    const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

                    const pathData = `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;

                    currentAngle = nextAngle;
                    return <Path key={d.name} d={pathData} fill={getGroupColor(d.name)} />;
                  });
                })()}
                <Circle cx={70} cy={70} r={40} fill="#fff" />
              </Svg>
              <View style={styles.pieCenterText}>
                <Text style={styles.pieTotalLabel}>TOTAL</Text>
                <Text style={styles.pieTotalValue}>{fmt(totals.total)}</Text>
              </View>
            </View>

            <View style={styles.pieLegend}>
              {pieData.map(d => {
                const perc = totals.total ? Math.round((d.value / totals.total) * 100) : 0;
                return (
                  <View key={d.name} style={styles.legendRow}>
                    <View style={styles.chartLegend}>
                      <View style={[styles.legendDot, { backgroundColor: getGroupColor(d.name) }]} />
                      <Text style={styles.chartLabel} numberOfLines={1}>{d.name}</Text>
                    </View>
                    <Text style={styles.chartVal}>{perc}%</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statCard: {
    width: '48%',
    backgroundColor: COLORS.paperCard,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 8,
    padding: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  statCardBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 4,
  },
  statCardLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#7A7157',
    marginBottom: 4,
  },
  statCardValue: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 18,
    color: COLORS.greenDeep,
    fontWeight: '600',
  },
  statCardSub: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    color: COLORS.redInk,
    marginTop: 4,
  },
  ledgerCard: {
    backgroundColor: COLORS.paperCard,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 8,
    padding: 16,
  },
  ledgerCardHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  ledgerCardHeadRowSpaced: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headIcon: {
    marginRight: 6,
  },
  ledgerCardHead: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.greenDeep,
  },
  ledgerTable: {
    flexDirection: 'column',
  },
  emptyStateSm: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#8A8267',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  ledgerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperAlt,
  },
  lineIcon: {
    width: 24,
    marginRight: 8,
  },
  lineMid: {
    flex: 1,
  },
  lineCat: {
    fontSize: 13,
    color: COLORS.ink,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  lineDetail: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: '#8A8267',
    marginTop: 2,
  },
  lineAmt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
    textAlign: 'right',
  },
  
  // Custom Chart
  customChartArea: {
    marginTop: 8,
  },
  pieChartContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingBottom: 8,
  },
  pieWrapper: {
    width: 140,
    height: 140,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieTotalLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#9BAB9F',
    letterSpacing: 0.5,
  },
  pieTotalValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
    marginTop: 2,
  },
  pieLegend: {
    flex: 1,
    marginLeft: 24,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  chartRow: {
    flexDirection: 'column',
  },
  chartTextRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartLegend: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  chartLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.ink,
  },
  chartVal: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.ink,
  },
  chartBarBg: {
    height: 6,
    backgroundColor: COLORS.paperAlt,
    borderRadius: 3,
    overflow: 'hidden',
  },
  chartBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  linkBtnText: {
    fontSize: 12,
    color: COLORS.greenDeep,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    marginRight: 2,
  },
  recentList: {
    marginTop: 4,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperAlt,
  },
  recentIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.rule,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  recentMid: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 13,
    color: COLORS.ink,
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  recentDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  recentDate: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: '#8A8267',
  },
  eventPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.brassLight,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  eventPillText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    color: COLORS.greenDeep,
    marginLeft: 3,
  },
  recentAmt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
    textAlign: 'right',
  }
});
