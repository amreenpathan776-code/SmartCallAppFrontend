import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";

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

      {/* TOP ICONS */}
      <View style={styles.topIcons}>
        <Text style={styles.icon}>🛡️</Text>
        <Text style={styles.icon}>💰</Text>
        <Text style={styles.icon}>🏦</Text>
        <Text style={styles.icon}>₹</Text>
        <Text style={styles.icon}>📍</Text>
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.title}>Smart Recovery App</Text>
        <Text style={styles.subtitle}>Field Visit & Recovery Management</Text>
      </View>

      <Image
        source={require("../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />

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

      {/* BOTTOM ICONS */}
      <View style={styles.bottomIcons}>
        <Text style={styles.icon}>🧮</Text>
        <Text style={styles.icon}>📞</Text>
        <Text style={styles.icon}>📈</Text>
        <Text style={styles.icon}>📋</Text>
        <Text style={styles.icon}>📄</Text>
      </View>

    </View>
  );
}
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    paddingBottom: 15,
    backgroundColor: "#fff"
  },

  headerContainer: {
    alignItems: "center",
    marginBottom: 20,
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#0a3d62",
    letterSpacing: 1,
  },

  subtitle: {
    fontSize: 14,
    color: "#555",
    marginTop: 5,
  },

  button: {
    width: "80%",
    backgroundColor: "#0a3d62",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },

  buttonText: { 
    color: "#fff", 
    textAlign: "center" 
  },

  outlineButton: {
    width: "80%",
    borderWidth: 1,
    borderColor: "#0a3d62",
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
  },

  outlineButtonText: { 
    color: "#0a3d62", 
    textAlign: "center" 
  },

  logo: {
    width: 180,
    height: 180,
    marginBottom: 50,
    marginTop: 20,
  },

topIcons: {
  position: "absolute",
  top: 50,
  width: "100%",
  flexDirection: "row",
  justifyContent: "space-evenly",
  paddingHorizontal:1,
  paddingTop:15
},

bottomIcons: {
  position: "absolute",
  bottom: 50,
  width: "100%",
  flexDirection: "row",
  justifyContent: "space-evenly",
  paddingHorizontal: 1,
  paddingBottom:15
},

icon: {
  fontSize: 24,
  color: "#9aa0a6",   // soft grey
  opacity: 0.5,       // brighter than before
}
});