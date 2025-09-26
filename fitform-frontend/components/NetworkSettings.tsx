import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import apiService from '../services/api';

interface NetworkMode {
    mode: string;
    backendUrl: string;
    expoUrl: string;
    description: string;
}

const NetworkSettings: React.FC = () => {
    const [currentMode, setCurrentMode] = useState<string>('lan');
    const [availableNetworks, setAvailableNetworks] = useState<NetworkMode[]>([]);
    const [isLoading, setIsLoading] = useState(false);

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

    const switchNetworkMode = async (mode: string) => {
        setIsLoading(true);
        try {
            await apiService.setNetworkMode(mode);
            setCurrentMode(mode);
            Alert.alert('Success', `Switched to ${mode} network mode`);
        } catch (error) {
            Alert.alert('Error', `Failed to switch to ${mode} mode`);
        } finally {
            setIsLoading(false);
        }
    };

    const testConnection = async () => {
        setIsLoading(true);
        try {
            const result = await apiService.testConnection();
            if (result.success) {
                Alert.alert('Connection Test', '✅ Connection successful!');
            } else {
                Alert.alert('Connection Test', `❌ Connection failed: ${result.error}`);
            }
        } catch (error) {
            Alert.alert('Connection Test', `❌ Test failed: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const autoDetectNetwork = async () => {
        setIsLoading(true);
        try {
            const mode = await apiService.autoDetectNetwork();
            setCurrentMode(mode);
            Alert.alert('Auto-Detection', `Detected best network: ${mode}`);
        } catch (error) {
            Alert.alert('Auto-Detection', `Failed to detect network: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Network Settings</Text>
            
            <View style={styles.currentMode}>
                <Text style={styles.currentModeLabel}>Current Mode:</Text>
                <Text style={styles.currentModeValue}>{currentMode.toUpperCase()}</Text>
            </View>

            <View style={styles.networkList}>
                {availableNetworks.map((network) => (
                    <TouchableOpacity
                        key={network.mode}
                        style={[
                            styles.networkItem,
                            currentMode === network.mode && styles.activeNetwork
                        ]}
                        onPress={() => switchNetworkMode(network.mode)}
                        disabled={isLoading}
                    >
                        <Text style={styles.networkMode}>{network.mode.toUpperCase()}</Text>
                        <Text style={styles.networkDescription}>{network.description}</Text>
                        <Text style={styles.networkUrl}>{network.backendUrl}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <View style={styles.actionButtons}>
                <TouchableOpacity
                    style={[styles.button, styles.testButton]}
                    onPress={testConnection}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Test Connection</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.autoButton]}
                    onPress={autoDetectNetwork}
                    disabled={isLoading}
                >
                    <Text style={styles.buttonText}>Auto-Detect</Text>
                </TouchableOpacity>
            </View>

            {isLoading && (
                <Text style={styles.loadingText}>Loading...</Text>
            )}
        </View>
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
    currentMode: {
        backgroundColor: '#e3f2fd',
        padding: 15,
        borderRadius: 8,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    currentModeLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    currentModeValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976d2',
    },
    networkList: {
        marginBottom: 20,
    },
    networkItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: '#e0e0e0',
    },
    activeNetwork: {
        borderColor: '#4caf50',
        backgroundColor: '#f1f8e9',
    },
    networkMode: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    networkDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 5,
    },
    networkUrl: {
        fontSize: 12,
        color: '#999',
        fontFamily: 'monospace',
    },
    actionButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        padding: 15,
        borderRadius: 8,
        marginHorizontal: 5,
    },
    testButton: {
        backgroundColor: '#2196f3',
    },
    autoButton: {
        backgroundColor: '#ff9800',
    },
    buttonText: {
        color: '#fff',
        textAlign: 'center',
        fontWeight: 'bold',
    },
    loadingText: {
        textAlign: 'center',
        marginTop: 10,
        color: '#666',
    },
});

export default NetworkSettings;