import React from 'react';
import { View, Text, Platform } from 'react-native';
import {
  Droplets, Zap, Wifi, Flame, Cookie, UtensilsCrossed, Coffee, Sparkles,
  Wrench, Sofa, Speaker, Flower2, Plane, Mic2, Fuel, Wallet, HandCoins,
  PenLine, Printer, Users, BookOpen, BookMarked, HeartHandshake, HardHat,
  Hammer, Stethoscope, Gift, MoreHorizontal, LayoutDashboard, PlusCircle,
  History, Search, Trash2,
  ChevronRight, ChevronLeft, Check, Receipt, CreditCard, Landmark,
  Smartphone, Banknote, ScrollText, SlidersHorizontal,
  CalendarDays, Plus, FileText, FileDown, Leaf, ShoppingCart
} from 'lucide-react-native';

export const CATEGORY_CONFIG: any = {
  Water:            { icon: Droplets,        group: "Water",       type: "qty",   qtyLabel: "Cans",      rateLabel: "Price / Can" },
  Electricity:      { icon: Zap,             group: "Electricity", type: "flat",  amountLabel: "Bill Amount" },
  Internet:         { icon: Wifi,            group: "Maintenance", type: "flat",  amountLabel: "Monthly Bill" },
  Gas:              { icon: Flame,           group: "Food",        type: "flat",  amountLabel: "Bill Amount" },
  Snacks:           { icon: Cookie,          group: "Food",        type: "qty",   qtyLabel: "Quantity",  rateLabel: "Price" },
  Vegetables:       { icon: Leaf,            group: "Food",        type: "qty",   qtyLabel: "Kgs",       rateLabel: "Price / Kg" },
  Groceries:        { icon: ShoppingCart,    group: "Food",        type: "qty",   qtyLabel: "Quantity",  rateLabel: "Price" },
  Lunch:            { icon: UtensilsCrossed, group: "Food",        type: "qty",   qtyLabel: "People",    rateLabel: "Cost / Person" },
  Dinner:           { icon: UtensilsCrossed, group: "Food",        type: "qty",   qtyLabel: "People",    rateLabel: "Cost / Person" },
  Tea:              { icon: Coffee,          group: "Food",        type: "qty",   qtyLabel: "People",    rateLabel: "Rate" },
  Coffee:           { icon: Coffee,          group: "Food",        type: "qty",   qtyLabel: "People",    rateLabel: "Rate" },
  Cleaning:         { icon: Sparkles,        group: "Maintenance", type: "flat",  amountLabel: "Amount" },
  Maintenance:      { icon: Wrench,          group: "Maintenance", type: "flat",  amountLabel: "Amount" },
  Furniture:        { icon: Sofa,            group: "Maintenance", type: "flat",  amountLabel: "Amount" },
  "Sound System":   { icon: Speaker,         group: "Maintenance", type: "flat",  amountLabel: "Amount" },
  "Stage Decoration": { icon: Flower2,       group: "Others",      type: "flat",  amountLabel: "Amount" },
  Flowers:          { icon: Flower2,         group: "Others",      type: "flat",  amountLabel: "Amount" },
  "Pastor Travel":  { icon: Plane,           group: "Others",      type: "flat",  amountLabel: "Amount" },
  "Guest Speaker":  { icon: Mic2,            group: "Others",      type: "flat",  amountLabel: "Amount" },
  Fuel:             { icon: Fuel,            group: "Others",      type: "qty",   qtyLabel: "Litres",    rateLabel: "Price / Litre" },
  Salary:           { icon: Wallet,          group: "Others",      type: "named", nameLabel: "Employee", amountLabel: "Salary" },
  "Offering Transfer": { icon: HandCoins,    group: "Others",      type: "flat",  amountLabel: "Amount" },
  Stationery:       { icon: PenLine,         group: "Others",      type: "flat",  amountLabel: "Amount" },
  Printer:          { icon: Printer,         group: "Others",      type: "flat",  amountLabel: "Amount" },
  "Youth Program":  { icon: Users,           group: "Others",      type: "flat",  amountLabel: "Amount" },
  "Sunday School":  { icon: BookOpen,        group: "Others",      type: "flat",  amountLabel: "Amount" },
  "Bible Distribution": { icon: BookMarked,  group: "Others",      type: "flat",  amountLabel: "Amount" },
  Evangelism:       { icon: HeartHandshake,  group: "Others",      type: "flat",  amountLabel: "Amount" },
  Construction:     { icon: HardHat,         group: "Maintenance", type: "qty",   qtyLabel: "Quantity",  rateLabel: "Rate" },
  Repairs:          { icon: Hammer,          group: "Maintenance", type: "flat",  amountLabel: "Amount" },
  "Medical Help":   { icon: Stethoscope,     group: "Others",      type: "flat",  amountLabel: "Amount" },
  Charity:          { icon: Gift,            group: "Others",      type: "flat",  amountLabel: "Amount" },
  Miscellaneous:    { icon: MoreHorizontal,  group: "Others",      type: "flat",  amountLabel: "Amount" },
};

