import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";

import BASE_URL from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPersistentDeviceId } from "./deviceIdHelper";

export default function LoginScreen({ navigation }) {
  const [mpin, setMpin] = useState("");
  const [loading, setLoading] = useState(false);

  const inputRef = useRef(null);

  const handleLogin = async () => {
    try {
      const deviceId = await getPersistentDeviceId();

      if (!mpin) {
        Alert.alert("Error", "Please enter MPIN");
        return;
      }

      if (mpin.length !== 4) {
        Alert.alert("Error", "MPIN must be exactly 4 digits");
        return;
      }

      if (!deviceId) {
        Alert.alert("Error", "Device ID not found");
        return;
      }

      setLoading(true);

      console.log("✅ LOGIN sending:", { mpin, deviceId });

      const response = await fetch(`${BASE_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mpin, deviceId }),
      });

const data = await response.json();
console.log("📱 LOGIN RESPONSE:", data);

// ⭐⭐⭐ STRICT CHECK ⭐⭐⭐
if (response.ok && data.user) {

  await AsyncStorage.setItem("LOGGED_USER", JSON.stringify(data.user));

  Alert.alert("Success", "Login successful", [
    {
      text: "OK",
      onPress: () => {
        navigation.reset({
          index: 0,
          routes: [{ name: "Home", params: { user: data.user } }],
        });
      },
    },
  ]);

} else {
  Alert.alert("Login Failed", data.message || "Invalid login");
}

setLoading(false);


      setLoading(false)
    } catch (error) {
      setLoading(false);
      Alert.alert("Error", "Unable to connect to server");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>LOGIN</Text>

      <TouchableOpacity
        activeOpacity={1}
        onPress={() => inputRef.current?.focus()}
      >
        <View style={styles.mpinContainer}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.mpinBox, mpin.length === i && styles.activeBox]}
            >
              <Text style={styles.mpinText}>{mpin[i] ? "•" : ""}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      <TextInput
        ref={inputRef}
        value={mpin}
        onChangeText={(text) => {
          if (/^\d*$/.test(text) && text.length <= 4) {
            setMpin(text);
          }
        }}
        keyboardType="numeric"
        maxLength={4}
        style={styles.hiddenInput}
        autoFocus
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Logging in..." : "Login"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text style={styles.registerText}>New user? Register here</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 30,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 30,
  },

  button: {
    backgroundColor: "#0a3d62",
    padding: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
  registerText: {
    textAlign: "center",
    color: "#0a3d62",
    marginTop: 15,
    fontWeight: "500",
  },

  mpinContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  mpinBox: {
    width: 35,
    height: 35,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 6,
  },
  activeBox: {
    borderColor: "#0a3d62",
  },
  mpinText: {
    fontSize: 24,
    fontWeight: "bold",
  },

  hiddenInput: {
    position: "absolute",
    opacity: 0,
    height: 0,
    width: 0,
  },
});
