import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import BASE_URL from "./config";

export default function ResetForToday({ route, navigation }) {

  const { loanAccountNumber } = route.params;

  const confirmReset = (type) => {

    Alert.alert(
      "Confirm Reset",
      `Are you sure you want to reset to ${type} today?`,
      [
        { text: "No" },
        {
          text: "Yes",
          onPress: () => resetSchedule(type)
        }
      ]
    );
  };

  const resetSchedule = async (type) => {

    try {

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

      if (!res.ok) {
        Alert.alert("Error", data.message || "Reset failed");
        return;
      }

      Alert.alert("Success", "Moved to today's schedule");

      navigation.goBack();

    } catch (e) {
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