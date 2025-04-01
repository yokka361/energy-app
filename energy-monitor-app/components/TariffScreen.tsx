import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Switch
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../app/(tabs)/index';

// Define component props type
type TariffScreenProps = {
  route: RouteProp<RootStackParamList, 'Tariff'>;
  navigation: any;
};

// Define the tariff settings type
type TariffSettings = {
  tariff: string;
  dailyHours: string;
  useDualTariff: boolean;
  peakTariff: string;
  offPeakTariff: string;
  peakHours: string;
  offPeakHours: string;
};

export default function TariffScreen({ route, navigation }: TariffScreenProps) {
  // Get current power usage from route params
  const { powerUsage } = route.params || { powerUsage: 0 };
  
  // State variables
  const [tariff, setTariff] = useState<string>('0.12');
  const [hourlyUsage, setHourlyUsage] = useState<number>(powerUsage / 1000); // Convert W to kW
  const [dailyHours, setDailyHours] = useState<string>('8');
  const [useDualTariff, setUseDualTariff] = useState<boolean>(false);
  const [peakTariff, setPeakTariff] = useState<string>('0.16');
  const [offPeakTariff, setOffPeakTariff] = useState<string>('0.09');
  const [peakHours, setPeakHours] = useState<string>('6');
  const [offPeakHours, setOffPeakHours] = useState<string>('2');

  // Load saved tariff settings
  useEffect(() => {
    loadSettings();
  }, []);

  // Calculate cost values
  const dailyCost = useDualTariff 
    ? calculateDualTariffCost(hourlyUsage, parseFloat(peakHours), parseFloat(offPeakHours), parseFloat(peakTariff), parseFloat(offPeakTariff))
    : (hourlyUsage * parseFloat(dailyHours) * parseFloat(tariff));
  
  const monthlyCost = dailyCost * 30;
  const yearlyCost = dailyCost * 365;

  // Calculate cost with dual tariff
  function calculateDualTariffCost(usage: number, peakHrs: number, offPeakHrs: number, peakRate: number, offPeakRate: number): number {
    const peakCost = usage * peakHrs * peakRate;
    const offPeakCost = usage * offPeakHrs * offPeakRate;
    return peakCost + offPeakCost;
  }

  // Load settings from AsyncStorage
  const loadSettings = async (): Promise<void> => {
    try {
      const settings = await AsyncStorage.getItem('tariffSettings');
      if (settings) {
        const parsedSettings = JSON.parse(settings) as TariffSettings;
        setTariff(parsedSettings.tariff);
        setDailyHours(parsedSettings.dailyHours);
        setUseDualTariff(parsedSettings.useDualTariff);
        setPeakTariff(parsedSettings.peakTariff);
        setOffPeakTariff(parsedSettings.offPeakTariff);
        setPeakHours(parsedSettings.peakHours);
        setOffPeakHours(parsedSettings.offPeakHours);
      }
    } catch (error) {
      console.error("Error loading tariff settings:", error);
    }
  };

  // Save settings to AsyncStorage
  const saveSettings = async (): Promise<void> => {
    try {
      const settings: TariffSettings = {
        tariff,
        dailyHours,
        useDualTariff,
        peakTariff,
        offPeakTariff,
        peakHours,
        offPeakHours
      };
      
      await AsyncStorage.setItem('tariffSettings', JSON.stringify(settings));
    } catch (error) {
      console.error("Error saving tariff settings:", error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Current Power Usage */}
        <View style={styles.usageContainer}>
          <Text style={styles.sectionTitle}>Current Power Usage</Text>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Power:</Text>
            <Text style={styles.usageValue}>{powerUsage} W</Text>
          </View>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Hourly Usage:</Text>
            <Text style={styles.usageValue}>{hourlyUsage.toFixed(3)} kWh</Text>
          </View>
        </View>
        
        {/* Tariff Settings */}
        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>Tariff Settings</Text>
          
          {/* Toggle between simple and dual tariff */}
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Use Dual Tariff:</Text>
            <Switch
              value={useDualTariff}
              onValueChange={(value) => setUseDualTariff(value)}
              trackColor={{ false: "#ccc", true: "#81b0ff" }}
              thumbColor={useDualTariff ? "#2196F3" : "#f4f3f4"}
            />
          </View>
          
          {/* Simple Tariff Settings */}
          {!useDualTariff && (
            <>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Cost per kWh ($):</Text>
                <TextInput
                  style={styles.input}
                  value={tariff}
                  onChangeText={setTariff}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Daily Hours:</Text>
                <TextInput
                  style={styles.input}
                  value={dailyHours}
                  onChangeText={setDailyHours}
                  keyboardType="decimal-pad"
                />
              </View>
            </>
          )}
          
          {/* Dual Tariff Settings */}
          {useDualTariff && (
            <>
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Peak Hours:</Text>
                <TextInput
                  style={styles.input}
                  value={peakHours}
                  onChangeText={setPeakHours}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Peak Rate ($):</Text>
                <TextInput
                  style={styles.input}
                  value={peakTariff}
                  onChangeText={setPeakTariff}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Off-Peak Hours:</Text>
                <TextInput
                  style={styles.input}
                  value={offPeakHours}
                  onChangeText={setOffPeakHours}
                  keyboardType="decimal-pad"
                />
              </View>
              
              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>Off-Peak Rate ($):</Text>
                <TextInput
                  style={styles.input}
                  value={offPeakTariff}
                  onChangeText={setOffPeakTariff}
                  keyboardType="decimal-pad"
                />
              </View>
            </>
          )}
          
          {/* Save Button */}
          <TouchableOpacity
            style={styles.saveButton}
            onPress={saveSettings}
          >
            <Text style={styles.saveButtonText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
        
        {/* Cost Calculation */}
        <View style={styles.costContainer}>
          <Text style={styles.sectionTitle}>Cost Calculation</Text>
          
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Daily Cost:</Text>
            <Text style={styles.costValue}>${dailyCost.toFixed(2)}</Text>
          </View>
          
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Monthly Cost:</Text>
            <Text style={styles.costValue}>${monthlyCost.toFixed(2)}</Text>
          </View>
          
          <View style={styles.costRow}>
            <Text style={styles.costLabel}>Yearly Cost:</Text>
            <Text style={styles.costValue}>${yearlyCost.toFixed(2)}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  usageContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  usageLabel: {
    fontSize: 16,
    color: '#555',
  },
  usageValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: {
    fontSize: 16,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 8,
    width: 100,
    textAlign: 'right',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#2196F3',
    padding: 12,
    borderRadius: 4,
    alignItems: 'center',
    marginTop: 16,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  costContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  costLabel: {
    fontSize: 16,
    color: '#555',
  },
  costValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2196F3',
  },
});