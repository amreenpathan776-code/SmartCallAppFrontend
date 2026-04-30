import React, { useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import BASE_URL from "./config";

export default function ResetForToday({ route, navigation }) {

useEffect(()=>{
console.log("📱 ResetForToday screen loaded", route?.params);
},[]);

  const { loanAccountNumber } = route.params;

  const confirmReset = (type) => {

console.log("🔘 Reset option clicked", type);

    Alert.alert(
      "Confirm Reset",
      `Are you sure you want to reset to ${type} today?`,
      [
        { text: "No" },
        {
          text: "Yes",
         onPress: () => {
console.log("⚠️ Reset confirmed", type);
resetSchedule(type);
}
        }
      ]
    );
  };

  const resetSchedule = async (type) => {
const saved = await AsyncStorage.getItem("LOGGED_USER");
const user = saved ? JSON.parse(saved) : null;

console.log("👤 Reset user", {
userId: user?.UserId,
userName: user?.UserName || user?.name
});
console.log("📥 Reset schedule request", {
loanAccountNumber,
type,
userId: user?.UserId,
userName: user?.UserName || user?.name
});

    try {
console.log("🌐 Calling /api/recovery/reset-today");
      const res = await fetch(`${BASE_URL}/api/recovery/reset-today`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          loanAccountNumber,
          type
        })
      });

const data = await res.json();

console.log("📦 Reset API response", {
loanAccountNumber,
type,
userId: user?.UserId,
userName: user?.UserName || user?.name,
response: data
});

if (!res.ok) {
  console.log("❌ Reset failed", data);
  Alert.alert("Error", data.message || "Reset failed");
  return;
}

      console.log("✅ Reset success", type);

Alert.alert("Success", "Moved to today's schedule");
console.log("🔀 Navigating back after reset");
      navigation.goBack();

   } catch (e) {

console.log("❌ Reset API error", e);
      Alert.alert("Error", "Server error");
    }

  };

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Reset Schedule</Text>

      <TouchableOpacity
        style={styles.callBtn}
        onPress={() => confirmReset("CALL")}
      >
        <Text style={styles.btnText}>Reset to Call Today</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.visitBtn}
        onPress={() => confirmReset("VISIT")}
      >
        <Text style={styles.btnText}>Reset to Visit Today</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  container:{
    flex:1,
    justifyContent:"center",
    alignItems:"center"
  },
  title:{
    fontSize:20,
    fontWeight:"bold",
    marginBottom:30
  },
  callBtn:{
    backgroundColor:"#1e88e5",
    padding:15,
    borderRadius:8,
    width:"70%",
    marginBottom:15
  },
  visitBtn:{
    backgroundColor:"#43a047",
    padding:15,
    borderRadius:8,
    width:"70%"
  },
  btnText:{
    color:"#fff",
    textAlign:"center",
    fontWeight:"bold"
  }
});