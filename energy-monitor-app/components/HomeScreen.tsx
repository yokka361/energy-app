// HomeScreen.tsx
import React, { useState, useEffect, useRef } from "react";
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
  Platform,
  Dimensions
} from "react-native";
const { width, height } = Dimensions.get("window");
// import { Audio } from "expo-av";
import { Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../app/(tabs)/index"; // Adjust the import path as necessary
import * as Notifications from "expo-notifications";
import { db } from "../firebaseConfig";
import { ref, onValue, set } from "firebase/database";


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
  navigation: StackNavigationProp<RootStackParamList, "Home">;
};

type MonitoringData = {
  component1: boolean;
  component2: boolean;
  component3: boolean;
  dailyEnergy: number;
  power: number;
  thresholdLevel: number;
  totalEnergy: number;
  WARNING_THRESHOLD: number;
  CRITICAL_THRESHOLD: number;
};

export default function HomeScreen({ navigation }: HomeScreenProps) {
  // State variables
  const [loading, setLoading] = useState<boolean>(true);
  const prevThresholdLevel = useRef(0);

  const [error, setError] = useState<string | null>(null);
  const [monitoringData, setMonitoringData] = useState<MonitoringData>({
    component1: false,
    component2: false,
    component3: false,
    dailyEnergy: 0,
    power: 0,
    thresholdLevel: 0,
    totalEnergy: 0,
    WARNING_THRESHOLD: 0.1,
    CRITICAL_THRESHOLD: 0.3,
  });
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [appState, setAppState] = useState<AppStateStatus>(
    AppState.currentState
  );
  const [notificationPermission, setNotificationPermission] =
    useState<boolean>(false);

  // Listen for realtime updates from Firebase
  useEffect(() => {
    const monitoringRef = ref(db, "monitoring");
    const unsubscribe = onValue(
      monitoringRef,
      (snapshot) => {
        const data = snapshot.val();
        if (data) {
          setMonitoringData(data);
        }
        setLoading(false);
      },
      (err) => {
        setError("Failed to fetch monitoring data.");
        setLoading(false);
      }
    );
    return () => {
      // onValue returns an unsubscribe function
      unsubscribe();
    };
  }, []);

  // Setup notification permissions
  useEffect(() => {
    registerForPushNotificationsAsync().then((granted) => {
      setNotificationPermission(granted);
    });
  }, []);

  // Monitor app state changes
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      setAppState(nextAppState);
    });
    return () => {
      subscription.remove();
    };
  }, []);

  // Handle notifications and warning modal based on threshold and app state
  useEffect(() => {
    if (
      monitoringData.thresholdLevel > prevThresholdLevel.current &&
      appState !== "active"
    ) {
      const thresholdText =
        monitoringData.thresholdLevel === 1 ? "Warning" : "Critical";
      const message =
        monitoringData.thresholdLevel === 1
          ? "Power consumption has exceeded the warning threshold!"
          : "Power consumption has exceeded the critical threshold!";

      if (notificationPermission) {
        schedulePushNotification(thresholdText, message);
      }
    }

    prevThresholdLevel.current = monitoringData.thresholdLevel;
  }, [monitoringData.thresholdLevel, appState, notificationPermission]);

  const WARNING_THRESHOLD = monitoringData.WARNING_THRESHOLD / 30; //in Wh
  const CRITICAL_THRESHOLD = monitoringData.CRITICAL_THRESHOLD / 30; //in Wh

  useEffect(() => {
    if (monitoringData.thresholdLevel && appState === "active") {
      setShowWarning(true);
      Vibration.vibrate(4000); // Vibrates for 4 seconds
    }
  }, [monitoringData.thresholdLevel, appState]);

  // HomeScreen.tsx
  useEffect(() => {
    if (
      monitoringData.component1 === false &&
      monitoringData.component2 === false &&
      monitoringData.component3 === false
    ) {
      // If all components are off, divide power value by 20
      let adjustdailyEnergy = monitoringData.dailyEnergy - monitoringData.power;
      const adjustedPowerValue = monitoringData.power / 20;
      adjustdailyEnergy < 0 && (adjustdailyEnergy = 0); // Ensure daily energy is not negative
      set(ref(db, "monitoring/power"), adjustedPowerValue);
      set(ref(db, "monitoring/dailyEnergy"), adjustdailyEnergy);
    }
  }, [
    monitoringData.component1,
    monitoringData.component2,
    monitoringData.component3,
    monitoringData.power,
    monitoringData.dailyEnergy,
  ]);

  // Send command to Firebase for toggling a component
  const handleToggleComponent = async (componentId: number): Promise<void> => {
    const componentKey = `component${componentId}` as keyof MonitoringData;
    const currentState = monitoringData[componentKey] as boolean;
    const newState = !currentState;
    const command = `TOGGLE:${componentId}:${newState ? "ON" : "OFF"}`;

    try {
      // 1. Update Firebase with the new component state first
      await set(ref(db, `monitoring/${componentKey}`), newState);

      // 2. Clear command first
      await set(ref(db, "monitoring/command"), "NONE");

      // 3. Small delay and then send command
      setTimeout(async () => {
        await set(ref(db, "monitoring/command"), command);
      }, 200); // ~200ms delay
      // ✅ If turning OFF a component while warning is active, reset threshold
      if (!newState && monitoringData.thresholdLevel !== 0) {
        await set(ref(db, "monitoring/thresholdLevel"), 0);
      }
    } catch (err) {
      Alert.alert("Error", "Failed to toggle component.");
    }
  };

  // Dismiss the warning alert
  const dismissWarning = (): void => {
    setShowWarning(false);
    // ✅ Reset threshold level to 0
    set(ref(db, "monitoring/thresholdLevel"), 0);
  };

  // Send command to Firebase to turn off all components
  const handleTurnOffAll = async (): Promise<void> => {
    try {
      await set(ref(db, "monitoring/command"), "TURNOFFALL");
      dismissWarning();
    } catch (err) {
      Alert.alert("Error", "Failed to send turn off all command.");
    }
  };

  // Navigate to Tariff screen and pass power usage
  const goToTariffPage = (): void => {
    navigation.navigate("Tariff", { powerUsage: monitoringData.power });
  };

  // Component status button color
  const getButtonColor = (isOn: boolean): string => {
    return isOn ? "#4CAF50" : "#F44336";
  };

  // Handle power level display color
  const getPowerDisplayColor = (): string => {
    if (monitoringData.dailyEnergy > CRITICAL_THRESHOLD) return "#F44336"; // critical level (adjust as needed)
    if (monitoringData.dailyEnergy > WARNING_THRESHOLD) return "#FFA500"; // warning level (adjust as needed)
    return "#4CAF50";
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#3F51B5" />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Display monitoring power usage */}
        <View
          style={[
            styles.powerContainer,
            { backgroundColor: getPowerDisplayColor() },
          ]}
        >
          <Ionicons name="flash" size={28} color="white" />
          <Text style={styles.powerText}>
            {`Today Power Usage:  ${monitoringData.dailyEnergy}Wh`}
          </Text>
        </View>

        {/* Component control buttons */}
        <View style={styles.componentsContainer}>
          <Text style={styles.sectionTitle}>Components</Text>
          {[1, 2, 3].map((id) => {
            const isOn = monitoringData[
              `component${id}` as keyof MonitoringData
            ] as boolean;
            return (
              <View key={id} style={styles.componentRow}>
                <Text style={styles.componentName}>{`Component ${id}`}</Text>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    { backgroundColor: getButtonColor(isOn) },
                  ]}
                  onPress={() => handleToggleComponent(id)}
                >
                  <Text style={styles.buttonText}>{isOn ? "ON" : "OFF"}</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Power information details */}
        <View style={styles.infoContainer}>
          <Text style={styles.infoTitle}>Power Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Warning Threshold:</Text>
            <Text style={styles.infoValue}> {WARNING_THRESHOLD}Wh</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Critical Threshold:</Text>
            <Text style={styles.infoValue}> {CRITICAL_THRESHOLD}Wh</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Current Status:</Text>
            <Text
              style={[
                styles.infoValue,
                {
                  color:
                    monitoringData.dailyEnergy > CRITICAL_THRESHOLD
                      ? "#F44336"
                      : monitoringData.dailyEnergy > WARNING_THRESHOLD
                      ? "#FFA500"
                      : "#4CAF50",
                },
              ]}
            >
              {monitoringData.dailyEnergy > CRITICAL_THRESHOLD
                ? "CRITICAL"
                : monitoringData.dailyEnergy > WARNING_THRESHOLD
                ? "WARNING"
                : "NORMAL"}
            </Text>
          </View>
        </View>

        <View style={styles.monthlyUsageCard}>
          <Text style={styles.cardTitle}>Monthly Power Usage</Text>
          <View style={styles.usageRow}>
            <Text style={styles.usageValue}>
              {monitoringData.totalEnergy.toFixed(2)}
              <Text style={styles.unit}> Wh</Text>
            </Text>
            <Text style={styles.subtext}>Total Energy Usage This Month</Text>
          </View>
        </View>

        {/* Navigation button to Tariff page */}
        <TouchableOpacity style={styles.tariffButton} onPress={goToTariffPage}>
          <Ionicons name="stats-chart" size={24} color="white" />
          <Text style={styles.tariffButtonText}>Go to Tariff Page</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Warning modal with individual component control */}
      <Modal visible={showWarning} transparent={true} animationType="slide">
        <View style={styles.centeredView}>
          <View style={styles.warningModal}>
            <Ionicons name="warning" size={36} color="#FFA500" />
            <Text style={styles.warningTitle}>
              {monitoringData.thresholdLevel === 1
                ? "Warning: Power Threshold Reached"
                : "Critical: High Power Usage"}
            </Text>
            <Text style={styles.warningText}>
              {monitoringData.thresholdLevel === 1
                ? `Power usage (${monitoringData.dailyEnergy}W) has exceeded the warning threshold.`
                : `Power usage (${monitoringData.dailyEnergy}W) has reached critical levels!`}
            </Text>

            {/* List of active components to control individually */}
            <View style={styles.componentControls}>
              <Text style={styles.componentControlTitle}>
                Turn off specific components:
              </Text>
              {[1, 2, 3].map((id) => {
                const isOn = monitoringData[
                  `component${id}` as keyof MonitoringData
                ] as boolean;
                return isOn ? (
                  <TouchableOpacity
                    key={id}
                    style={styles.componentControlButton}
                    onPress={() => handleToggleComponent(id)}
                  >
                    <Ionicons name="power" size={18} color="white" />
                    <Text
                      style={styles.componentControlText}
                    >{`Component ${id}`}</Text>
                  </TouchableOpacity>
                ) : null;
              })}
              {/* Show message if no components are on */}
              {![
                monitoringData.component1,
                monitoringData.component2,
                monitoringData.component3,
              ].some(Boolean) && (
                <Text style={styles.noComponentsText}>
                  No active components to turn off.
                </Text>
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

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("power-alerts", {
      name: "Power Alerts",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
      sound: "default",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  granted = finalStatus === "granted";
  return granted;
}

// Function to schedule a push notification
async function schedulePushNotification(
  title: string,
  body: string
): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `Smart Energy Meter - ${title}`,
      body: body,
      data: { data: "power-alert" },
      sound: "default",
      priority: Notifications.AndroidNotificationPriority.HIGH,
    },
    trigger: null, // send immediately
    // Removed the android property as it is not valid in NotificationRequestInput
  });
}

