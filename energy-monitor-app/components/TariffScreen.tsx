import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from "react-native";
import { getDatabase, ref, onValue } from "firebase/database";

export default function TariffScreen() {
  const [totalEnergy, setTotalEnergy] = useState<number | null>(null); // in Wh
  const [warningThreshold, setWarningThreshold] = useState<number | null>(null); // in Wh
  const [criticalThreshold, setCriticalThreshold] = useState<number | null>(
    null
  ); // in Wh
  const [isLoading, setIsLoading] = useState(true);

  // Firebase fetch
  useEffect(() => {
    const db = getDatabase();
    const monitorRef = ref(db, "monitoring");

    const unsubscribe = onValue(monitorRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setTotalEnergy(data.totalEnergy || 0);
        setWarningThreshold(data.WARNING_THRESHOLD || 100000); // default 100kWh
        setCriticalThreshold(data.CRITICAL_THRESHOLD || 300000); // default 300kWh
      }
      setIsLoading(false);
    });

    return () => unsubscribe(); // cleanup
  }, []);

  const kWh = totalEnergy !== null ? totalEnergy  : 0;
  const tierInfo = getTariffInfo(kWh);

  function getTariffInfo(kWh: number): {
    range: string;
    fixed: number;
    energyCharge: number;
    total: number;
  } {
    const wt = warningThreshold ?? 0; // convert to kWh
    const ct = criticalThreshold ?? 0;

    let fixed = 0;
    let energyCharge = 0;
    let range = "";

    if (kWh <= wt) {
      energyCharge = kWh * 4;
      fixed = 75;
      range = `Below ${wt} kWh (Normal)`;
    } else if (kWh <= ct) {
      energyCharge = wt * 4 + (kWh - wt) * 6;
      fixed = 200;
      range = `Between ${wt} - ${ct} kWh (Warning)`;
    } else {
      energyCharge = wt * 4 + (ct - wt) * 6 + (kWh - ct) * 14;
      fixed = 400;
      range = `Above ${ct} kWh (Critical)`;
    }

    return {
      range,
      fixed,
      energyCharge,
      total: energyCharge + fixed,
    };
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Monthly Energy Tariff</Text>

        {isLoading ? (
          <ActivityIndicator
            size="large"
            color="#2196F3"
            style={{ marginTop: 40 }}
          />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.label}>Total Energy:</Text>
              <Text style={styles.value}>{kWh.toFixed(2)} kWh</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Tariff Range:</Text>
              <Text
                style={[styles.value, { color: getRangeColor(tierInfo.range) }]}
              >
                {tierInfo.range}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Energy Charges:</Text>
              <Text style={styles.value}>
                Rs. {tierInfo.energyCharge.toFixed(2)}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.label}>Fixed Charges:</Text>
              <Text style={styles.value}>Rs. {tierInfo.fixed.toFixed(2)}</Text>
            </View>

            <View style={[styles.card, styles.totalCard]}>
              <Text style={styles.totalLabel}>Total Bill:</Text>
              <Text style={styles.totalValue}>
                Rs. {tierInfo.total.toFixed(2)}
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Color indication for the tier
function getRangeColor(range: string): string {
  if (range.includes("Normal")) return "#4CAF50";
  if (range.includes("Warning")) return "#FFC107";
  if (range.includes("Critical")) return "#F44336";
  return "#333";
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f0f4f8",
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 20,
    color: "#333",
    textAlign: "center",
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 16,
    color: "#666",
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2196F3",
  },
  totalCard: {
    backgroundColor: "#e3f2fd",
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1976D2",
    marginBottom: 6,
  },
  totalValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#0D47A1",
  },
});
