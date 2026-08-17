import React, { useState, useMemo, useEffect } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  TextInput, Modal, Platform, Alert, Image 
} from 'react-native';
import { 
  Search, SlidersHorizontal, CalendarDays, Receipt, 
  ChevronRight, ChevronDown, ChevronLeft, Check, FileText
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { 
  COLORS, fmt, todayISO, CATEGORY_NAMES, PAYMENT_METHODS,
  getCategoryIconComponent, PaymentStamp, formatDateToDDMMYYYY, ApprovalBadge
} from './AdminExpenseUtils';

const Sheet = ({ title, visible, onClose, children }: { title: string, visible: boolean, onClose: () => void, children: React.ReactNode }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.sheetOverlay}>
      <View style={styles.sheetContent}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity style={styles.iconBtnRound} onPress={onClose}>
            <ChevronLeft size={20} color={COLORS.ink} />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.sheetBody}>
          {children}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

export default function AdminExpenseHistory({ expenses, usedEvents, customCategories, onEdit, onDelete, initialRange, onGenerateInvoice, onSendForApproval }: any) {
  const [range, setRange] = useState(initialRange || "all");
  const [category, setCategory] = useState("all");
  const [method, setMethod] = useState("all");
  const [eventFilter, setEventFilter] = useState("all"); // "all" | "normal" | <eventName>
  const [q, setQ] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [openEventGroup, setOpenEventGroup] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [showPicker, setShowPicker] = useState<'start' | 'end' | null>(null);
  
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [contextMenuExpense, setContextMenuExpense] = useState<any>(null);

  const getLocalYMD = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dd}`;
  };

  const formatDisplayDate = (ymd: string) => {
    if (!ymd) return "";
    const [y, m, d] = ymd.split('-');
    return `${d}-${m}-${y}`;
  };

  useEffect(() => {
    if (initialRange) {
      if (initialRange === "pending") {
        setMethod("Pending");
        setRange("all");
      } else {
        setRange(initialRange);
        setMethod("all");
      }
      setCategory("all");
      setEventFilter("all");
      setQ("");
    }
  }, [initialRange]);

  const filtered = useMemo(() => {
    const today = todayISO();
    const now = new Date();
    return expenses.filter((e: any) => {
      if (range === "today" && e.date !== today) return false;
      if (range === "week") {
        const d = new Date(e.date);
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (d < weekAgo) return false;
      }
      if (range === "month") {
        const d = new Date(e.date);
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        if (d < monthAgo) return false;
      }
      if (range === "custom") {
        if (customStart && e.date < customStart) return false;
        if (customEnd && e.date > customEnd) return false;
      }
      if (category !== "all" && !e.items.some((i: any) => i.category === category)) return false;
      if (method !== "all" && e.paymentMethod !== method) return false;
      if (eventFilter === "normal" && e.eventName) return false;
      if (eventFilter !== "all" && eventFilter !== "normal" && e.eventName !== eventFilter) return false;
      if (q) {
        const hay = (e.vendor + " " + e.notes + " " + (e.eventName || "") + " " + e.items.map((i: any) => i.category).join(" ")).toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    }).sort((a: any, b: any) => (a.date < b.date ? 1 : -1));
  }, [expenses, range, category, method, eventFilter, q]);

  const filteredTotal = filtered.reduce((s: number, e: any) => s + e.items.reduce((s2: number, i: any) => s2 + Number(i.amount), 0), 0);
  const activeFilterCount = (range !== "all" ? 1 : 0) + (category !== "all" ? 1 : 0) + (method !== "all" ? 1 : 0) + (eventFilter !== "all" ? 1 : 0);

  const eventGroups = useMemo(() => {
    const map: any = {};
    filtered.forEach((e: any) => { 
      if (e.eventName) { 
        if (!map[e.eventName]) map[e.eventName] = [];
        map[e.eventName].push(e); 
      } 
    });
    return Object.entries(map).map(([name, list]: any) => ({
      name, 
      list, 
      total: list.reduce((s: number, e: any) => s + e.items.reduce((s2: number, i: any) => s2 + Number(i.amount), 0), 0),
    })).sort((a: any, b: any) => (a.list[0].date < b.list[0].date ? 1 : -1));
  }, [filtered]);

  const normalEntries = useMemo(() => filtered.filter((e: any) => !e.eventName), [filtered]);
  const showEventSection = eventFilter !== "normal" && eventGroups.length > 0;
  const showNormalSection = eventFilter === "all" || eventFilter === "normal";

  const renderEntryRow = (e: any, isNormal: boolean = false) => {
    const sum = e.items.reduce((s: number, i: any) => s + Number(i.amount), 0);
    const cat = e.items[0]?.category || "Miscellaneous";
    const CatIcon = getCategoryIconComponent(cat);
    const open = openId === e.id;
    const checked = selectedIds.has(e.id);
    
    return (
      <View key={e.id} style={styles.historyBlock}>
        <TouchableOpacity 
          style={styles.ledgerLine} 
          onPress={() => {
            if (selectMode) {
              const next = new Set(selectedIds);
              if (next.has(e.id)) next.delete(e.id); else next.add(e.id);
              setSelectedIds(next);
            } else {
              setOpenId(open ? null : e.id);
            }
          }}
          onLongPress={() => {
            if (!selectMode) {
              setSelectMode(true);
              setSelectedIds(new Set([e.id]));
            }
          }}
        >
          {selectMode ? (
            <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
              {checked && <Check size={12} color="#fff" strokeWidth={3} />}
            </View>
          ) : (
            <View style={styles.ledgerLineIcon}><CatIcon size={16} color={COLORS.greenMid} /></View>
          )}
          <View style={styles.ledgerLineMid}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <Text style={styles.ledgerLineCat}>{e.items.length > 1 ? `${cat} +${e.items.length - 1} more` : cat}</Text>
              {isNormal && <ApprovalBadge status={e.status} />}
            </View>
            <Text style={styles.ledgerLineDetail}>
              {e.invoiceNumber ? <Text style={{ color: COLORS.brass, fontWeight: '700' }}>{e.invoiceNumber} · </Text> : null}
              {e.vendor || (e.items.some((i: any) => i.vendor) ? "Multiple Vendors" : "—")} · {formatDateToDDMMYYYY(e.date)}
            </Text>
          </View>
          <Text style={styles.ledgerLineAmt}>{fmt(sum)}</Text>
          {!selectMode && (open ? <ChevronDown size={16} color="#8A8267" style={{marginLeft: 8}} /> : <ChevronRight size={16} color="#8A8267" style={{marginLeft: 8}} />)}
        </TouchableOpacity>
        
        {open && !selectMode && (
          <View style={styles.detailDrop}>
            <View style={styles.detailGrid}>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Paid By</Text><Text style={styles.detailValue}>{e.paidBy || "—"}</Text></View>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Payment</Text><Text style={styles.detailValue}>{e.paymentMethod}</Text></View>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Reference</Text><Text style={styles.detailValue}>{e.reference || "—"}</Text></View>
              <View style={styles.detailCell}><Text style={styles.detailLabel}>Created By</Text><Text style={styles.detailValue}>{e.createdBy}</Text></View>
              
              {!!e.submittedBy && <View style={styles.detailCell}><Text style={styles.detailLabel}>Submitted</Text><Text style={styles.detailValue}>{e.submittedBy}</Text></View>}
              {!!e.approvedBy && <View style={styles.detailCell}><Text style={styles.detailLabel}>{e.status === 'Rejected' ? 'Rejected By' : 'Approved By'}</Text><Text style={styles.detailValue}>{e.approvedBy}</Text></View>}
              {!!e.invoiceNumber && <View style={styles.detailCell}><Text style={styles.detailLabel}>Invoice No</Text><Text style={styles.detailValue}>{e.invoiceNumber}</Text></View>}
              {!!e.approvalRemarks && (
                <View style={[styles.detailCell, { width: '100%' }]}>
                  <Text style={[styles.detailLabel, { color: COLORS.redInk }]}>Remarks</Text>
                  <Text style={[styles.detailValue, { color: COLORS.ink }]}>{e.approvalRemarks}</Text>
                </View>
              )}

              <View style={styles.detailCell}>
                <Text style={styles.detailLabel}>Receipt</Text>
                {e.receiptUri ? (
                  <TouchableOpacity onPress={() => setPreviewUri(e.receiptUri)}>
                    <Text style={[styles.detailValue, { color: COLORS.greenDeep, textDecorationLine: 'underline', fontWeight: '600' }]}>View Attached</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.detailValue}>{e.receiptName || "Not attached"}</Text>
                )}
              </View>
              <View style={[styles.detailCell, { width: '100%' }]}><Text style={styles.detailLabel}>Notes</Text><Text style={styles.detailValue}>{e.notes || "—"}</Text></View>
            </View>
            <View style={styles.detailItems}>
              <View style={[styles.detailItemRow, { borderBottomWidth: 1, borderBottomColor: COLORS.rule, paddingBottom: 6, marginBottom: 4 }]}>
                <Text style={[styles.detailItemText, { flex: 2, fontWeight: '600', color: COLORS.subtleText }]}>Category</Text>
                <Text style={[styles.detailItemText, { flex: 3, fontWeight: '600', color: COLORS.subtleText }]}>Details</Text>
                <Text style={[styles.detailItemAmt, { flex: 1.5, textAlign: 'right', fontWeight: '600', color: COLORS.subtleText, fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 12 }]}>Amount</Text>
              </View>
              {e.items.map((i: any, idx: number) => {
                const ItemIcon = getCategoryIconComponent(i.category);
                const isLast = idx === e.items.length - 1;
                return (
                  <View key={i.id} style={[styles.detailItemRow, { paddingVertical: 6, borderBottomWidth: isLast ? 0 : 1, borderBottomColor: '#EBE3CC' }]}>
                    <View style={{ flex: 2, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <ItemIcon size={13} color={COLORS.greenMid} />
                      <Text style={[styles.detailItemText, { fontSize: 12, fontWeight: '500' }]} numberOfLines={1}>{i.category}</Text>
                    </View>
                    <View style={{ flex: 3 }}>
                      {!!i.vendor && <Text style={[styles.detailItemText, { fontSize: 11.5, color: COLORS.ink, fontWeight: '600' }]} numberOfLines={1}>{i.vendor}</Text>}
                      <Text style={[styles.detailItemText, { fontSize: 11.5, color: COLORS.subtleText }]} numberOfLines={2}>{i.detail}</Text>
                    </View>
                    <Text style={[styles.detailItemAmt, { flex: 1.5, textAlign: 'right', fontSize: 12 }]}>{fmt(i.amount)}</Text>
                  </View>
                );
              })}
              <View style={[styles.detailItemRow, { marginTop: 8, borderTopWidth: 1, borderTopColor: COLORS.rule, paddingTop: 8 }]}>
                <Text style={[styles.detailItemText, { flex: 5, textAlign: 'right', fontWeight: '600', color: COLORS.ink }]}>Total</Text>
                <Text style={[styles.detailItemAmt, { flex: 1.5, textAlign: 'right', fontWeight: 'bold', fontSize: 13, color: COLORS.greenDeep }]}>{fmt(sum)}</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <TouchableOpacity style={[styles.editBtn, { marginTop: 0, borderRadius: 24, backgroundColor: COLORS.brass, borderColor: COLORS.brass }]} onPress={() => onGenerateInvoice([e])}>
                <Text style={[styles.editBtnText, { color: COLORS.greenDeep }]}>Generate Invoice</Text>
              </TouchableOpacity>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={[styles.editBtn, { flex: 1, marginTop: 0, borderRadius: 24 }]} onPress={() => onEdit(e)}>
                  <Text style={styles.editBtnText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.editBtn, { flex: 1, marginTop: 0, borderRadius: 24, backgroundColor: COLORS.redInk, borderColor: COLORS.redInk }]} 
                  onPress={() => {
                    Alert.alert(
                      "Delete Expense",
                      "Are you sure you want to delete this expense? This action cannot be undone.",
                      [
                        { text: "Cancel", style: "cancel" },
                        { text: "Delete", style: "destructive", onPress: () => onDelete(e.id) }
                      ]
                    );
                  }}
                >
                  <Text style={[styles.editBtnText, { color: '#FFF' }]}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const allCategories = Array.from(new Set([...CATEGORY_NAMES, ...customCategories]));

  const renderSelect = (label: string, value: string, setter: (val: string) => void, options: {val: string, label: string}[]) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabelStandalone}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {options.map(o => (
          <TouchableOpacity 
            key={o.val} 
            style={[styles.chip, value === o.val && styles.chipActive]}
            onPress={() => setter(o.val)}
          >
            <Text style={[styles.chipText, value === o.val && styles.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  const selectedEntries = useMemo(() => filtered.filter((e: any) => selectedIds.has(e.id)), [filtered, selectedIds]);
  const selectedTotal = selectedEntries.reduce((s: number, e: any) => s + e.items.reduce((s2: number, i: any) => s2 + Number(i.amount), 0), 0);

  return (
    <View style={styles.container}>
      {selectMode ? (
        <View style={styles.invoiceHeaderRow}>
          <Text style={styles.invoiceIntro}>Select expenses to generate an invoice.</Text>
          <TouchableOpacity style={styles.btnGhostSm} onPress={() => { setSelectMode(false); setSelectedIds(new Set()); }}>
            <Text style={styles.btnGhostSmText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 16 }}>
          <View style={[styles.searchBox, { marginHorizontal: 0, marginTop: 0, flex: 1 }]}>
            <Search size={16} color="#7A7157" />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search vendor, notes, category" 
              value={q} 
              onChangeText={setQ} 
              placeholderTextColor="#A39A7F"
            />
          </View>
          <TouchableOpacity 
            style={[styles.filterBtn, { marginLeft: 12, backgroundColor: selectMode ? COLORS.greenDeep : '#fff', borderWidth: 1, borderColor: selectMode ? COLORS.greenDeep : COLORS.rule, padding: 10, borderRadius: 6 }]} 
            onPress={() => {
              setSelectMode(!selectMode);
              if (selectMode) setSelectedIds(new Set());
            }}
          >
            <Check size={16} color={selectMode ? '#fff' : COLORS.greenDeep} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, { marginLeft: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: COLORS.rule, padding: 10, borderRadius: 6 }]} 
            onPress={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal size={16} color={COLORS.greenDeep} />
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {!selectMode && <Text style={styles.historySummary}>{filtered.length} entries · {fmt(filteredTotal)}</Text>}
      {selectMode && <View style={{ height: 16 }} />}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, selectMode && { paddingBottom: 100 }]}>
        {filtered.length === 0 && (
          <View style={styles.ledgerCard}>
            <Text style={styles.emptyState}>No entries match these filters.</Text>
          </View>
        )}

        {showEventSection && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <CalendarDays size={14} color={COLORS.greenDeep} />
              <Text style={styles.sectionTitle}>Event-wise Expenses</Text>
            </View>
            
            {eventGroups.map((g: any) => {
              let groupApprovalStatus = 'Draft';
              if (g.list.some((e: any) => e.status === 'Rejected')) groupApprovalStatus = 'Rejected';
              else if (g.list.some((e: any) => e.status === 'Pending Approval')) groupApprovalStatus = 'Pending Approval';
              else if (g.list.every((e: any) => e.status === 'Approved')) groupApprovalStatus = 'Approved';

              return (
                <View key={g.name} style={[styles.ledgerCard, styles.eventGroupCard]}>
                  <View style={[styles.ledgerCardHeadTextPlain, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                    <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif', fontSize: 14, fontWeight: '600', color: COLORS.greenDeep }}>{g.name}</Text>
                    <ApprovalBadge status={groupApprovalStatus} />
                  </View>
                  <View style={styles.ledgerTable}>
                    {g.list.map((item: any) => renderEntryRow(item, false))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {showNormalSection && normalEntries.length > 0 && (
          <View style={styles.sectionBlock}>
            <View style={styles.sectionTitleRow}>
              <Receipt size={14} color={COLORS.greenDeep} />
              <Text style={styles.sectionTitle}>Normal Expenses</Text>
            </View>
            <View style={styles.ledgerCard}>
              <View style={styles.ledgerTable}>
                {normalEntries.map((item: any) => renderEntryRow(item, true))}
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {selectMode && selectedEntries.length > 0 && (
        <View style={styles.selectionBar}>
          <View style={styles.selectionBarInfo}>
            <Text style={styles.selectionBarCount}>{selectedEntries.length} selected</Text>
            <Text style={styles.selectionBarTotal}>{fmt(selectedTotal)}</Text>
          </View>
          <TouchableOpacity 
            style={styles.selectionBarGenerateBtn} 
            onPress={() => {
              if (onGenerateInvoice) {
                onGenerateInvoice(selectedEntries);
                setSelectMode(false);
                setSelectedIds(new Set());
              }
            }}
          >
            <FileText size={15} color="#fff" />
            <Text style={styles.selectionBarGenerateBtnText}>Generate Invoice</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Filters Bottom Sheet */}
      <Sheet title="Filters" visible={filtersOpen} onClose={() => setFiltersOpen(false)}>
        <View style={styles.filterSheetStack}>
          {renderSelect("Date Range", range, setRange, [
            {val: "all", label: "All Time"}, {val: "today", label: "Today"},
            {val: "week", label: "This Week"}, {val: "month", label: "This Month"},
            {val: "custom", label: "Custom Range"}
          ])}
          
          {range === 'custom' && (
            <View style={{ flexDirection: 'row', gap: 12, marginHorizontal: 16, marginBottom: 16 }}>
              <TouchableOpacity style={[styles.searchBox, { flex: 1, marginHorizontal: 0, marginTop: 0 }]} onPress={() => setShowPicker('start')}>
                <Text style={[{ fontSize: 14 }, customStart ? { color: COLORS.ink } : { color: '#A39A7F' }]}>
                  {customStart ? formatDisplayDate(customStart) : "Start (DD-MM-YYYY)"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.searchBox, { flex: 1, marginHorizontal: 0, marginTop: 0 }]} onPress={() => setShowPicker('end')}>
                <Text style={[{ fontSize: 14 }, customEnd ? { color: COLORS.ink } : { color: '#A39A7F' }]}>
                  {customEnd ? formatDisplayDate(customEnd) : "End (DD-MM-YYYY)"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {showPicker && (
            <DateTimePicker
              value={
                showPicker === 'start' 
                  ? (customStart ? new Date(customStart + "T00:00:00") : new Date())
                  : (customEnd ? new Date(customEnd + "T00:00:00") : new Date())
              }
              mode="date"
              display="default"
              onChange={(e: any, d?: Date) => {
                const currentPicker = showPicker;
                if (Platform.OS !== 'ios') setShowPicker(null);
                if (d) {
                  const formatted = getLocalYMD(d);
                  if (currentPicker === 'start') setCustomStart(formatted);
                  if (currentPicker === 'end') setCustomEnd(formatted);
                }
              }}
            />
          )}

          {renderSelect("Category", category, setCategory, [
            {val: "all", label: "All Categories"},
            ...allCategories.map(c => ({val: c, label: c}))
          ])}

          {renderSelect("Payment Method", method, setMethod, [
            {val: "all", label: "All Methods"},
            ...PAYMENT_METHODS.map(p => ({val: p.id, label: p.id}))
          ])}

          {renderSelect("Event / Type", eventFilter, setEventFilter, [
            {val: "all", label: "All (Event-wise + Normal)"},
            {val: "normal", label: "Normal Expenses Only"},
            ...usedEvents.map((ev: string) => ({val: ev, label: ev}))
          ])}

          <TouchableOpacity style={styles.btnPrimary} onPress={() => setFiltersOpen(false)}>
            <Text style={styles.btnPrimaryText}>Apply Filters</Text>
          </TouchableOpacity>

          {activeFilterCount > 0 && (
            <TouchableOpacity 
              style={styles.btnGhost} 
              onPress={() => { setRange("all"); setCategory("all"); setMethod("all"); setEventFilter("all"); }}
            >
              <Text style={styles.btnGhostText}>Clear All</Text>
            </TouchableOpacity>
          )}
        </View>
      </Sheet>



      {!!previewUri && (
        <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 10 }} onPress={() => setPreviewUri(null)}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
            <Image source={{ uri: previewUri }} style={{ width: '100%', height: '80%', resizeMode: 'contain' }} />
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.rule,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 6,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.ink,
    padding: 0,
  },
  filterBtn: {
    padding: 4,
    position: 'relative',
  },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: COLORS.brass,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: 'bold',
  },
  historySummary: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10.5,
    color: '#7A7157',
    marginHorizontal: 16,
    marginVertical: 12,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  ledgerCard: {
    backgroundColor: COLORS.paperCard,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 8,
  },
  emptyState: {
    paddingVertical: 26,
    textAlign: 'center',
    color: '#8A8267',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.brass,
    paddingBottom: 6,
    marginBottom: 8,
    marginHorizontal: 2,
    gap: 6,
  },
  sectionTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.greenDeep,
    letterSpacing: 0.2,
  },
  eventGroupCard: {
    padding: 0,
    marginBottom: 10,
    overflow: 'hidden',
  },
  eventGroupHead: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: COLORS.paperCard,
  },
  ledgerCardHeadTextPlain: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.greenDeep,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
    backgroundColor: COLORS.paperAlt,
  },
  eventGroupBody: {
    paddingHorizontal: 14,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: COLORS.rule,
  },
  ledgerTable: {
    paddingHorizontal: 14,
  },
  historyBlock: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperAlt,
  },
  ledgerLine: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  ledgerLineIcon: {
    width: 24,
    alignItems: 'center',
    marginRight: 10,
  },
  ledgerLineMid: {
    flex: 1,
  },
  ledgerLineCat: {
    fontSize: 13,
    color: COLORS.ink,
  },
  ledgerLineDetail: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: '#8A8267',
    marginTop: 2,
  },
  ledgerLineAmt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.ink,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#A39A7F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#fff',
  },
  checkboxChecked: {
    backgroundColor: COLORS.greenMid,
    borderColor: COLORS.greenMid,
  },
  invoiceHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.paperAlt,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  invoiceIntro: {
    flex: 1,
    fontSize: 12,
    color: COLORS.ink,
    lineHeight: 16,
  },
  btnGhostSm: {
    marginLeft: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 6,
  },
  btnGhostSmText: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.ink,
  },
  selectionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.greenDeep,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  selectionBarInfo: {
    flexDirection: 'column',
  },
  selectionBarCount: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: '#A9803C',
    textTransform: 'uppercase',
  },
  selectionBarTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  selectionBarGenerateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    gap: 8,
  },
  selectionBarGenerateBtnText: {
    color: COLORS.greenDeep,
    fontSize: 14,
    fontWeight: '600',
  },
  detailDrop: {
    paddingLeft: 34,
    paddingRight: 0,
    paddingBottom: 16,
    paddingTop: 2,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  detailCell: {
    width: '45%',
    flexDirection: 'column',
    gap: 2,
  },
  detailLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#8A8267',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.ink,
  },
  detailItems: {
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: COLORS.rule,
    paddingTop: 9,
    gap: 7,
  },
  detailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailItemText: {
    flex: 1,
    fontSize: 11.5,
    color: COLORS.ink,
  },
  detailItemAmt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.ink,
  },
  editBtn: {
    marginTop: 12,
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: COLORS.paperAlt,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.rule,
  },
  editBtnText: {
    color: COLORS.greenDeep,
    fontSize: 13,
    fontWeight: '600',
  },
  
  // Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(23, 20, 15, 0.45)',
    justifyContent: 'flex-end',
  },
  sheetContent: {
    backgroundColor: COLORS.paperCard,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.rule,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
  },
  sheetTitle: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '600',
    fontSize: 15,
    color: COLORS.greenDeep,
  },
  iconBtnRound: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.paperAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetBody: {
    padding: 16,
  },
  filterSheetStack: {
    paddingBottom: 24,
  },
  field: {
    marginBottom: 16,
  },
  fieldLabelStandalone: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#7A7157',
    marginBottom: 7,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.rule,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16, // more pill-like for filters
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: COLORS.brass,
    borderColor: COLORS.brass,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.ink,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  chipTextActive: {
    color: '#fff',
  },
  btnPrimary: {
    backgroundColor: COLORS.greenDeep,
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  btnGhost: {
    padding: 14,
    alignItems: 'center',
    marginTop: 4,
  },
  btnGhostText: {
    color: COLORS.ink,
    fontSize: 13,
    fontWeight: '500',
  },
  actionBtn: {
    padding: 16,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionBtnText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.ink,
  },
});
