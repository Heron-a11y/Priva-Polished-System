import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import apiService from '@/services/api';

interface NetworkMode {
    mode: string;
    backendUrl: string;
    expoUrl: string;
    description: string;
}

export default function NetworkSettings() {
    const [currentMode, setCurrentMode] = useState<string>('local');
    const [availableNetworks, setAvailableNetworks] = useState<NetworkMode[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isTesting, setIsTesting] = useState(false);

    useEffect(() => {
        loadNetworkSettings();
    }, []);

    const loadNetworkSettings = async () => {
        try {
            const mode = await apiService.getNetworkMode();
            const networks = await apiService.getAvailableNetworks();
            setCurrentMode(mode);
            setAvailableNetworks(networks);
        } catch (error) {
            console.error('Failed to load network settings:', error);
        }
    };

    const handleNetworkChange = async (mode: string) => {
        setIsLoading(true);
        try {
            await apiService.setNetworkMode(mode);
            setCurrentMode(mode);
            Alert.alert('Success', `Network mode changed to: ${mode}`);
        } catch (error) {
            Alert.alert('Error', 'Failed to change network mode');
            console.error('Network change error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const testConnection = async () => {
        setIsTesting(true);
        try {
            const result = await apiService.testConnection();
            if (result.success) {
                Alert.alert('Connection Test', '✅ Connection successful!');
            } else {
                Alert.alert('Connection Test', `❌ Connection failed: ${result.error}`);
            }
        } catch (error) {
            Alert.alert('Connection Test', '❌ Test failed');
            console.error('Connection test error:', error);
        } finally {
            setIsTesting(false);
        }
    };

    const autoDetectNetwork = async () => {
        setIsLoading(true);
        try {
            const detectedMode = await apiService.autoDetectNetwork();
            setCurrentMode(detectedMode);
            Alert.alert('Auto Detection', `Detected best network: ${detectedMode}`);
        } catch (error) {
            Alert.alert('Auto Detection', 'Failed to auto-detect network');
            console.error('Auto detection error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ThemedView style={styles.container}>
            <ThemedText type="title" style={styles.title}>Network Settings</ThemedText>
            
            <View style={styles.currentModeContainer}>
                <ThemedText type="subtitle">Current Mode: {currentMode}</ThemedText>
                <Text style={styles.currentUrl}>
                    {availableNetworks.find(n => n.mode === currentMode)?.backendUrl}
                </Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity 
                    style={[styles.button, styles.testButton]} 
                    onPress={testConnection}
                    disabled={isTesting}
                >
                    {isTesting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.buttonText}>Test Connection</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity 
                    style={[styles.button, styles.autoButton]} 
                    onPress={autoDetectNetwork}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Auto Detect</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.networksContainer}>
                <ThemedText type="subtitle" style={styles.sectionTitle}>Available Networks</ThemedText>
                {availableNetworks.map((network) => (
                    <TouchableOpacity
                        key={network.mode}
                        style={[
                            styles.networkItem,
                            currentMode === network.mode && styles.selectedNetwork
                        ]}
                        onPress={() => handleNetworkChange(network.mode)}
                        disabled={isLoading}
                    >
                        <View style={styles.networkInfo}>
                            <Text style={[
                                styles.networkMode,
                                currentMode === network.mode && styles.selectedText
                            ]}>
                                {network.mode.toUpperCase()}
                            </Text>
                            <Text style={[
                                styles.networkDescription,
                                currentMode === network.mode && styles.selectedText
                            ]}>
                                {network.description}
                            </Text>
                            <Text style={[
                                styles.networkUrl,
                                currentMode === network.mode && styles.selectedText
                            ]}>
                                {network.backendUrl}
                            </Text>
                        </View>
                        {currentMode === network.mode && (
                            <View style={styles.selectedIndicator}>
                                <Text style={styles.selectedIndicatorText}>✓</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                ))}
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        marginBottom: 20,
        textAlign: 'center',
    },
    currentModeContainer: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
    },
    currentUrl: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    testButton: {
        backgroundColor: '#007AFF',
    },
    autoButton: {
        backgroundColor: '#34C759',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    networksContainer: {
        flex: 1,
    },
    sectionTitle: {
        marginBottom: 15,
    },
    networkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedNetwork: {
        backgroundColor: '#e3f2fd',
        borderColor: '#2196F3',
    },
    networkInfo: {
        flex: 1,
    },
    networkMode: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    networkDescription: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    networkUrl: {
        fontSize: 12,
        color: '#999',
        marginTop: 2,
    },
    selectedText: {
        color: '#2196F3',
    },
    selectedIndicator: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#2196F3',
        alignItems: 'center',
        justifyContent: 'center',
    },
    selectedIndicatorText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
