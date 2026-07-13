import React, { Component, ErrorInfo, ReactNode } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  SafeAreaView, 
  StatusBar 
} from 'react-native';
import * as Updates from 'expo-updates';
import { ShieldAlert, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors, spacing, radius, shadow } from '../theme/Theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRestart = async () => {
    try {
      await Updates.reloadAsync();
    } catch (e) {
      // Fallback: reset local error state to attempt re-render of tree
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        showDetails: false
      });
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#1a2d5a" />
          
          {/* Elegant header */}
          <View style={styles.header}>
            <Text style={styles.headerText}>Church of GOD</Text>
          </View>

          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.errorCard}>
              <View style={styles.iconContainer}>
                <ShieldAlert size={48} color={colors.accent} />
              </View>

              <Text style={styles.title}>Something Went Wrong</Text>
              <Text style={styles.description}>
                An unexpected issue occurred while rendering this screen. Rest assured, your data is safe and the database is secure.
              </Text>

              <TouchableOpacity 
                style={styles.restartButton} 
                onPress={this.handleRestart}
                activeOpacity={0.85}
              >
                <RefreshCw size={18} color="#fff" style={styles.buttonIcon} />
                <Text style={styles.restartButtonText}>Restart Application</Text>
              </TouchableOpacity>
            </View>

            {/* Collapsible Developer Console for Testing */}
            <View style={styles.consoleContainer}>
              <TouchableOpacity 
                style={styles.consoleHeader} 
                onPress={() => this.setState({ showDetails: !this.state.showDetails })}
                activeOpacity={0.7}
              >
                <Text style={styles.consoleHeaderTitle}>Technical Details (Developer Log)</Text>
                {this.state.showDetails ? (
                  <ChevronUp size={16} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={16} color={colors.textSecondary} />
                )}
              </TouchableOpacity>

              {this.state.showDetails && (
                <View style={styles.consoleBody}>
                  <Text style={styles.errorTextName}>
                    {this.state.error && this.state.error.toString()}
                  </Text>
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo && this.state.errorInfo.componentStack}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f2f7',
  },
  header: {
    backgroundColor: '#1a2d5a',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 1.5,
    borderBottomColor: '#fbbf24',
  },
  headerText: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  content: {
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
  errorCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadow.premium,
    marginBottom: spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(192, 57, 43, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1a2d5a',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.sm,
  },
  restartButton: {
    flexDirection: 'row',
    backgroundColor: '#1a2d5a',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    elevation: 4,
    shadowColor: '#1a2d5a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  buttonIcon: {
    marginRight: 8,
  },
  restartButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  consoleContainer: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  consoleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: '#f8fafc',
  },
  consoleHeaderTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  consoleBody: {
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    backgroundColor: '#0f172a',
  },
  errorTextName: {
    color: '#ef4444',
    fontFamily: 'Platform.OS === "ios" ? "CourierNewPS-BoldMT" : "monospace"',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  errorStack: {
    color: '#94a3b8',
    fontFamily: 'Platform.OS === "ios" ? "Courier" : "monospace"',
    fontSize: 10,
    lineHeight: 16,
  },
});
