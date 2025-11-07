import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import apiService from './services/api';
import networkConnectionFix from './fix-network-connection';

const NetworkTestScreen = () => {
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [networkStatus, setNetworkStatus] = useState(null);

  useEffect(() => {
    loadNetworkStatus();
  }, []);

  const loadNetworkStatus = async () => {
    try {
      const status = await networkConnectionFix.getNetworkStatus();
      setNetworkStatus(status);
    } catch (error) {
      console.log('Error loading network status:', error);
    }
  };

  const runNetworkTest = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Starting network test...');
      const results = await networkConnectionFix.runNetworkDiagnostics();
      setTestResults(results);
      console.log('✅ Network test completed:', results);
    } catch (error) {
      console.error('❌ Network test failed:', error);
      Alert.alert('Test Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fixNetworkIssues = async () => {
    setIsLoading(true);
    try {
      console.log('🔧 Attempting to fix network issues...');
      const result = await networkConnectionFix.fixNetworkIssues();
      
      if (result.success) {
        Alert.alert('Success', 'Network configuration has been updated');
        await loadNetworkStatus();
      } else {
        Alert.alert('Fix Failed', result.error);
      }
    } catch (error) {
      console.error('❌ Network fix failed:', error);
      Alert.alert('Fix Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testAppointments = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing appointments endpoint...');
      const result = await apiService.getAppointments();
      console.log('✅ Appointments test successful:', result);
      Alert.alert('Success', 'Appointments endpoint is working!');
    } catch (error) {
      console.error('❌ Appointments test failed:', error);
      Alert.alert('Test Failed', `Appointments endpoint failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderTestResult = (title, result) => {
    if (!result) return null;
    
    const isSuccess = result.success || result.ok;
    const statusColor = isSuccess ? '#4CAF50' : '#F44336';
    const statusText = isSuccess ? '✅ SUCCESS' : '❌ FAILED';
    
    return (
      <View style={styles.resultItem}>
        <Text style={styles.resultTitle}>{title}</Text>
        <Text style={[styles.resultStatus, { color: statusColor }]}>{statusText}</Text>
        {result.error && (
          <Text style={styles.errorText}>Error: {result.error}</Text>
        )}
        {result.data && (
          <Text style={styles.dataText}>Data: {JSON.stringify(result.data).substring(0, 100)}...</Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Network Diagnostics</Text>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Current Status</Text>
        {networkStatus ? (
          <Text style={styles.statusText}>
            Last test: {new Date(networkStatus.timestamp).toLocaleString()}
          </Text>
        ) : (
          <Text style={styles.statusText}>No previous test results</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity 
          style={[styles.button, isLoading && styles.buttonDisabled]} 
          onPress={runNetworkTest}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Run Network Test'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.fixButton, isLoading && styles.buttonDisabled]} 
          onPress={fixNetworkIssues}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Fix Network Issues</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.testButton, isLoading && styles.buttonDisabled]} 
          onPress={testAppointments}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Appointments</Text>
        </TouchableOpacity>
      </View>

      {testResults && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          
          {renderTestResult('Basic Connection', testResults.basicConnection)}
          
          {testResults.authEndpoints && (
            <View style={styles.resultItem}>
              <Text style={styles.resultTitle}>Auth Endpoints</Text>
              {Object.entries(testResults.authEndpoints).map(([endpoint, result]) => (
                <Text key={endpoint} style={styles.endpointResult}>
                  {endpoint}: {result.success ? '✅' : '❌'} ({result.status || 'Error'})
                </Text>
              ))}
            </View>
          )}
          
          {renderTestResult('Appointments Endpoint', testResults.appointmentsEndpoint)}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Troubleshooting Tips</Text>
        <Text style={styles.tipText}>
          • Make sure your backend server is running on port 8000{'\n'}
          • Check that both devices are on the same network{'\n'}
          • Verify your IP address is correct (192.168.1.54){'\n'}
          • Try logging in first before testing appointments{'\n'}
          • Check firewall settings if connection fails
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  section: {
    backgroundColor: 'white',
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    alignItems: 'center',
  },
  fixButton: {
    backgroundColor: '#FF9800',
  },
  testButton: {
    backgroundColor: '#4CAF50',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  resultStatus: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    fontFamily: 'monospace',
  },
  dataText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  endpointResult: {
    fontSize: 12,
    color: '#333',
    marginLeft: 10,
    marginBottom: 2,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});

export default NetworkTestScreen;