import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import apiService from './services/api';
import networkConfig from './services/network-config';

const NetworkTestScreen = () => {
  const [testResults, setTestResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setTestResults(prev => [...prev, { message, type, timestamp }]);
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const testApiConnection = async () => {
    setIsLoading(true);
    addResult('🧪 Starting API connection test...', 'info');
    
    try {
      const result = await apiService.testApiConnection();
      if (result.success) {
        addResult('✅ API connection successful!', 'success');
        addResult(`📊 Response: ${JSON.stringify(result.data)}`, 'info');
      } else {
        addResult(`❌ API connection failed: ${result.error}`, 'error');
      }
    } catch (error) {
      addResult(`❌ API test error: ${error.message}`, 'error');
    }
    
    setIsLoading(false);
  };

  const testNetworkConfig = async () => {
    setIsLoading(true);
    addResult('🌐 Testing network configuration...', 'info');
    
    try {
      const currentConfig = networkConfig.getCurrentConfig();
      addResult(`📡 Current config: ${JSON.stringify(currentConfig)}`, 'info');
      
      const backendUrl = networkConfig.getBackendUrl();
      addResult(`🔗 Backend URL: ${backendUrl}`, 'info');
      
      const expoUrl = networkConfig.getExpoUrl();
      addResult(`📱 Expo URL: ${expoUrl}`, 'info');
      
    } catch (error) {
      addResult(`❌ Network config error: ${error.message}`, 'error');
    }
    
    setIsLoading(false);
  };

  const testAllConnections = async () => {
    setIsLoading(true);
    clearResults();
    addResult('🚀 Starting comprehensive network test...', 'info');
    
    // Test current configuration
    await testNetworkConfig();
    await testApiConnection();
    
    // Test alternative IPs
    const alternativeIPs = ['192.168.1.105', '192.168.1.104', 'localhost'];
    
    for (const ip of alternativeIPs) {
      addResult(`🧪 Testing IP: ${ip}`, 'info');
      try {
        networkConfig.updateLanIp(ip);
        const result = await apiService.testApiConnection();
        if (result.success) {
          addResult(`✅ IP ${ip} works!`, 'success');
        } else {
          addResult(`❌ IP ${ip} failed: ${result.error}`, 'error');
        }
      } catch (error) {
        addResult(`❌ IP ${ip} error: ${error.message}`, 'error');
      }
    }
    
    setIsLoading(false);
    addResult('🏁 Network test complete!', 'info');
  };

  const getResultStyle = (type) => {
    switch (type) {
      case 'success': return styles.successText;
      case 'error': return styles.errorText;
      case 'info': return styles.infoText;
      default: return styles.infoText;
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Network Diagnostic Tool</Text>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.primaryButton]} 
          onPress={testAllConnections}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Testing...' : 'Test All Connections'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={testApiConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test API Only</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.secondaryButton]} 
          onPress={testNetworkConfig}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Config</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.clearButton]} 
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        {testResults.map((result, index) => (
          <Text key={index} style={[styles.resultText, getResultStyle(result.type)]}>
            [{result.timestamp}] {result.message}
          </Text>
        ))}
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
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  clearButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  resultsContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  resultText: {
    fontSize: 14,
    marginBottom: 5,
    fontFamily: 'monospace',
  },
  successText: {
    color: '#34C759',
  },
  errorText: {
    color: '#FF3B30',
  },
  infoText: {
    color: '#007AFF',
  },
});

export default NetworkTestScreen;
