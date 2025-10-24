import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const isMobile = width < 768;
const isSmallMobile = width < 375;
const isMediumMobile = width >= 375 && width < 414;
const isLargeMobile = width >= 414 && width < 768;

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
  retryCount: number;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
  maxRetries?: number;
  showRetryButton?: boolean;
  showErrorDetails?: boolean;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error to external service if needed
    this.logError(error, errorInfo);
  }

  private logError = (error: Error, errorInfo: any) => {
    // Here you can integrate with error logging services like Sentry, Bugsnag, etc.
    console.error('Application Error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: 'React Native App',
      retryCount: this.state.retryCount
    });
  };

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: prevState.retryCount + 1
      }));
    } else {
      Alert.alert(
        'Maximum Retries Reached',
        'The application has reached the maximum number of retry attempts. Please restart the app.',
        [
          { text: 'OK', style: 'default' }
        ]
      );
    }
  };

  private handleRestart = () => {
    // In a real app, you might want to restart the app or navigate to a safe state
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    });
  };

  private handleReportError = () => {
    const { error, errorInfo } = this.state;
    
    Alert.alert(
      'Report Error',
      'Would you like to report this error to help us improve the app?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => {
            // Here you can implement error reporting logic
            console.log('Error reported:', { error, errorInfo });
            Alert.alert('Thank you', 'Error has been reported successfully.');
          }
        }
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { showRetryButton = true, showErrorDetails = __DEV__ } = this.props;
      const { error, retryCount, maxRetries = 3 } = this.props;

      return (
        <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <Ionicons name="alert-circle" size={80} color="#DC2626" />
            </View>
            
            <Text style={styles.errorTitle}>Something went wrong</Text>
            <Text style={styles.errorMessage}>
              We're sorry, but something unexpected happened. Our team has been notified.
            </Text>

            {showErrorDetails && error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorDetailsTitle}>Error Details:</Text>
                <Text style={styles.errorDetailsText}>
                  {error.message || 'Unknown error occurred'}
                </Text>
                {__DEV__ && this.state.errorInfo && (
                  <Text style={styles.errorStack}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                )}
              </View>
            )}

            <View style={styles.retryInfo}>
              <Text style={styles.retryText}>
                Retry attempts: {retryCount}/{maxRetries}
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              {showRetryButton && retryCount < maxRetries && (
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={this.handleRetry}
                  activeOpacity={0.8}
                >
                  <Ionicons name="refresh" size={20} color="#fff" />
                  <Text style={styles.retryButtonText}>Try Again</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.restartButton}
                onPress={this.handleRestart}
                activeOpacity={0.8}
              >
                <Ionicons name="reload" size={20} color="#014D40" />
                <Text style={styles.restartButtonText}>Restart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.reportButton}
                onPress={this.handleReportError}
                activeOpacity={0.8}
              >
                <Ionicons name="bug" size={20} color="#6B7280" />
                <Text style={styles.reportButtonText}>Report Issue</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.helpContainer}>
              <Text style={styles.helpTitle}>Need Help?</Text>
              <Text style={styles.helpText}>
                If this problem persists, please contact our support team or try restarting the application.
              </Text>
            </View>
          </View>
        </ScrollView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  contentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: isSmallMobile ? 20 : isMediumMobile ? 24 : isLargeMobile ? 28 : 32,
  },
  errorContainer: {
    backgroundColor: '#fff',
    borderRadius: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 24,
    padding: isSmallMobile ? 20 : isMediumMobile ? 24 : isLargeMobile ? 28 : 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  errorIcon: {
    marginBottom: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 24,
  },
  errorTitle: {
    fontSize: isSmallMobile ? 24 : isMediumMobile ? 26 : isLargeMobile ? 28 : 32,
    fontWeight: 'bold',
    color: '#111827',
    textAlign: 'center',
    marginBottom: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
  },
  errorMessage: {
    fontSize: isSmallMobile ? 16 : isMediumMobile ? 17 : isLargeMobile ? 18 : 18,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: isSmallMobile ? 24 : isMediumMobile ? 26 : isLargeMobile ? 28 : 28,
    marginBottom: isSmallMobile ? 20 : isMediumMobile ? 24 : isLargeMobile ? 28 : 32,
  },
  errorDetails: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    padding: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    marginBottom: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 20,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorDetailsTitle: {
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: isSmallMobile ? 6 : isMediumMobile ? 8 : isLargeMobile ? 10 : 10,
  },
  errorDetailsText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#374151',
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: isSmallMobile ? 10 : isMediumMobile ? 11 : isLargeMobile ? 12 : 12,
    color: '#6B7280',
    fontFamily: 'monospace',
    marginTop: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  retryInfo: {
    marginBottom: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 20,
  },
  retryText: {
    fontSize: isSmallMobile ? 12 : isMediumMobile ? 13 : isLargeMobile ? 14 : 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '100%',
    gap: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    marginBottom: isSmallMobile ? 20 : isMediumMobile ? 24 : isLargeMobile ? 28 : 32,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#014D40',
    paddingVertical: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    paddingHorizontal: isSmallMobile ? 24 : isMediumMobile ? 28 : isLargeMobile ? 32 : 32,
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    gap: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: isSmallMobile ? 16 : isMediumMobile ? 17 : isLargeMobile ? 18 : 18,
    fontWeight: '600',
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0FDF4',
    paddingVertical: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    paddingHorizontal: isSmallMobile ? 24 : isMediumMobile ? 28 : isLargeMobile ? 32 : 32,
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderWidth: 1,
    borderColor: '#014D40',
    gap: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  restartButtonText: {
    color: '#014D40',
    fontSize: isSmallMobile ? 16 : isMediumMobile ? 17 : isLargeMobile ? 18 : 18,
    fontWeight: '600',
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: isSmallMobile ? 12 : isMediumMobile ? 14 : isLargeMobile ? 16 : 16,
    paddingHorizontal: isSmallMobile ? 24 : isMediumMobile ? 28 : isLargeMobile ? 32 : 32,
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  reportButtonText: {
    color: '#6B7280',
    fontSize: isSmallMobile ? 16 : isMediumMobile ? 17 : isLargeMobile ? 18 : 18,
    fontWeight: '600',
  },
  helpContainer: {
    width: '100%',
    backgroundColor: '#F0F9FF',
    borderRadius: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
    padding: isSmallMobile ? 16 : isMediumMobile ? 18 : isLargeMobile ? 20 : 20,
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  helpTitle: {
    fontSize: isSmallMobile ? 16 : isMediumMobile ? 17 : isLargeMobile ? 18 : 18,
    fontWeight: '600',
    color: '#0C4A6E',
    marginBottom: isSmallMobile ? 8 : isMediumMobile ? 10 : isLargeMobile ? 12 : 12,
  },
  helpText: {
    fontSize: isSmallMobile ? 14 : isMediumMobile ? 15 : isLargeMobile ? 16 : 16,
    color: '#0C4A6E',
    lineHeight: isSmallMobile ? 20 : isMediumMobile ? 22 : isLargeMobile ? 24 : 24,
  },
});


