import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert,
  Modal,
  SafeAreaView,
  ActivityIndicator,
  ScrollView,
  AppState,
  AppStateStatus,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../app/(tabs)/index'; // Adjust the import path as necessary
import { useESP8266, THRESHOLD_1, THRESHOLD_2 } from '../utils/mockESPData'; // Import our mock ESP data
import * as Notifications from 'expo-notifications';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Define component props type
type HomeScreenProps = {
  navigation: StackNavigationProp<RootStackParamList, 'Home'>;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  // State variables
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [appState, setAppState] = useState<AppStateStatus>(AppState.currentState);
  const [notificationPermission, setNotificationPermission] = useState<boolean>(false);
  
  // Use our mock ESP8266 hook
  const { espData, connect, disconnect, toggleComponent, turnOffAll } = useESP8266();
  const { connected, components, powerUsage, threshold } = espData;
  
  // Setup notification permissions
  useEffect(() => {
    registerForPushNotificationsAsync().then(granted => {
      setNotificationPermission(granted);
    });
  }, []);
  
  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });
    
    return () => {
      subscription.remove();
    };
  }, []);
  
  // Handle notifications based on power threshold and app state
  useEffect(() => {
    if (threshold && (appState !== 'active' || appState === 'background' || appState === 'inactive')) {
      const thresholdText = threshold === 1 ? 'Warning' : 'Critical';
      const message = threshold === 1 
        ? `Power usage (${powerUsage}W) has exceeded the warning threshold.`
        : `Power usage (${powerUsage}W) has reached critical levels!`;
      
      // Show notification when app is not in foreground
      if (notificationPermission) {
        schedulePushNotification(thresholdText, message);
      }
    }
  }, [threshold, appState, powerUsage, notificationPermission]);
  
  // Show warning modal when threshold is detected and app is in foreground
  useEffect(() => {
    if (threshold && appState === 'active') {
      setShowWarning(true);
    }
  }, [threshold, appState]);
  
  // Connect to ESP8266
  const handleConnect = async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      await connect();
    } catch (err) {
      setError("Failed to connect to ESP8266. Please check if the device is powered on.");
    } finally {
      setLoading(false);
    }
  };
  
  // Disconnect from ESP8266
  const handleDisconnect = (): void => {
    disconnect();
  };
  
  // Toggle component state
  const handleToggleComponent = async (id: number): Promise<void> => {
    if (!connected) {
      Alert.alert("Not Connected", "Please connect to ESP8266 first.");
      return;
    }
    
    try {
      await toggleComponent(id);
    } catch (err) {
      Alert.alert("Error", "Failed to control device. Check connection.");
    }
  };
  
  // Dismiss the warning alert
  const dismissWarning = (): void => {
    setShowWarning(false);
  };
  
  // Turn off all components to respond to high power warning
  const handleTurnOffAll = async (): Promise<void> => {
    try {
      await turnOffAll();
      dismissWarning();
    } catch (err) {
      Alert.alert("Error", "Failed to turn off devices. Please try again.");
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
      <ScrollView>
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
          onPress={connected ? handleDisconnect : handleConnect}
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
        
        {/* Notification permission status */}
        {!notificationPermission && (
          <View style={styles.notificationWarning}>
            <Ionicons name="notifications-off" size={20} color="#D32F2F" />
            <Text style={styles.notificationWarningText}>
              Notifications are disabled. Enable for alerts when app is in background.
            </Text>
            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => registerForPushNotificationsAsync().then(granted => {
                setNotificationPermission(granted);
              })}
            >
              <Text style={styles.notificationButtonText}>Enable</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Error message if connection fails */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={handleConnect}
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
                onPress={() => handleToggleComponent(component.id)}
                disabled={!connected}
              >
                <Text style={styles.buttonText}>
                  {component.isOn ? 'ON' : 'OFF'}
                </Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        
        {/* Power usage information */}
        {connected && (
          <View style={styles.infoContainer}>
            <Text style={styles.infoTitle}>Power Information</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Warning Threshold:</Text>
              <Text style={styles.infoValue}>{THRESHOLD_1}W</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Critical Threshold:</Text>
              <Text style={styles.infoValue}>{THRESHOLD_2}W</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Current Status:</Text>
              <Text style={[styles.infoValue, { 
                color: powerUsage > THRESHOLD_2 ? '#F44336' : 
                       powerUsage > THRESHOLD_1 ? '#FFA500' : '#4CAF50' 
              }]}>
                {powerUsage > THRESHOLD_2 ? 'CRITICAL' : 
                 powerUsage > THRESHOLD_1 ? 'WARNING' : 'NORMAL'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Notifications:</Text>
              <Text style={[styles.infoValue, { 
                color: notificationPermission ? '#4CAF50' : '#F44336' 
              }]}>
                {notificationPermission ? 'ENABLED' : 'DISABLED'}
              </Text>
            </View>
          </View>
        )}
        
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
      </ScrollView>
      
      {/* Warning modal with individual component control */}
      <Modal
        visible={showWarning}
        transparent={true}
        animationType="slide"
      >
        <View style={styles.centeredView}>
          <View style={styles.warningModal}>
            <Ionicons name="warning" size={36} color="#FFA500" />
            <Text style={styles.warningTitle}>
              {threshold === 1 ? 'Warning: Power Threshold Reached' : 'Critical: High Power Usage'}
            </Text>
            <Text style={styles.warningText}>
              {threshold === 1 
                ? `Power usage (${powerUsage}W) has exceeded the first threshold.` 
                : `Power usage (${powerUsage}W) has reached critical levels!`
              }
            </Text>
            
            {/* List of active components to control individually */}
            <View style={styles.componentControls}>
              <Text style={styles.componentControlTitle}>Turn off specific components:</Text>
              
              {components.filter(comp => comp.isOn).map((component) => (
                <TouchableOpacity
                  key={component.id}
                  style={styles.componentControlButton}
                  onPress={() => handleToggleComponent(component.id)}
                >
                  <Ionicons name="power" size={18} color="white" />
                  <Text style={styles.componentControlText}>{component.name}</Text>
                </TouchableOpacity>
              ))}
              
              {/* Show message if no components are on */}
              {components.filter(comp => comp.isOn).length === 0 && (
                <Text style={styles.noComponentsText}>No active components to turn off.</Text>
              )}
            </View>
            
            <View style={styles.warningButtons}>
              <TouchableOpacity
                style={[styles.warningButton, styles.actionButton]}
                onPress={handleTurnOffAll}
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

// Function to register for push notifications
async function registerForPushNotificationsAsync(): Promise<boolean> {
  let granted = false;
  
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('power-alerts', {
      name: 'Power Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  granted = finalStatus === 'granted';
  
  return granted;
}

// Function to schedule a push notification
async function schedulePushNotification(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Smart Power Monitor - ${title}`,
      body: body,
      data: { data: 'power-alert' },
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // null means send immediately
  });
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
  notificationWarning: {
    backgroundColor: '#FFEBEE',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  notificationWarningText: {
    color: '#D32F2F',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  notificationButton: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    marginLeft: 8,
  },
  notificationButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
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
  infoContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#555',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  tariffButton: {
    backgroundColor: '#3F51B5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 24,
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
    marginBottom: 16,
    color: '#555',
  },
  componentControls: {
    width: '100%',
    marginBottom: 16,
  },
  componentControlTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: '#333',
  },
  componentControlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F44336',
    padding: 10,
    borderRadius: 6,
    marginVertical: 4,
  },
  componentControlText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '500',
  },
  noComponentsText: {
    color: '#757575',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 8,
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