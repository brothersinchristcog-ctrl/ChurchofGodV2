import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { X } from 'lucide-react-native';
import { MemberRow } from './MemberRow';
import { MemberActivitySummary, formatNumber } from '../../lib/activity-data';

interface Props {
  open: boolean;
  title: string;
  subtitle: string;
  entries: MemberActivitySummary[];
  today: Date;
  onClose: () => void;
  onSelectMember: (userId: string) => void;
}

export function MemberListModal({ open, title, subtitle, entries, today, onClose, onSelectMember }: Props) {
  return (
    <Modal
      visible={open}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X color="#64748b" size={24} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.scrollArea}>
          {entries.length === 0 ? (
            <Text style={styles.emptyText}>No activity recorded.</Text>
          ) : (
            entries.map((entry) => (
              <MemberRow
                key={entry.member.userId}
                entry={entry}
                today={today}
                onSelect={onSelectMember}
              />
            ))
          )}
        </ScrollView>
        
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {formatNumber(entries.length)} members shown
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerTextContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  closeButton: {
    padding: 4,
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 8,
  },
  emptyText: {
    textAlign: 'center',
    padding: 32,
    color: '#64748b',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  footerText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
});
