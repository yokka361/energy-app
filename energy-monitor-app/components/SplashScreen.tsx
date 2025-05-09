import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");

const messages = [
  "Monitoring made simple",
  "Save energy. Live smart.",
  "Control from anywhere",
  "Real-time power tracking",
  "Smart Energy Meter",
];

export default function SplashScreen({ onFinish }: { onFinish: () => void }) {
  const [messageIndex, setMessageIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cycle = 0;
    const interval = setInterval(() => {
      cycle += 1;
      if (cycle === messages.length) {
        clearInterval(interval);
        setTimeout(() => onFinish(), 1000);
      } else {
        setMessageIndex(cycle);
        animateFade();
      }
    }, 1500);

    animateFade();
    animateProgressBar();
    return () => clearInterval(interval);
  }, []);

  const animateFade = () => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.9);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
      }),
    ]).start();
  };

  const animateProgressBar = () => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: messages.length * 1500, // total splash duration
      easing: Easing.linear,
      useNativeDriver: false,
    }).start();
  };

  const progressBarWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, width - 40],
  });

  return (
    <View style={styles.container}>
      <Animated.Text
        style={[
          styles.message,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {messages[messageIndex]}
      </Animated.Text>

      <View style={styles.progressBarContainer}>
        <Animated.View
          style={[styles.progressBar, { width: progressBarWidth }]}
        />
      </View>

      <View style={styles.credits}>
        <Text style={styles.creditText}>
          Contributors: E/20/085, E/20/091, E/20/281
        </Text>
        <Text style={styles.creditText}>App Support: Yohan Senadheera</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#3F51B5",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  message: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#FFFFFF",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  progressBarContainer: {
    height: 6,
    width: "100%",
    maxWidth: width - 40,
    backgroundColor: "#7986CB",
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 30,
  },
  progressBar: {
    height: 6,
    backgroundColor: "#FFFFFF",
    borderRadius: 3,
  },
  credits: {
    position: "absolute",
    bottom: 40,
    alignItems: "center",
  },
  creditText: {
    color: "#B0BEC5",
    fontSize: 12,
    textAlign: "center",
  },
});
