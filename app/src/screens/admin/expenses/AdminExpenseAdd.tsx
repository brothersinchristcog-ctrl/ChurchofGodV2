import React, { useState, useMemo, useEffect } from 'react';
import { 
  StyleSheet, View, Text, ScrollView, TouchableOpacity, 
  TextInput, Modal, SafeAreaView, Platform, KeyboardAvoidingView, Alert, Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { 
  CalendarDays, Receipt, PlusCircle, Trash2, Check, 
  SlidersHorizontal, ChevronLeft, Plus, MoreHorizontal
} from 'lucide-react-native';
import { 
  COLORS, fmt, todayISO, uid, CATEGORY_CONFIG, 
  DEFAULT_CATEGORY_CFG, CATEGORY_NAMES, PAYMENT_METHODS,
  getCategoryIconComponent, formatDateToDDMMYYYY, parseDDMMYYYYToISO
} from './AdminExpenseUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Sheet = ({ title, visible, onClose, children }: { title: string, visible: boolean, onClose: () => void, children: React.ReactNode }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <KeyboardAvoidingView style={styles.sheetOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.sheetContent}>
        <View style={styles.sheetHandle} />
        <View style={styles.sheetHead}>
          <Text style={styles.sheetTitle}>{title}</Text>
          <TouchableOpacity style={styles.iconBtnRound} onPress={onClose}>
            <ChevronLeft size={20} color={COLORS.ink} />
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>
);

