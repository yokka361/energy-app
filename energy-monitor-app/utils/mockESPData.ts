// mockESPData.ts
import { useState, useEffect } from 'react';

// Define types
export type ComponentType = {
  id: number;
  name: string;
  isOn: boolean;
};

export type ESPStatus = {
  connected: boolean;
  components: ComponentType[];
  powerUsage: number;
  threshold: number | null;
};

// Initial mock data
const initialComponents: ComponentType[] = [
  { id: 1, name: 'Light Bulb', isOn: false },
  { id: 2, name: 'Fan', isOn: false },
  { id: 3, name: 'Heater', isOn: false },
];

// Thresholds for warnings (in watts)
export const THRESHOLD_1 = 100;
export const THRESHOLD_2 = 150;

// Power consumption for each component when turned on (in watts)
const componentPower = {
  1: 25,  // Light bulb uses 25W
  2: 45,  // Fan uses 45W
  3: 120, // Heater uses 120W
};

// Mock ESP8266 data and functions
export function useESP8266() {
  const [espData, setESPData] = useState<ESPStatus>({
    connected: false,
    components: [...initialComponents],
    powerUsage: 0,
    threshold: null,
  });
  
  // Connect to ESP8266
  const connect = async (): Promise<void> => {
    // Simulate connection delay
    return new Promise((resolve) => {
      setTimeout(() => {
        setESPData(prev => ({
          ...prev,
          connected: true,
        }));
        resolve();
      }, 1500);
    });
  };
  
  // Disconnect from ESP8266
  const disconnect = (): void => {
    setESPData({
      connected: false,
      components: initialComponents.map(c => ({ ...c, isOn: false })),
      powerUsage: 0,
      threshold: null,
    });
  };
  
  // Toggle component state
  const toggleComponent = async (id: number): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setESPData(prev => {
          // Find the component and toggle its state
          const updatedComponents = prev.components.map(comp => 
            comp.id === id ? { ...comp, isOn: !comp.isOn } : comp
          );
          
          // Calculate new power usage
          const newPowerUsage = calculatePowerUsage(updatedComponents);
          
          // Check threshold
          const newThreshold = getThreshold(newPowerUsage);
          
          return {
            ...prev,
            components: updatedComponents,
            powerUsage: newPowerUsage,
            threshold: newThreshold,
          };
        });
        
        resolve(true);
      }, 300);
    });
  };
  
  // Turn off all components
  const turnOffAll = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        setESPData(prev => ({
          ...prev,
          components: prev.components.map(comp => ({ ...comp, isOn: false })),
          powerUsage: 0,
          threshold: null,
        }));
        
        resolve(true);
      }, 500);
    });
  };
  
  // Calculate power usage based on component states
  const calculatePowerUsage = (components: ComponentType[]): number => {
    let totalPower = 0;
    
    components.forEach(comp => {
      if (comp.isOn) {
        totalPower += componentPower[comp.id as keyof typeof componentPower] || 0;
      }
    });
    
    // Add some random fluctuation (±5W)
    const fluctuation = Math.floor(Math.random() * 10) - 5;
    return Math.max(0, totalPower + fluctuation);
  };
  
  // Get threshold level based on power usage
  const getThreshold = (powerUsage: number): number | null => {
    if (powerUsage > THRESHOLD_2) return 2;
    if (powerUsage > THRESHOLD_1) return 1;
    return null;
  };
  
  // Update power usage periodically when connected
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (espData.connected) {
      interval = setInterval(() => {
        setESPData(prev => {
          const newPowerUsage = calculatePowerUsage(prev.components);
          const newThreshold = getThreshold(newPowerUsage);
          
          return {
            ...prev,
            powerUsage: newPowerUsage,
            threshold: newThreshold,
          };
        });
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [espData.connected]);
  
  return {
    espData,
    connect,
    disconnect,
    toggleComponent,
    turnOffAll,
  };
}