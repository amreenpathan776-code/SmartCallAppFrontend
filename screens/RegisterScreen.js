import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import BASE_URL from "./config";
import { getPersistentDeviceId } from "./deviceIdHelper";

export default function RegisterScreen() {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [mpin, setMpin] = useState("");
  const [securityQ, setSecurityQ] = useState("");
  const [securityA, setSecurityA] = useState("");
  const [loading, setLoading] = useState(false);

  const securityQuestions = [
    { label: "Select a security question", value: "" },
    { label: "What is your mother’s maiden name?", value: "q1" },
    { label: "What was the name of your first school?", value: "q2" },
    { label: "What is your favourite colour?", value: "q3" },
    { label: "What is your date of birth?", value: "q4" },
    { label: "What is your favourite food?", value: "q5" },
    { label: "What is the name of your best friend?", value: "q6" },
    { label: "What city were you born in?", value: "q7" },
    { label: "What was your first vehicle number?", value: "q8" },
    { label: "What is your favourite movie?", value: "q9" },
    { label: "What is your pet’s name?", value: "q10" },
  ];

  const handleRegister = async () => {
    try {
      const deviceId = await getPersistentDeviceId();

      if (!userId || !password || !mpin || !securityQ || !securityA) {
        Alert.alert("Error", "All fields are mandatory");
        return;
      }

      if (!/^\d{4}$/.test(mpin)) {
        Alert.alert("Error", "MPIN must be exactly 4 digits");
        return;
      }

      setLoading(true);

      const response = await fetch(`${BASE_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId.trim(),
          password,
          mpin,
          securityQ,
          securityA,
          deviceId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert("Registration Failed", data.message || "Registration failed");
        setLoading(false);
        return;
      }

      Alert.alert("Success", "Registration completed successfully");

      setUserId("");
      setPassword("");
      setMpin("");
      setSecurityQ("");
      setSecurityA("");
      setLoading(false);
    } catch (err) {
      setLoading(false);
      Alert.alert("Error", "Unable to connect to server");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>User Registration</Text>

      <TextInput
        style={styles.input}
        placeholder="User ID"
        value={userId}
        onChangeText={setUserId}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TextInput
        style={styles.input}
        placeholder="MPIN (4 digits)"
        secureTextEntry
        keyboardType="numeric"
        maxLength={4}
        value={mpin}
        onChangeText={(text) => {
          if (/^\d*$/.test(text) && text.length <= 4) setMpin(text);
        }}
      />

      <View style={styles.pickerContainer}>
        <Picker selectedValue={securityQ} onValueChange={(v) => setSecurityQ(v)}>
          {securityQuestions.map((q) => (
            <Picker.Item key={q.value} label={q.label} value={q.value} />
          ))}
        </Picker>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Security Answer"
        value={securityA}
        onChangeText={setSecurityA}
      />

      <TouchableOpacity
        style={[styles.button, loading && { opacity: 0.6 }]}
        onPress={handleRegister}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? "Registering..." : "Register"}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#0a3d62",
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  buttonText: {
    color: "#fff",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});