export default function AdminExpenseAdd({ onSave, suggestedEvents, suggestedCategories, initialExpense, onCancelEdit }: any) {
  const [date, setDate] = useState(formatDateToDDMMYYYY(todayISO()));
  const [vendor, setVendor] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptName, setReceiptName] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [localCategories, setLocalCategories] = useState<string[]>([]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [deleteCategoryTarget, setDeleteCategoryTarget] = useState<string | null>(null);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleAttachReceipt = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setReceiptUri(uri);
      const filename = uri.split('/').pop() || "receipt_scan.jpg";
      setReceiptName(filename);
    }
  };

  const confirmDeleteCategory = () => {
    if (!deleteCategoryTarget) return;
    setLocalCategories(prev => {
      const next = prev.filter(c => c !== deleteCategoryTarget);
      AsyncStorage.setItem('custom_categories', JSON.stringify(next)).catch(console.error);
      return next;
    });
    if (selectedCategories.includes(deleteCategoryTarget)) {
      toggleCategory(deleteCategoryTarget);
    }
    showToast('Category deleted');
    setDeleteCategoryTarget(null);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 2500);
  };

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [draftValues, setDraftValues] = useState<any>({});
  
  const [expenseType, setExpenseType] = useState("normal");
  const [eventName, setEventName] = useState("");
  const [eventPickerOpen, setEventPickerOpen] = useState(false);
  const [newEventInput, setNewEventInput] = useState("");
  const [localEvents, setLocalEvents] = useState<string[]>([]);

  useEffect(() => {
    if (initialExpense) {
      setDate(initialExpense.date ? formatDateToDDMMYYYY(initialExpense.date) : formatDateToDDMMYYYY(todayISO()));
      setVendor(initialExpense.vendor || "");
      setPaidBy(initialExpense.paidBy || "");
      setPaymentMethod(initialExpense.paymentMethod || "Cash");
      setNotes(initialExpense.notes || "");
      setReceiptName(initialExpense.receiptName || "");
      setReceiptUri(initialExpense.receiptUri || null);
      
      const cats = Array.from(new Set(initialExpense.items.map((i: any) => i.category))) as string[];
      setSelectedCategories(cats);
      
      const drafts: any = {};
      initialExpense.items.forEach((i: any) => {
        if (!drafts[i.category]) drafts[i.category] = [];
        
        let qty = i.qty ? String(i.qty) : "";
        let rate = i.rate ? String(i.rate) : "";
        let flatAmt = i.flatAmt ? String(i.flatAmt) : (i.amount ? String(i.amount) : "");
        let empName = i.empName || "";
        
        const cfg = getCfg(i.category);
        
        // Backward compatibility for legacy items that didn't save structured fields
        if (cfg.type === "qty" && !qty && !rate && i.amount) {
          qty = "1";
          rate = String(i.amount);
        }
        
        if (!empName && i.detail) {
          const match = i.detail.match(/^(.*?)\s*\(.*?\)$/);
          if (match) {
            empName = match[1];
          } else if (i.detail.includes(" \u00d7 ") || i.detail.includes(" x ")) {
            empName = ""; // It was just qty/rate without a name
          } else {
            empName = i.detail; // Only flat name provided
          }
        }
        
        let vendor = i.vendor || "";
        
        drafts[i.category].push({ qty, rate, flatAmt, empName, vendor });
      });
      setDraftValues(drafts);
      
      if (initialExpense.eventName) {
        setExpenseType("event");
        setEventName(initialExpense.eventName);
      } else {
        setExpenseType("normal");
        setEventName("");
      }
    }
    
    // Load custom categories
    AsyncStorage.getItem('custom_categories').then(val => {
      if (val) setLocalCategories(JSON.parse(val));
    }).catch(console.error);

    // Load custom events
    AsyncStorage.getItem('custom_events').then(val => {
      if (val) setLocalEvents(JSON.parse(val));
    }).catch(console.error);
  }, [initialExpense]);

  const categoryOptions = useMemo(() => {
    const merged = [...CATEGORY_NAMES, ...suggestedCategories, ...localCategories];
    return Array.from(new Set(merged));
  }, [suggestedCategories, localCategories]);

  const getCfg = (name: string) => CATEGORY_CONFIG[name] || DEFAULT_CATEGORY_CFG;
  const getDrafts = (name: string) => draftValues[name] || [{ qty: "", rate: "", flatAmt: "", empName: "", vendor: "" }];
  const setDraftField = (name: string, index: number, field: string, value: string) => {
    setDraftValues((prev: any) => {
      const arr = [...getDrafts(name)];
      arr[index] = { ...arr[index], [field]: value };
      return { ...prev, [name]: arr };
    });
  };
  const addDraftRow = (name: string) => {
    setDraftValues((prev: any) => ({
      ...prev,
      [name]: [...getDrafts(name), { qty: "", rate: "", flatAmt: "", empName: "", vendor: "" }]
    }));
  };
  const getComputedAmount = (name: string) => {
    const cfg = getCfg(name);
    return getDrafts(name).reduce((sum: number, d: any) => sum + (cfg.type === "qty" ? (Number(d.qty) || 0) * (Number(d.rate) || 0) : Number(d.flatAmt) || 0), 0);
  };

  const toggleCategory = (name: string) => {
    setSelectedCategories(prev => prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]);
  };
  const removeSelected = (name: string) => {
    setSelectedCategories(prev => prev.filter(c => c !== name));
    setDraftValues((prev: any) => { const next = { ...prev }; delete next[name]; return next; });
  };
  const createCategory = () => {
    const name = newCategoryInput.trim();
    if (!name) return;
    setLocalCategories(prev => {
      const next = Array.from(new Set([...prev, name]));
      AsyncStorage.setItem('custom_categories', JSON.stringify(next)).catch(console.error);
      return next;
    });
    setNewCategoryInput("");
    if (!selectedCategories.includes(name)) setSelectedCategories(prev => [...prev, name]);
  };

  const eventOptions = useMemo(() => {
    const merged = [...suggestedEvents, ...localEvents];
    return Array.from(new Set(merged));
  }, [suggestedEvents, localEvents]);

  const chooseEvent = (name: string) => { setEventName(name); };
  const createEvent = () => {
    const name = newEventInput.trim();
    if (!name) return;
    setLocalEvents(prev => {
      const next = Array.from(new Set([...prev, name]));
      AsyncStorage.setItem('custom_events', JSON.stringify(next)).catch(console.error);
      return next;
    });
    setEventName(name);
    setNewEventInput("");
  };

  const batchTotal = selectedCategories.reduce((s, name) => s + getComputedAmount(name), 0);

  const getDraftItems = () => {
    return selectedCategories.flatMap(name => {
      const cfg = getCfg(name);
      return getDrafts(name).map((d: any) => {
        const amount = cfg.type === "qty" ? (Number(d.qty) || 0) * (Number(d.rate) || 0) : Number(d.flatAmt) || 0;
        if (amount <= 0) return null;
        let detail;
        if (cfg.type === "qty") detail = d.empName ? `${d.empName} (${d.qty} ${cfg.qtyLabel} \u00d7 ${fmt(d.rate)})` : `${d.qty} ${cfg.qtyLabel} \u00d7 ${fmt(d.rate)}`;
        else if (cfg.type === "named") detail = d.empName || cfg.amountLabel;
        else detail = cfg.amountLabel;
        return { id: uid(), category: name, detail, amount, qty: d.qty, rate: d.rate, flatAmt: d.flatAmt, empName: d.empName || "", vendor: d.vendor || "" };
      }).filter(Boolean);
    });
  };

  const addBatchToEntry = () => {
    const newItems = getDraftItems();
    if (newItems.length === 0) return;
    setItems(prev => [...prev, ...newItems]);
    setSelectedCategories([]);
    setDraftValues({});
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const total = items.reduce((s, i) => s + Number(i.amount), 0) + getDraftItems().reduce((s, i: any) => s + Number(i.amount), 0);

  const handleSave = async () => {
    const finalItems = [...items, ...getDraftItems()];
    if (finalItems.length === 0) return;
    
    setIsSaving(true);
    await onSave({
      id: initialExpense?.id || uid(),
      date: parseDDMMYYYYToISO(date),
      vendor,
      paidBy,
      paymentMethod,
      reference,
      notes,
      createdBy: initialExpense?.createdBy || "Church Admin",
      createdAt: initialExpense?.createdAt || todayISO(),
      receiptName,
      receiptUri,
      items: finalItems,
      eventName: expenseType === "event" && eventName ? eventName : null,
    });
    // We don't need to clear state because AdminExpenseMain will unmount this component
    // when it switches to the 'history' tab.
    setIsSaving(false);
  };
  const displayItems = [...items, ...getDraftItems()];

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {toastMsg && (
        <View style={{ position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', zIndex: 999, elevation: 10 }}>
          <View style={styles.successToast}>
            <View style={styles.successIconCircle}>
              <Check size={16} color="#fff" strokeWidth={3} />
            </View>
            <Text style={styles.successText}>{toastMsg}</Text>
          </View>
        </View>
      )}

      {deleteCategoryTarget && (
        <Modal transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <View style={styles.stylishModalCard}>
              <View style={styles.modalIconCircle}>
                <Trash2 size={24} color={COLORS.redInk} />
              </View>
              <Text style={styles.modalTitle}>Delete Category</Text>
              <Text style={styles.modalSub}>Are you sure you want to delete '{deleteCategoryTarget}'? This action cannot be undone.</Text>
              
              <View style={styles.modalBtnRow}>
                <TouchableOpacity style={styles.modalBtnCancel} onPress={() => setDeleteCategoryTarget(null)}>
                  <Text style={styles.modalBtnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalBtnDanger} onPress={confirmDeleteCategory}>
                  <Text style={styles.modalBtnDangerText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {initialExpense && (
        <View style={styles.editBanner}>
          <Text style={styles.editBannerText}>Editing Expense</Text>
          <TouchableOpacity onPress={onCancelEdit}>
            <Text style={styles.editBannerCancel}>Cancel</Text>
          </TouchableOpacity>
        </View>
      )}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        <View style={styles.ledgerCard}>
          <Text style={styles.fieldLabelStandalone}>Expense Date</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} placeholder="DD-MM-YYYY" />

          <Text style={[styles.fieldLabelStandalone, { marginTop: 16 }]}>Expense Type</Text>
          <View style={[styles.chipRow, { marginBottom: expenseType === "event" ? 12 : 0 }]}>
            <TouchableOpacity 
              style={[styles.chip, expenseType === "normal" && styles.chipActive]} 
              onPress={() => setExpenseType("normal")}
            >
              <Receipt size={14} color={expenseType === "normal" ? "#fff" : COLORS.ink} />
              <Text style={[styles.chipText, expenseType === "normal" && styles.chipTextActive]}>Normal Expense</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.chip, expenseType === "event" && styles.chipActive]} 
              onPress={() => setExpenseType("event")}
            >
              <CalendarDays size={14} color={expenseType === "event" ? "#fff" : COLORS.ink} />
              <Text style={[styles.chipText, expenseType === "event" && styles.chipTextActive]}>Event Expense</Text>
            </TouchableOpacity>
          </View>

          {expenseType === "event" && (
            <TouchableOpacity style={[styles.categoryPickerBtn, { borderColor: COLORS.greenMid }]} onPress={() => setEventPickerOpen(true)}>
              <CalendarDays size={16} color={COLORS.greenDeep} />
              <Text style={styles.categoryPickerBtnText}>{eventName || "Choose or Create Event"}</Text>
            </TouchableOpacity>
          )}
        </View>

        {expenseType === "normal" && selectedCategories.length === 0 && (
          <View style={styles.ledgerCard}>
            <TouchableOpacity style={styles.categoryPickerBtn} onPress={() => setPickerOpen(true)}>
              <PlusCircle size={17} color={COLORS.greenDeep} />
              <Text style={styles.categoryPickerBtnText}>Choose Categories to Add</Text>
            </TouchableOpacity>
            <Text style={styles.newEventHint}>Tap to select as many categories as you spent on today, all at once.</Text>
          </View>
        )}

        {selectedCategories.length > 0 && (
          <>
            {selectedCategories.map((name) => {
              const cfg = getCfg(name);
              const amt = getComputedAmount(name);
              const CatIcon = getCategoryIconComponent(name);

              return (
                <View key={name} style={styles.ledgerCard}>
                  <View style={styles.dynamicFormHeadRow}>
                    <View style={styles.dynamicFormHead}>
                      <CatIcon size={18} color={COLORS.greenDeep} />
                      <Text style={styles.dynamicFormHeadText}>{name}</Text>
                    </View>
                    <TouchableOpacity style={styles.iconBtn} onPress={() => removeSelected(name)}>
                      <Trash2 size={16} color={COLORS.redInk} opacity={0.6} />
                    </TouchableOpacity>
                  </View>

                  {getDrafts(name).map((d: any, index: number) => {
                    const rowAmt = cfg.type === "qty" ? (Number(d.qty) || 0) * (Number(d.rate) || 0) : Number(d.flatAmt) || 0;
                    return (
                      <View key={index} style={{ marginBottom: index < getDrafts(name).length - 1 ? 24 : 0 }}>
                        {index > 0 && <View style={{ height: 1, backgroundColor: COLORS.rule, marginVertical: 16 }} />}
                        
                        {cfg.type === "qty" && (
                          <View style={styles.calcStack}>
                            {(name === 'Vegetables' || name === 'Groceries' || name === 'Snacks') && (
                              <>
                                <Text style={styles.fieldLabelStandalone}>Item Name (Optional)</Text>
                                <TextInput style={styles.input} value={d.empName} onChangeText={t => setDraftField(name, index, "empName", t)} placeholder="e.g. Tomato" />
                              </>
                            )}

                            <Text style={[styles.fieldLabelStandalone, { marginTop: (name === 'Vegetables' || name === 'Groceries' || name === 'Snacks') ? 12 : 0 }]}>{cfg.qtyLabel}</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={d.qty} onChangeText={t => setDraftField(name, index, "qty", t)} placeholder="0" />
                            
                            <Text style={[styles.fieldLabelStandalone, { marginTop: 12 }]}>{cfg.rateLabel}</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={d.rate} onChangeText={t => setDraftField(name, index, "rate", t)} placeholder="0" />
                            
                            <Text style={[styles.fieldLabelStandalone, { marginTop: 12 }]}>Vendor / Shop (Optional)</Text>
                            <TextInput style={styles.input} value={d.vendor} onChangeText={t => setDraftField(name, index, "vendor", t)} placeholder="e.g. Local Shop" />
                            
                            <View style={styles.calcResultRow}>
                              <Text style={styles.calcResultLabel}>AMOUNT</Text>
                              <Text style={styles.calcResultAmt}>{fmt(rowAmt)}</Text>
                            </View>
                          </View>
                        )}
                        
                        {cfg.type === "named" && (
                          <View style={styles.calcStack}>
                            <Text style={styles.fieldLabelStandalone}>{cfg.nameLabel}</Text>
                            <TextInput style={styles.input} value={d.empName} onChangeText={t => setDraftField(name, index, "empName", t)} placeholder="Name" />
                            
                            <Text style={[styles.fieldLabelStandalone, { marginTop: 12 }]}>{cfg.amountLabel}</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={d.flatAmt} onChangeText={t => setDraftField(name, index, "flatAmt", t)} placeholder="0" />
                            
                            <Text style={[styles.fieldLabelStandalone, { marginTop: 12 }]}>Vendor / Shop (Optional)</Text>
                            <TextInput style={styles.input} value={d.vendor} onChangeText={t => setDraftField(name, index, "vendor", t)} placeholder="e.g. Local Shop" />
                            
                            <View style={styles.calcResultRow}>
                              <Text style={styles.calcResultLabel}>AMOUNT</Text>
                              <Text style={styles.calcResultAmt}>{fmt(rowAmt)}</Text>
                            </View>
                          </View>
                        )}
                        
                        {cfg.type === "flat" && (
                          <View style={styles.calcStack}>
                            <Text style={styles.fieldLabelStandalone}>{cfg.amountLabel}</Text>
                            <TextInput style={styles.input} keyboardType="numeric" value={d.flatAmt} onChangeText={t => setDraftField(name, index, "flatAmt", t)} placeholder="0" />
                            
                            <Text style={[styles.fieldLabelStandalone, { marginTop: 12 }]}>Vendor / Shop (Optional)</Text>
                            <TextInput style={styles.input} value={d.vendor} onChangeText={t => setDraftField(name, index, "vendor", t)} placeholder="e.g. Local Shop" />
                            <View style={styles.calcResultRow}>
                              <Text style={styles.calcResultLabel}>AMOUNT</Text>
                              <Text style={styles.calcResultAmt}>{fmt(rowAmt)}</Text>
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}

                  {(name === 'Vegetables' || name === 'Groceries' || name === 'Snacks') && (
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, alignSelf: 'flex-start' }} onPress={() => addDraftRow(name)}>
                      <Plus size={14} color={COLORS.greenMid} style={{ marginRight: 4 }} />
                      <Text style={{ color: COLORS.greenMid, fontWeight: '600', fontSize: 13 }}>Add another {name}</Text>
                    </TouchableOpacity>
                  )}


                </View>
              );
            })}

            <View style={[styles.ledgerCard, styles.batchAddCard]}>
              <View style={[styles.calcResultRow, { backgroundColor: '#fff' }]}>
                <Text style={styles.calcResultLabel}>BATCH TOTAL</Text>
                <Text style={styles.calcResultAmt}>{fmt(batchTotal)}</Text>
              </View>

              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginTop: 16, alignSelf: 'flex-start' }} onPress={() => expenseType === 'event' ? setEventPickerOpen(true) : setPickerOpen(true)}>
                <Plus size={14} color={COLORS.greenMid} style={{ marginRight: 4 }} />
                <Text style={{ color: COLORS.greenMid, fontWeight: '600', fontSize: 13 }}>Add another category</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {displayItems.length > 0 && (
          <View style={styles.ledgerCard}>
            <Text style={styles.ledgerCardHead}>Expense Details</Text>

            <View style={styles.detailFormStack}>
              <Text style={styles.fieldLabelStandalone}>Vendor / Supplier (Global/Default)</Text>
              <TextInput style={styles.input} value={vendor} onChangeText={setVendor} placeholder="e.g. Sri Ganga Water Suppliers" />

              <Text style={[styles.fieldLabelStandalone, { marginTop: 12 }]}>Paid By</Text>
              <TextInput style={styles.input} value={paidBy} onChangeText={setPaidBy} placeholder="e.g. Bro. Samuel" />

              <Text style={[styles.fieldLabelStandalone, { marginTop: 12 }]}>Payment Method</Text>
              <View style={styles.chipRow}>
                {PAYMENT_METHODS.map(p => (
                  <TouchableOpacity 
                    key={p.id} 
                    style={[styles.chip, paymentMethod === p.id && styles.chipActive]} 
                    onPress={() => setPaymentMethod(p.id)}
                  >
                    <p.icon size={14} color={paymentMethod === p.id ? "#fff" : COLORS.ink} strokeWidth={1.75} />
                    <Text style={[styles.chipText, paymentMethod === p.id && styles.chipTextActive]}>{p.id}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.fieldLabelStandalone, { marginTop: 12 }]}>Reference No.</Text>
              <TextInput style={styles.input} value={reference} onChangeText={setReference} placeholder="Optional" />

              <Text style={[styles.fieldLabelStandalone, { marginTop: 12 }]}>Notes</Text>
              <TextInput style={styles.input} value={notes} onChangeText={setNotes} placeholder="Optional notes" />

              <Text style={[styles.fieldLabelStandalone, { marginTop: 12 }]}>Attach Receipt</Text>
              <TouchableOpacity style={styles.uploadBox} onPress={() => receiptUri ? setPreviewOpen(true) : handleAttachReceipt()}>
                <Receipt size={16} color="#7A7157" />
                <Text style={styles.uploadBoxText} numberOfLines={1}>{receiptName || "Tap to attach invoice / bill / photo"}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16, opacity: isSaving ? 0.7 : 1 }]} onPress={handleSave} disabled={isSaving}>
              <Check size={18} color="#fff" />
              <Text style={styles.btnPrimaryText}>
                {isSaving ? "Saving..." : initialExpense ? "Update Expense" : "Save Expense"} · {fmt(total)}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <Sheet title="Choose Categories" visible={pickerOpen} onClose={() => setPickerOpen(false)}>
          <View style={styles.categoryGrid}>
            {categoryOptions.map(name => {
              const active = selectedCategories.includes(name);
              const CatIcon = getCategoryIconComponent(name);
              return (
                <TouchableOpacity 
                  key={name} 
                  style={[styles.categoryChip, active && styles.categoryChipActive]} 
                  onPress={() => toggleCategory(name)}
                  onLongPress={() => {
                    if (localCategories.includes(name)) {
                      setDeleteCategoryTarget(name);
                    }
                  }}
                >
                  <CatIcon size={16} color={active ? "#fff" : COLORS.ink} />
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{name}</Text>
                  {active && <Check size={14} color="#fff" style={styles.categoryChipCheck} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={styles.newEventRow}>
            <Text style={styles.fieldLabelStandalone}>New Category</Text>
            <View style={styles.newEventInputRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={newCategoryInput} onChangeText={setNewCategoryInput} placeholder="e.g. Choir Robes" />
              <TouchableOpacity style={[styles.btnBrass, !newCategoryInput.trim() && { opacity: 0.5 }]} disabled={!newCategoryInput.trim()} onPress={createCategory}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Add</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.newEventHint}>Spent on something not listed? Type a category and add it on the spot.</Text>
          </View>
          <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={() => setPickerOpen(false)}>
            <Text style={styles.btnPrimaryText}>Done{selectedCategories.length > 0 ? ` — ${selectedCategories.length} selected` : ""}</Text>
          </TouchableOpacity>
        </Sheet>

        <Sheet title="Choose Event & Categories" visible={eventPickerOpen} onClose={() => setEventPickerOpen(false)}>
          <View style={styles.eventOptionList}>
            {eventOptions.map(name => (
              <TouchableOpacity key={name} style={[styles.eventOption, eventName === name && styles.eventOptionActive]} onPress={() => chooseEvent(name)}>
                <CalendarDays size={16} color={eventName === name ? COLORS.greenDeep : COLORS.ink} />
                <Text style={[styles.eventOptionText, eventName === name && styles.eventOptionTextActive]}>{name}</Text>
                {eventName === name && <Check size={16} color={COLORS.greenDeep} />}
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.newEventRow}>
            <Text style={styles.fieldLabelStandalone}>New Event</Text>
            <View style={styles.newEventInputRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={newEventInput} onChangeText={setNewEventInput} placeholder="e.g. Baptism Service" />
              <TouchableOpacity style={[styles.btnBrass, !newEventInput.trim() && { opacity: 0.5 }]} disabled={!newEventInput.trim()} onPress={createEvent}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Add</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.newEventHint}>Not on the list? Type a name and add it — events aren't fixed.</Text>
          </View>
          
          <View style={{ height: 1, backgroundColor: COLORS.rule, marginVertical: 24 }} />
          <Text style={[styles.fieldLabelStandalone, { marginBottom: 12 }]}>Categories</Text>
          <View style={styles.categoryGrid}>
            {categoryOptions.map(name => {
              const active = selectedCategories.includes(name);
              const CatIcon = getCategoryIconComponent(name);
              return (
                <TouchableOpacity 
                  key={name} 
                  style={[styles.categoryChip, active && styles.categoryChipActive]} 
                  onPress={() => toggleCategory(name)}
                  onLongPress={() => {
                    if (localCategories.includes(name)) {
                      setDeleteCategoryTarget(name);
                    }
                  }}
                >
                  <CatIcon size={16} color={active ? "#fff" : COLORS.ink} />
                  <Text style={[styles.categoryChipText, active && styles.categoryChipTextActive]}>{name}</Text>
                  {active && <Check size={14} color="#fff" style={styles.categoryChipCheck} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.newEventRow, { borderTopWidth: 0, marginTop: 0, paddingTop: 0 }]}>
            <Text style={styles.fieldLabelStandalone}>New Category</Text>
            <View style={styles.newEventInputRow}>
              <TextInput style={[styles.input, { flex: 1 }]} value={newCategoryInput} onChangeText={setNewCategoryInput} placeholder="e.g. Choir Robes" />
              <TouchableOpacity style={[styles.btnBrass, !newCategoryInput.trim() && { opacity: 0.5 }]} disabled={!newCategoryInput.trim()} onPress={createCategory}>
                <Text style={{ color: '#fff', fontWeight: '600', fontSize: 13 }}>Add</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.newEventHint}>Spent on something not listed? Type a category and add it on the spot.</Text>
          </View>

          <TouchableOpacity style={[styles.btnPrimary, { marginTop: 16 }]} onPress={() => setEventPickerOpen(false)}>
            <Text style={styles.btnPrimaryText}>Done{selectedCategories.length > 0 ? ` — ${selectedCategories.length} selected` : ""}</Text>
          </TouchableOpacity>
        </Sheet>

      </ScrollView>

      {previewOpen && receiptUri && (
        <Modal visible={previewOpen} transparent animationType="fade" onRequestClose={() => setPreviewOpen(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' }}>
            <TouchableOpacity style={{ position: 'absolute', top: 50, right: 20, padding: 10, zIndex: 10 }} onPress={() => setPreviewOpen(false)}>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold' }}>Close</Text>
            </TouchableOpacity>
            <Image source={{ uri: receiptUri }} style={{ width: '100%', height: '70%', resizeMode: 'contain' }} />
            <View style={{ flexDirection: 'row', marginTop: 30, gap: 16 }}>
              <TouchableOpacity onPress={() => { setPreviewOpen(false); handleAttachReceipt(); }} style={[styles.btnPrimary, { backgroundColor: '#444' }]}>
                <Text style={styles.btnPrimaryText}>Change Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setReceiptUri(null); setReceiptName(""); setPreviewOpen(false); }} style={[styles.btnPrimary, { backgroundColor: COLORS.redInk }]}>
                <Text style={styles.btnPrimaryText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  editBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.brass,
  },
  editBannerText: {
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '600',
    fontSize: 14,
  },
  editBannerCancel: {
    color: '#fff',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  ledgerCard: {
    backgroundColor: COLORS.paperCard,
    borderWidth: 1,
    borderColor: COLORS.rule,
    borderRadius: 8,
    padding: 16,
  },
  fieldLabelStandalone: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9.5,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: '#7A7157',
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.rule,
    backgroundColor: '#fff',
    padding: 11,
    fontSize: 14,
    color: COLORS.ink,
    borderRadius: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.rule,
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  chipActive: {
    backgroundColor: COLORS.greenDeep,
    borderColor: COLORS.greenDeep,
  },
  chipText: {
    fontSize: 12,
    color: COLORS.ink,
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
  },
  chipTextActive: {
    color: '#fff',
  },
  categoryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.brass,
    backgroundColor: COLORS.paperCard,
    padding: 14,
    borderRadius: 6,
    gap: 8,
  },
  categoryPickerBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.greenDeep,
  },
  newEventHint: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    color: '#8A8267',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },
  dynamicFormHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  dynamicFormHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dynamicFormHeadText: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '600',
    color: COLORS.greenDeep,
    fontSize: 15,
  },
  iconBtn: {
    padding: 4,
  },
  calcStack: {
    flexDirection: 'column',
  },
  calcResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.paperCard,
    borderWidth: 1,
    borderColor: COLORS.rule,
    padding: 10,
    marginTop: 8,
    borderRadius: 4,
  },
  calcResultLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 10,
    letterSpacing: 0.5,
    color: '#7A7157',
  },
  calcResultAmt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 18,
    color: COLORS.greenDeep,
    fontWeight: '600',
  },
  batchAddCard: {
    borderStyle: 'dashed',
    borderColor: COLORS.brass,
  },
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.greenDeep,
    padding: 14,
    borderRadius: 6,
    gap: 8,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  ledgerCardHead: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.greenDeep,
    marginBottom: 12,
  },
  ledgerTable: {
    flexDirection: 'column',
  },
  ledgerLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.paperAlt,
    gap: 8,
  },
  ledgerLineIcon: {
    width: 24,
    alignItems: 'center',
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
  ledgerTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: COLORS.ink,
    marginTop: 4,
  },
  ledgerTotalLabel: {
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontWeight: '600',
    fontSize: 15,
    color: COLORS.greenDeep,
  },
  ledgerTotalAmt: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontWeight: '600',
    fontSize: 15,
    color: COLORS.greenDeep,
  },
  detailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 6,
  },
  detailsToggleText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 11,
    color: COLORS.brass,
  },
  detailFormStack: {
    marginTop: 8,
    paddingTop: 14,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: COLORS.rule,
  },
  uploadBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.rule,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    gap: 8,
  },
  uploadBoxText: {
    fontSize: 12.5,
    color: '#7A7157',
  },
  
  // Bottom Sheet
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
    paddingBottom: Platform.OS === 'ios' ? 40 : 48,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  categoryChip: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.rule,
    padding: 12,
    borderRadius: 6,
    gap: 8,
  },
  categoryChipActive: {
    backgroundColor: COLORS.brass,
    borderColor: COLORS.brass,
  },
  categoryChipText: {
    fontSize: 13,
    color: COLORS.ink,
    flex: 1,
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  categoryChipCheck: {
    marginLeft: 6,
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  successIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.greenDeep,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  successText: {
    color: COLORS.greenDeep,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  stylishModalCard: {
    backgroundColor: '#fff',
    width: '100%',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.ink,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 8,
  },
  modalSub: {
    fontSize: 14,
    color: COLORS.subtleText,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalBtnCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  modalBtnCancelText: {
    color: COLORS.subtleText,
    fontWeight: '600',
    fontSize: 15,
  },
  modalBtnDanger: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: COLORS.redInk,
    alignItems: 'center',
  },
  modalBtnDangerText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  newEventRow: {
    marginTop: 16,
    borderTopWidth: 1,
    borderStyle: 'dashed',
    borderTopColor: COLORS.rule,
    paddingTop: 16,
    marginBottom: 20,
  },
  newEventInputRow: {
    flexDirection: 'row',
    gap: 8,
  },
  btnBrass: {
    backgroundColor: COLORS.greenMid,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  eventOptionList: {
    flexDirection: 'column',
    gap: 8,
  },
  eventOption: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.rule,
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 6,
    gap: 10,
  },
  eventOptionActive: {
    borderColor: COLORS.brass,
    backgroundColor: COLORS.paperCard,
  },
  eventOptionText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.ink,
  },
  eventOptionTextActive: {
    color: COLORS.greenDeep,
    fontWeight: '600',
  }
});


