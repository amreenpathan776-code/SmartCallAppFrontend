import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function WelcomeScreen({ navigation }) {

  // 🟢 Screen Load Log
  useEffect(() => {
    console.log("📱 [WELCOME_SCREEN] Loaded");
  }, []);

  const handleLogin = () => {
    console.log("➡️ [WELCOME_SCREEN] Login button clicked");
    navigation.navigate("Login");
  };

  const handleRegister = () => {
    console.log("➡️ [WELCOME_SCREEN] Register button clicked");
    navigation.navigate("Register");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Smart Recovery App</Text>

      <TouchableOpacity
        style={styles.button}
        onPress={handleLogin}
      >
        <Text style={styles.buttonText}>Login</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.outlineButton}
        onPress={handleRegister}
      >
        <Text style={styles.outlineButtonText}>Register</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center" ,paddingBottom: 15},
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 40 },
  button: {
    width: "80%",
    backgroundColor: "#0a3d62",
    padding: 15,
    paddingBottom: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  buttonText: { color: "#fff", textAlign: "center" },
  outlineButton: {
    width: "80%",
    borderWidth: 1,
    borderColor: "#0a3d62",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },
  outlineButtonText: { color: "#0a3d62", textAlign: "center" },
});