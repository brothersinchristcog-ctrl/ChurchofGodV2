import React, { useState, useMemo, useContext, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, ActivityIndicator, Alert, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LayoutDashboard, History, PlusCircle, Receipt, Menu, Check } from 'lucide-react-native';

// Import sub-screens
import AdminExpenseDashboard from './AdminExpenseDashboard';
import AdminExpenseHistory from './AdminExpenseHistory';
import AdminExpenseAdd from './AdminExpenseAdd';
import AdminExpenseInvoices from './AdminExpenseInvoices';
import AdminExpenseApprovals from './AdminExpenseApprovals';
import { COLORS } from './AdminExpenseUtils';
import { AdminTabContext } from '../../../context/AdminTabContext';
import { db, functions, FieldValue } from '../../../services/firebaseConfig';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../../context/AuthContext';

const TAB_TITLES: any = {
  dashboard: 'Digital Ledger',
  add: 'New Expense',
  history: 'Expenses',
  invoice: 'Generate Invoice',
  approvals: 'Approvals'
};

const BASE_TABS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "history",   label: "Expenses",  icon: History },
  { id: "invoice",   label: "Invoices",  icon: Receipt },
];

export default function AdminExpenseMain() {
  const { openDrawer } = useContext(AdminTabContext) as any;
  const { member } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [historyRange, setHistoryRange] = useState("all");
  const [pendingInvoiceEntries, setPendingInvoiceEntries] = useState<any[] | null>(null);

  const TABS = useMemo(() => {
    const ut = member?.userType?.toLowerCase() || '';
    const isAdmin = ut === 'admin' || ut === 'pastor' || ut === 'system administrator' || ut.includes('admin') || ut.includes('pastor');
    
    if (isAdmin) {
      return [...BASE_TABS, { id: "approvals", label: "Approvals", icon: Check }];
    }
    return BASE_TABS;
  }, [member?.userType]);

  useEffect(() => {
    const unsubscribe = db.collection('ledger_expenses')
      .orderBy('date', 'desc')
      .onSnapshot(
        (snapshot: any) => {
          const fetched = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data()
          }));
          setExpenses(fetched);
          setLoading(false);
        },
        (error: any) => {
          console.error("Error fetching ledger expenses:", error);
          setLoading(false);
        }
      );

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('NAVIGATE_ADMIN_INNER', (innerTab) => {
      setActiveTab(innerTab);
    });
    return () => sub.remove();
  }, []);

  const goToHistoryWithRange = (range: string) => {
    setHistoryRange(range);
    setActiveTab("history");
  };
  
  const handleGenerateInvoiceFromHistory = async (entries: any[]) => {
    if (entries.length === 0) return;
    
    if (entries.length === 1 && entries[0].invoiceNumber) {
      setPendingInvoiceEntries(entries);
      setActiveTab("invoice");
      return;
    }
    
    // Calculate max sequence from current loaded expenses across both single and array invoice fields
    let maxSeq = 0;
    expenses.forEach((ex: any) => {
      const checkMax = (inv: string) => {
        if (inv && inv.startsWith('INV-COG')) {
          const numStr = inv.replace('INV-COG', '');
          const num = parseInt(numStr, 10);
          if (!isNaN(num) && num > maxSeq) {
            maxSeq = num;
          }
        }
      };
      
      if (ex.invoiceNumber) checkMax(ex.invoiceNumber);
      if (ex.invoiceNumbers && Array.isArray(ex.invoiceNumbers)) {
        ex.invoiceNumbers.forEach(checkMax);
      }
    });

    // Also check AsyncStorage to prevent local race conditions if state hasn't synced
    let asyncSeq = parseInt(await AsyncStorage.getItem('inv_seq') || '0', 10);
    
    // Use the highest sequence found to ensure we never reuse an invoice number
    let nextSeq = Math.max(maxSeq, asyncSeq) + 1;
    await AsyncStorage.setItem('inv_seq', nextSeq.toString());

    const invNo = `INV-COG${nextSeq.toString().padStart(4, '0')}`;
    
    const invoiceDate = new Date().toISOString();
    const batch = db.batch();
    
    let updatedCount = 0;
    entries.forEach(e => {
      if (e.invoiceNumber !== invNo && !(e.invoiceNumbers || []).includes(invNo)) {
        const ref = db.collection('ledger_expenses').doc(e.id);
        batch.update(ref, { 
          invoiceNumber: e.invoiceNumber || invNo, // preserve primary for UI fallback
          invoiceNumbers: FieldValue.arrayUnion(invNo), 
          invoiceDate 
        });
        updatedCount++;
      }
    });
    
    if (updatedCount > 0) {
      try {
        await batch.commit();
      } catch (err) {
        console.error("Failed to save invoice number:", err);
        Alert.alert("Error", "Could not generate invoice.");
        return;
      }
    }
    
    // Pass the actual updated entries to Invoices tab
    const updatedEntries = entries.map(e => ({ 
      ...e, 
      invoiceNumber: e.invoiceNumber || invNo, 
      invoiceNumbers: [...(e.invoiceNumbers || []), invNo],
      invoiceDate: e.invoiceDate || invoiceDate 
    }));
    
    setPendingInvoiceEntries(updatedEntries);
    setActiveTab("invoice");
  };

  const handleDeleteInvoice = async (invNo: string) => {
    try {
      const batch = db.batch();
      let updatedCount = 0;
      expenses.forEach(e => {
        const hasInv = e.invoiceNumber === invNo || (e.invoiceNumbers && e.invoiceNumbers.includes(invNo));
        if (hasInv) {
          const ref = db.collection('ledger_expenses').doc(e.id);
          const updateData: any = {
            invoiceNumbers: FieldValue.arrayRemove(invNo)
          };
          if (e.invoiceNumber === invNo) {
             const remaining = (e.invoiceNumbers || []).filter((i: string) => i !== invNo);
             updateData.invoiceNumber = remaining.length > 0 ? remaining[0] : null;
             if (remaining.length === 0) updateData.invoiceDate = null;
          }
          batch.update(ref, updateData);
          updatedCount++;
        }
      });
      if (updatedCount > 0) {
        await batch.commit();
        Alert.alert("Deleted", "Invoice has been deleted.");
      }
    } catch (err) {
      console.error("Error deleting invoice:", err);
      Alert.alert("Error", "Could not delete the invoice.");
    }
  };
  
  // Custom suggestion logic based on expenses
  const suggestedEvents = useMemo(() => {
    const events = expenses.map((e: any) => e.eventName).filter(Boolean);
    return Array.from(new Set(events));
  }, [expenses]);
  
  const usedCategories = useMemo(() => {
    const cats: string[] = [];
    expenses.forEach((e: any) => {
      e.items.forEach((i: any) => cats.push(i.category));
    });
    return Array.from(new Set(cats));
  }, [expenses]);

  const handleSaveExpense = async (newExpense: any) => {
    try {
      // If we are editing an existing expense, preserve invoice numbers but reset approval status
      const updatePayload = {
        ...newExpense,
        status: 'Draft',
        approvedBy: FieldValue.delete(),
        approvedAt: FieldValue.delete(),
        approvalRemarks: FieldValue.delete(),
        approverId: FieldValue.delete(),
        approverName: FieldValue.delete(),
      };
      await db.collection('ledger_expenses').doc(newExpense.id).set(updatePayload, { merge: true });
      setEditingExpense(null);
      setActiveTab('history');
    } catch (error) {
      console.error("Error saving expense:", error);
      Alert.alert("Error", "Could not save the expense.");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await db.collection('ledger_expenses').doc(id).delete();
    } catch (error) {
      console.error("Error deleting expense:", error);
      Alert.alert("Error", "Could not delete the expense.");
    }
  };

  const handleEdit = (expense: any) => {
    setEditingExpense(expense);
    setActiveTab('add');
  };

  const handleSendForApproval = async (expense: any, assignedAdmin?: any) => {
    try {
      let updateData: any = {
        status: 'Pending Approval',
        submittedAt: new Date().toISOString(),
        submittedBy: member?.name || 'Admin',
        approvedBy: FieldValue.delete(),
        rejectedReason: FieldValue.delete()
      };

      if (assignedAdmin) {
        updateData.approverId = assignedAdmin.id;
        updateData.approverName = assignedAdmin.name;
      }

      if (!expense.invoiceNumber) {
        let seq = parseInt(await AsyncStorage.getItem('inv_seq') || '0', 10);
        seq += 1;
        await AsyncStorage.setItem('inv_seq', seq.toString());
        const invNo = `INV-COG${seq.toString().padStart(4, '0')}`;
        updateData.invoiceNumber = invNo;
      }

      await db.collection('ledger_expenses').doc(expense.id).update(updateData);
      Alert.alert("Success", "Expense has been sent for approval.");

      try {
        const notifyMembers = functions().app.functions('asia-south1').httpsCallable('notifyMembers');
        
        // If an admin is assigned, we ONLY want to notify them.
        // We clean the phone first to ensure we don't pass an empty string or whitespace
        // which would cause the Cloud Function to fallback to broadcasting to everyone.
        const cleanPhone = assignedAdmin?.phone ? assignedAdmin.phone.replace(/[^0-9]/g, '') : '';
        
        if (assignedAdmin && cleanPhone.length >= 10) {
          await notifyMembers({
            title: "New Expense Approval",
            body: `${updateData.submittedBy} has sent an expense to ${assignedAdmin.name} for approval.`,
            targetPhone: assignedAdmin.phone,
            target: "admin", // Safety fallback so it never broadcasts to 'all'
            type: "expense_approval"
          });
        } else if (!assignedAdmin) {
          // Fallback if no specific admin was assigned
          await notifyMembers({
            title: "New Expense Approval",
            body: `${updateData.submittedBy} has submitted an expense for approval.`,
            target: "admin",
            type: "expense_approval"
          });
        }
      } catch (err) {
        console.error("Failed to notify admins:", err);
      }
    } catch (err) {
      console.error("Error sending for approval:", err);
      Alert.alert("Error", "Could not send for approval.");
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.greenDeep} />
          <Text style={{ marginTop: 12, color: COLORS.subtleText }}>Syncing Ledger...</Text>
        </View>
      );
    }

    switch (activeTab) {
      case 'dashboard':
        return <AdminExpenseDashboard expenses={expenses} goTo={setActiveTab} goToRange={goToHistoryWithRange} />;
      case 'history':
        return <AdminExpenseHistory expenses={expenses} usedEvents={suggestedEvents} customCategories={usedCategories} onEdit={handleEdit} onDelete={handleDeleteExpense} initialRange={historyRange} onGenerateInvoice={handleGenerateInvoiceFromHistory} onSendForApproval={handleSendForApproval} />;
      case 'add':
        return <AdminExpenseAdd onSave={handleSaveExpense} suggestedEvents={suggestedEvents} suggestedCategories={usedCategories} initialExpense={editingExpense} onCancelEdit={() => { setEditingExpense(null); setActiveTab('history'); }} />;
      case 'invoice':
        return <AdminExpenseInvoices expenses={expenses} pendingInvoiceEntries={pendingInvoiceEntries} clearPendingInvoice={() => setPendingInvoiceEntries(null)} onSendForApproval={handleSendForApproval} onDeleteInvoice={handleDeleteInvoice} />;
      case 'approvals':
        return <AdminExpenseApprovals expenses={expenses} onGenerateInvoice={handleGenerateInvoiceFromHistory} onDelete={handleDeleteExpense} />;
      default:
        return <AdminExpenseDashboard expenses={expenses} goTo={setActiveTab} goToRange={goToHistoryWithRange} />;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      {/* ── Top App Bar ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.iconBtn} onPress={openDrawer}>
          <Menu size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{TAB_TITLES[activeTab]}</Text>
        <View style={styles.iconBtn}>
          {activeTab === 'history' && (
            <TouchableOpacity onPress={() => { setEditingExpense(null); setActiveTab('add'); }}>
              <PlusCircle size={24} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.contentContainer}>
        {renderContent()}
      </View>

      {/* Bottom Navigation Bar */}
      <View style={styles.tabbar}>
        {TABS.map((t) => {
          const active = activeTab === t.id;
          const Icon = t.icon as any;
          return (
            <TouchableOpacity 
              key={t.id} 
              style={styles.tabBtn} 
              onPress={() => {
                if (t.id === 'history') setHistoryRange('all');
                setActiveTab(t.id);
              }}
            >
              <Icon size={24} color={active ? COLORS.greenDeep : COLORS.subtleText} />
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rule,
    backgroundColor: 'rgba(255, 249, 233, 0.95)',
  },
  headerTitle: {
    fontSize: 19,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  iconBtn: {
    padding: 6,
    width: 36,
  },
  contentContainer: {
    flex: 1,
  },
  tabbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: COLORS.greenDeep,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 196, 138, 0.2)', // brass with low opacity
    position: 'relative',
    zIndex: 20,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tabText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 9.5,
    letterSpacing: 0.2,
    color: '#9BAB9F',
    marginTop: 4,
  },
  tabTextActive: {
    color: COLORS.brassLight,
    fontWeight: '600',
  },
  tabBtnFab: {
    position: 'relative',
  },
  fabCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.brass,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -26,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 3,
    borderColor: COLORS.greenDeep,
  },
  fabCircleActive: {
    backgroundColor: COLORS.brass, // keep it brass even when active
  },
  activeIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.brassLight,
    marginTop: 6,
  }
});

// IDE refresh trigger
