import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Linking, ScrollView, Dimensions } from 'react-native';
import { Download } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppVersionConfig } from '../services/VersionService';
import { useTheme } from '../context/ThemeContext';
import { Colors } from '../theme/Theme';

interface UpdateDialogProps {
  visible: boolean;
  config: AppVersionConfig;
  onDismiss: () => void;
}

const { height } = Dimensions.get('window');

export default function UpdateDialog({ visible, config, onDismiss }: UpdateDialogProps) {
  const { isDark: systemIsDark } = useTheme();
  // User requested popup card to always be white
  const isDark = false; 

  const handleUpdate = () => {
    if (config.playStoreUrl) {
      Linking.openURL(config.playStoreUrl).catch(err => console.error("Couldn't load page", err));
    }
  };

  const isForceUpdate = config.forceUpdate;
  const validReleaseNotes = config.releaseNotes?.filter(note => note.trim().length > 0) || [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={isForceUpdate ? () => {} : onDismiss}
    >
      <View style={styles.overlay}>
        <View style={[styles.dialogContainer, isDark && styles.dialogContainerDark]}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <Download size={32} color={Colors.primary} />
            </View>
          </View>

          <Text style={[styles.title, isDark && styles.textLight]}>
            New Update Available
          </Text>

          <Text style={[styles.description, isDark && styles.textLightMuted]}>
            A new version of Church of God is available. Update now to enjoy the latest improvements and enhanced experience.
          </Text>

          {validReleaseNotes.length > 0 && (
            <View style={[styles.notesContainer, isDark && styles.notesContainerDark]}>
              <Text style={[styles.notesTitle, isDark && styles.textLight]}>What's New</Text>
              <ScrollView style={styles.notesScroll} showsVerticalScrollIndicator={false}>
                {validReleaseNotes.map((note, index) => (
                  <View key={index} style={styles.bulletRow}>
                    <Text style={[styles.bullet, isDark && styles.textLightMuted]}>•</Text>
                    <Text style={[styles.bulletText, isDark && styles.textLightMuted]}>{note}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.actionContainer}>
            {!isForceUpdate && (
              <TouchableOpacity style={styles.buttonWrapper} onPress={onDismiss}>
                <LinearGradient
                  colors={[Colors.primaryLight, Colors.primary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientOuterBorder}
                >
                  <LinearGradient
                    colors={[Colors.primary, Colors.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientFilledInner}
                  >
                    <View style={styles.badgeInnerTransparent}>
                      <Text style={styles.glassBadgeText}>LATER</Text>
                    </View>
                  </LinearGradient>
                </LinearGradient>
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.buttonWrapper, isForceUpdate && styles.updateButtonFull]} 
              onPress={handleUpdate}
            >
              <LinearGradient
                colors={[Colors.primaryLight, Colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientOuterBorder}
              >
                <LinearGradient
                  colors={[Colors.primary, Colors.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.gradientFilledInner}
                >
                  <View style={styles.badgeInnerTransparent}>
                    <Text style={styles.glassBadgeText}>UPDATE NOW</Text>
                  </View>
                </LinearGradient>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  dialogContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: '100%',
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },
  dialogContainerDark: {
    backgroundColor: '#1f2937',
  },
  iconContainer: {
    marginBottom: 20,
    marginTop: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#4b5563',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  notesContainer: {
    width: '100%',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    maxHeight: height * 0.25,
  },
  notesContainerDark: {
    backgroundColor: '#374151',
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 12,
  },
  notesScroll: {
    width: '100%',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 14,
    color: '#4b5563',
    marginRight: 8,
    lineHeight: 20,
  },
  bulletText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 20,
    flex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
    justifyContent: 'center',
  },
  buttonWrapper: {
    flex: 1,
  },
  updateButtonFull: {
    flex: 0,
    width: '60%',
  },
  gradientFilled: {
    borderRadius: 100,
  },
  badgeInnerFilled: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterBadgeTextFilled: {
    color: '#4b5563',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  glassBadgeText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gradientBorderLine: {
    padding: 2,
    borderRadius: 100,
  },
  badgeInnerHollow: {
    backgroundColor: '#ffffff',
    borderRadius: 98,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeInnerHollowDark: {
    backgroundColor: '#1f2937',
  },
  laterBadgeTextHollow: {
    color: '#6b7280',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  updateBadgeTextHollow: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  gradientOuterBorder: {
    padding: 2,
    borderRadius: 100,
  },
  gradientFilledInner: {
    borderRadius: 98,
  },
  badgeInnerTransparent: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    position: 'relative',
  },
  textLight: {
    color: '#f9fafb',
  },
  textLightMuted: {
    color: '#d1d5db',
  },
});
