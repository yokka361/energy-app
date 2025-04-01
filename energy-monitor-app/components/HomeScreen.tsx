import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  Modal,
  SafeAreaView,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../app/(tabs)/index'; // Adjust the import path as necessary

// Define component props type
type HomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

// Define component type for each component
type ComponentType = {
  id: number;
  name: string;
  isOn: boolean;
};

// ESP8266 IP address (when in AP mode)
const ESP_IP = '192.168.4.1';

export default function HomeScreen({ navigation }: HomeScreenProps) {
  // State variables
  const [powerUsage, setPowerUsage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [connected, setConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [warningLevel, setWarningLevel] = useState<number>(0);
  const [components, setComponents] = useState<ComponentType[]>([
    { id: 1, name: 'Component 1', isOn: false },
    { id: 2, name: 'Component 2', isOn: false },
    { id: 3, name: 'Component 3', isOn: false },
  ]);
  
  // Refs for polling intervals
  const powerPollingRef = useRef<NodeJS.Timeout | null>(null);
  const thresholdPollingRef = useRef<NodeJS.Timeout | null>(null);
  
  // Thresholds for warnings (in watts)
  const THRESHOLD_1 = 100;
  const THRESHOLD_2 = 150;

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, []);
  
  // Check if device is connected to ESP8266 network
  const connectToESP = async (): Promise<void> => {
    setLoading(true);
    try {
      const networkState = await Network.getNetworkStateAsync();
      if (!networkState.isConnected) {
        setError("Not connected to WiFi. Please connect to ESP8266 network.");
        setConnected(false);
      } else {
        setError(null);
        await fetchInitialState();
        setConnected(true);
        startPolling();
      }
    } catch (error) {
      setError(`Error checking network: ${(error as Error).message}`);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Start polling for power data and threshold alerts
  const startPolling = (): void => {
    // Get power data every 5 seconds
    powerPollingRef.current = setInterval(fetchPowerData, 5000);
    
    // Check for threshold alerts every 5 seconds
    thresholdPollingRef.current = setInterval(checkThresholdAlert, 5000);
    
    // Initial fetch
    fetchPowerData();
  };
  
  // Stop all polling intervals
  const stopPolling = (): void => {
    if (powerPollingRef.current) clearInterval(powerPollingRef.current);
    if (thresholdPollingRef.current) clearInterval(thresholdPollingRef.current);
  };
  
  // Type for component status response
  type StatusResponse = {
    components: {
      id: number;
      isOn: boolean;
    }[];
  };

  // Fetch initial component states from ESP8266
  const fetchInitialState = async (): Promise<void> => {
    try {
      // For demo purposes, simulate a successful connection
      // In real app, this would actually fetch from ESP8266
      const mockData: StatusResponse = {
        components: [
          { id: 1, isOn: false },
          { id: 2, isOn: true },
          { id: 3, isOn: false },
        ]
      };
      
      // Update component states based on ESP8266 data
      setComponents(prev => prev.map(comp => ({
        ...comp,
        isOn: mockData.components.find(c => c.id === comp.id)?.isOn || false
      })));
      
      // Generate random power usage for demo
      setPowerUsage(Math.floor(Math.random() * 180));
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error fetching initial state:", error);
      throw error;
    }
  };
  
  // Type for power response
  type PowerResponse = {
    power: number;
  };

  // Fetch power usage data from ESP8266
  const fetchPowerData = async (): Promise<void> => {
    if (!connected) return;
    
    try {
      // For demo purposes, simulate power fluctuation
      const newPower = Math.floor(Math.random() * 180);
      setPowerUsage(newPower);
      
      // Reset error if successful
      if (error) setError(null);
      
      // Randomly trigger warnings based on power level
      if (newPower > THRESHOLD_2) {
        setWarningLevel(2);
        setShowWarning(true);
      } else if (newPower > THRESHOLD_1) {
        setWarningLevel(1);
        setShowWarning(true);
      }
    } catch (error) {
      console.error("Error fetching power data:", error);
      setError("Cannot connect to ESP8266");
    }
  };
  
  // Type for threshold response
  type ThresholdResponse = {
    threshold: number;
  };

  // Check for threshold alerts from ESP8266
  const checkThresholdAlert = async (): Promise<void> => {
    if (!connected) return;
    
    try {
      // For demo purposes, no need to implement this
      // as we're handling warnings in fetchPowerData
    } catch (error) {
      console.error("Error checking threshold:", error);
    }
  };
  
  // Type for control response
  type ControlResponse = {
    success: boolean;
  };

  // Toggle a component's state (ON/OFF)
  const toggleComponent = async (id: number): Promise<void> => {
    if (!connected) {
      Alert.alert("Not Connected", "Please connect to ESP8266 first.");
      return;
    }
    
    try {
      // Find the component
      const component = components.find(c => c.id === id);
      if (!component) return;
      
      const newState = !component.isOn;
      
      // For demo purposes, always succeed
      // Update local state
      setComponents(prev => 
        prev.map(c => c.id === id ? { ...c, isOn: newState } : c)
      );
    } catch (error) {
      console.error("Error toggling component:", error);
      Alert.alert("Error", "Failed to control device. Check connection.");
    }
  };
  
  // Disconnect from ESP8266
  const disconnectFromESP = (): void => {
    stopPolling();
    setConnected(false);
    setError(null);
    // Reset component states
    setComponents(prev => prev.map(c => ({ ...c, isOn: false })));
    setPowerUsage(0);
  };
  
  // Dismiss the warning alert
  const dismissWarning = (): void => {
    setShowWarning(false);
  };
  
  // Turn off all components to respond to high power warning
  const turnOffAllComponents = async (): Promise<void> => {
    try {
      // Update local state
      setComponents(prev => prev.map(c => ({ ...c, isOn: false })));
      dismissWarning();
    } catch (error) {
      console.error("Error turning off components:", error);
      Alert.alert("Error", "Failed to turn off devices. Check connection.");
    }
  };
  
  // Navigate to Tariff screen
  const goToTariffPage = (): void => {
    // Pass current power usage to Tariff page
    navigation.navigate('Tariff', { powerUsage });
  };

  // Component status button color
  const getButtonColor = (isOn: boolean): string => {
    return isOn ? '#4CAF50' : '#F44336';
  };

  // Handle power level display color
  const getPowerDisplayColor = (): string => {
    if (powerUsage > THRESHOLD_2) return '#F44336'; // Red for high power
    if (powerUsage > THRESHOLD_1) return '#FFA500'; // Orange for warning
    return '#4CAF50'; // Green for normal
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Connection status */}
      <View style={styles.statusContainer}>
        <View style={[styles.statusIndicator, { backgroundColor: connected ? '#4CAF50' : '#F44336' }]} />
        <Text style={styles.statusText}>
          {connected ? 'Connected to ESP8266' : 'Not Connected'}
        </Text>
      </View>
      
      {/* Connect/Disconnect button */}
      <TouchableOpacity 
        style={[
          styles.connectButton, 
          { backgroundColor: connected ? '#F44336' : '#3F51B5' }
        ]}
        onPress={connected ? disconnectFromESP : connectToESP}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color="white" />
        ) : (
          <>
            <Ionicons name={connected ? "wifi-off" : "wifi"} size={24} color="white" />
            <Text style={styles.connectButtonText}>
              {connected ? 'Disconnect' : 'Connect to ESP8266'}
            </Text>
          </>
        )}
      </TouchableOpacity>
      
      {/* Error message if connection fails */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={connectToESP}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {/* Power usage display */}
      <View style={[
        styles.powerContainer, 
        { 
          backgroundColor: connected ? getPowerDisplayColor() : '#9E9E9E',
          opacity: connected ? 1 : 0.7 
        }
      ]}>
        <Ionicons name="flash" size={28} color="white" />
        <Text style={styles.powerText}>
          {connected 
            ? `Current Power Usage: ${powerUsage}W` 
            : 'Connect to view power usage'}
        </Text>
      </View>
      
      {/* Component control buttons */}
      <View style={[
        styles.componentsContainer,
        { opacity: connected ? 1 : 0.7 }
      ]}>
        <Text style={styles.sectionTitle}>Components</Text>
        {components.map((component) => (
          <View key={component.id} style={styles.componentRow}>
            <Text style={styles.componentName}>{component.name}</Text>
            <TouchableOpacity
              style={[
                styles.controlButton, 
                { 
                  backgroundColor: connected 
                    ? getButtonColor(component.isOn) 
                    : '#9E9E9E'
                }
              ]}
              onPress={() => toggleComponent(component.id)}
              disabled={!connected}
            >
              <Text style={styles.buttonText}>
                {component.isOn ? 'ON' : 'OFF'}
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
      
      {/* Navigation button to Tariff page */}
      <TouchableOpacity 
        style={[
          styles.tariffButton,
          { opacity: connected ? 1 : 0.7 }
        ]}
        onPress={goToTariffPage}
        disabled={!connected}
      >
        <Ionicons name="stats-chart" size={24} color="white" />
        <Text style={styles.tariffButtonText}>Go to Tariff Page</Text>
      </TouchableOpacity>
      
      {/* Warning modal */}
      <Modal
        visible={showWarning}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.centeredView}>
          <View style={styles.warningModal}>
            <Ionicons name="warning" size={36} color="#FFA500" />
            <Text style={styles.warningTitle}>
              {warningLevel === 1 ? 'Warning: Power Threshold Reached' : 'Critical: High Power Usage'}
            </Text>
            <Text style={styles.warningText}>
              {warningLevel === 1 
                ? `Power usage (${powerUsage}W) has exceeded the first threshold.` 
                : `Power usage (${powerUsage}W) has reached critical levels!`
              }
            </Text>
            
            <View style={styles.warningButtons}>
              <TouchableOpacity
                style={[styles.warningButton, styles.actionButton]}
                onPress={turnOffAllComponents}
              >
                <Text style={styles.warningButtonText}>Turn Off All</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.warningButton, styles.dismissButton]}
                onPress={dismissWarning}
              >
                <Text style={styles.warningButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  connectButton: {
    backgroundColor: '#3F51B5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
  },
  connectButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    marginBottom: 8,
  },
  retryButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  powerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 20,
    borderRadius: 8,
    marginBottom: 24,
  },
  powerText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  componentsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  componentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  componentName: {
    fontSize: 16,
    fontWeight: '500',
  },
  controlButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  tariffButton: {
    backgroundColor: '#3F51B5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
  },
  tariffButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  warningModal: {
    width: '80%',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 5,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  warningText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
  },
  warningButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  warningButton: {
    flex: 1,
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    margin: 4,
  },
  actionButton: {
    backgroundColor: '#F44336',
  },
  dismissButton: {
    backgroundColor: '#9E9E9E',
  },
  warningButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});