// async function playWarningSound(): Promise<void> {
//   try {
//     const { sound } = await Audio.Sound.createAsync(
//       require("../assets/warning.mp3") // Place your sound file in assets folder
//     );
//     await sound.playAsync();
//   } catch (error) {
//     console.warn("Failed to play warning sound:", error);
//   }
// }

const STANDARD_FONT = 16;
const BLOCK_WIDTH = "100%";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    paddingHorizontal: "5%",
    paddingVertical: "2%",
  },
  errorText: {
    color: "#D32F2F",
    fontSize: STANDARD_FONT,
    textAlign: "center",
  },
  powerContainer: {
    marginTop: "12%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#673AB7",
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    width: BLOCK_WIDTH,
  },
  powerText: {
    color: "#fff",
    fontSize: STANDARD_FONT,
    fontWeight: "600",
    marginLeft: 10,
    flexShrink: 1,
  },

  componentsContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    width: BLOCK_WIDTH,
  },

  sectionTitle: {
    fontSize: STANDARD_FONT,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#333",
  },
  componentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  componentName: {
    fontSize: STANDARD_FONT,
    fontWeight: "500",
    flex: 1,
  },
  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    backgroundColor: "#4CAF50",
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    minWidth: 100,
    maxWidth: "45%",
    marginLeft: 10,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: STANDARD_FONT,
  },

  infoContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 24,
    elevation: 2,
    width: BLOCK_WIDTH,
  },
  infoTitle: {
    fontSize: STANDARD_FONT,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  infoLabel: {
    fontSize: STANDARD_FONT,
    color: "#555",
  },
  infoValue: {
    fontSize: STANDARD_FONT,
    fontWeight: "500",
  },

  monthlyUsageCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 15,
    marginTop: -10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 20,
    width: BLOCK_WIDTH, // ✅ Ensures full width
    alignSelf: "center", // Optional: centers within parent if needed
  },

  cardTitle: {
    fontSize: STANDARD_FONT,
    color: "#333333",
    marginBottom: 12,
    fontWeight: "600",
  },
  usageRow: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  usageValue: {
    fontSize: STANDARD_FONT + 16,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  unit: {
    fontSize: STANDARD_FONT + 4,
    color: "#888888",
  },
  subtext: {
    fontSize: STANDARD_FONT - 2,
    color: "#999999",
    marginTop: 4,
  },

  tariffButton: {
    marginTop: 16,
    backgroundColor: "#3F51B5",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    marginBottom: 24,
    width: BLOCK_WIDTH,
  },
  tariffButtonText: {
    color: "white",
    fontSize: STANDARD_FONT,
    fontWeight: "bold",
    marginLeft: 8,
  },

  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  warningModal: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  warningTitle: {
    fontSize: STANDARD_FONT,
    fontWeight: "bold",
    marginTop: 12,
    marginBottom: 8,
    textAlign: "center",
  },
  warningText: {
    fontSize: STANDARD_FONT,
    textAlign: "center",
    marginBottom: 16,
    color: "#555",
  },
  componentControls: {
    width: "100%",
    marginBottom: 16,
  },
  componentControlTitle: {
    fontSize: STANDARD_FONT,
    fontWeight: "500",
    marginBottom: 8,
    color: "#333",
  },
  componentControlButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F44336",
    padding: 8,
    borderRadius: 6,
    marginVertical: 4,
  },
  componentControlText: {
    color: "white",
    marginLeft: 8,
    fontWeight: "500",
    fontSize: STANDARD_FONT,
  },
  noComponentsText: {
    color: "#757575",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 8,
    fontSize: STANDARD_FONT - 2,
  },
  warningButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    flexWrap: "wrap",
  },
  warningButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: "center",
    marginHorizontal: 8,
    marginVertical: 5,
  },
  actionButton: {
    backgroundColor: "#F44336",
  },
  dismissButton: {
    backgroundColor: "#9E9E9E",
  },
  warningButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: STANDARD_FONT,
  },
});