export const CATEGORY_NAMES = Object.keys(CATEGORY_CONFIG);

export const GROUP_COLORS: any = {
  Electricity: "#B08D3E",
  Water:       "#3E7A8C",
  Food:        "#5B7A4F",
  Maintenance: "#8B5E3C",
  Others:      "#7A6A8A",
};

export const PAYMENT_METHODS = [
  { id: "Cash",   icon: Banknote },
  { id: "UPI",    icon: Smartphone },
  { id: "Bank",   icon: Landmark },
  { id: "Cheque", icon: ScrollText },
  { id: "Card",   icon: CreditCard },
  { id: "Pending", icon: Receipt },
];

export const DEFAULT_CATEGORY_CFG = { icon: MoreHorizontal, group: "Others", type: "flat", amountLabel: "Amount" };
export const DEFAULT_EVENT_SUGGESTIONS = ["Sunday Service", "Bible Study", "Fasting Prayer", "Special Meeting"];

export const fmt = (n: any) => "\u20B9" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });
export const todayISO = () => new Date().toISOString().slice(0, 10);
export const uid = () => Math.random().toString(36).slice(2, 10);

export const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function isoAdd(dateStr: string, days: number) {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekRangeFor(anchorDateStr: string) {
  const d = new Date(anchorDateStr + "T00:00:00");
  const mondayOffset = (d.getDay() + 6) % 7; // 0 = Monday
  const start = isoAdd(anchorDateStr, -mondayOffset);
  const end = isoAdd(start, 6);
  return { start, end };
}

export function prettyDate(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateToDDMMYYYY(isoDate: string) {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3 && parts[0].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return isoDate;
}

export function formatDateTime(isoString: string) {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = MONTH_NAMES[d.getMonth()].slice(0, 3);
    const year = d.getFullYear();
    
    // If it's just a YYYY-MM-DD string, it might not have time
    if (isoString.length === 10) {
      return `${day} ${month} ${year}`;
    }
    
    let hours = d.getHours();
    const mins = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; 
    const strHours = String(hours).padStart(2, '0');
    
    return `${day} ${month} ${year}, ${strHours}:${mins} ${ampm}`;
  } catch (e) {
    return isoString;
  }
}

export function parseDDMMYYYYToISO(ddmmyyyy: string) {
  if (!ddmmyyyy) return "";
  const parts = ddmmyyyy.split("-");
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  return ddmmyyyy;
}

// Removed seedExpenses for Firebase integration
export function GroupOf(category: string) {
  return (CATEGORY_CONFIG[category] || {}).group || "Others";
}

export function getCategoryIconComponent(name: string) {
  return (CATEGORY_CONFIG[name] || {}).icon || MoreHorizontal;
}

// Common colors from CSS
export const COLORS = {
  background: '#fff9e9',
  paperCard: '#FAF7EC',
  primary: '#0a3221',
  subtleText: '#7A7157',
  rule: '#CBBF9C',
  brass: '#D4C48A',
  brassLight: '#E8DEB6',
  greenDeep: '#174A33',
  greenMid: '#2C6E4F',
  redInk: '#8B3A2A',
  ink: '#22291F',
  paperAlt: '#E9E1C7'
};

export function PaymentStamp({ status }: { status?: string }) {
  const isPending = status === 'Pending';
  const color = isPending ? COLORS.redInk : COLORS.greenMid;
  const text = isPending ? 'PENDING' : 'PAID';
  return (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: isPending ? '#FDE8E8' : '#E8F5E9',
      borderRadius: 12,
    }}>
      <Text style={{
        color: color,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
      }}>
        {text}
      </Text>
    </View>
  );
}

export function ApprovalBadge({ status }: { status?: string }) {
  const normStatus = status || 'Draft';
  let color = COLORS.subtleText;
  let bg = '#E5E7EB';
  
  if (normStatus === 'Pending Approval') {
    color = '#D97706'; // Orange
    bg = '#FEF3C7';
  } else if (normStatus === 'Approved') {
    color = COLORS.greenMid;
    bg = '#E8F5E9';
  } else if (normStatus === 'Rejected') {
    color = COLORS.redInk;
    bg = '#FDE8E8';
  }

  return (
    <View style={{
      paddingHorizontal: 8,
      paddingVertical: 2,
      backgroundColor: bg,
      borderRadius: 12,
    }}>
      <Text style={{
        color: color,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
      }}>
        {normStatus}
      </Text>
    </View>
  );
}
