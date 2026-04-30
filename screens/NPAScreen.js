import React, { useEffect, useState, useCallback } from "react";
import BASE_URL from "./config";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function NPAScreen({ navigation , route }) {
  const userId = route?.params?.userId;
  const [userName, setUserName] = useState("");
const [dpdCounts, setDpdCounts] = useState({
  "0_30": { pending: 0, inProcess: 0, completed: 0 },
  "31_60": { pending: 0, inProcess: 0, completed: 0 },
  "61_90": { pending: 0, inProcess: 0, completed: 0 },
  "90_plus": { pending: 0, inProcess: 0, completed: 0 },
});
const [refreshing, setRefreshing] = useState(false);
useEffect(() => {
  const loadUser = async () => {
    const saved = await AsyncStorage.getItem("LOGGED_USER");
    const user = saved ? JSON.parse(saved) : null;

    if (user) {
      setUserName(user.UserName);

      console.log("👤 [NPA] User loaded", {
        userId: user.UserId,
        userName: user.UserName,
        deviceId: user.DeviceId
      });
    }
  };

  loadUser();
}, []);
const fetchDpdSummary = async () => {
 console.log("📡 [NPA] Fetching DPD summary", {
  userId,
  userName
});
  try {
    const res = await fetch(`${BASE_URL}/api/npa/dpd-summary-v2`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  userId,
  userName
}),
    });

    const data = await res.json();
    console.log("📦 [NPA] DPD summary fetched", {
  userId,
  userName,
  data
});
    setDpdCounts(data);
    console.log("📊 [NPA] DPD counts", {
  userId,
  userName,

  "0_30": data?.["0_30"],
  "31_60": data?.["31_60"],
  "61_90": data?.["61_90"],
  "90_plus": data?.["90_plus"]
});
 const total =
      (data?.["0_30"]?.pending || 0) +
      (data?.["31_60"]?.pending || 0) +
      (data?.["61_90"]?.pending || 0) +
      (data?.["90_plus"]?.pending || 0);

    console.log("📊 [NPA] Total pending count", {
      userId,
      userName,
      total
    });

  } catch (err) {
    console.error("❌ [NPA] Fetch failed", err?.message);
  }
};

// ✅ First load (when screen opens first time)
useEffect(() => {
  if (!userId) return;
  console.log("📥 [NPA] Initial load", { userId });
  fetchDpdSummary();
}, [userId]);

// ✅ Auto refresh when you come back to NPA screen
useFocusEffect(
  useCallback(() => {
    console.log("📱 [NPA] Screen focused", { userId });
    if (!userId) return;
    fetchDpdSummary();
  }, [userId])
);

// ✅ Pull to refresh function
const onRefresh = async () => {
  console.log("🔄 [NPA] Pull to refresh");
  setRefreshing(true);
  await fetchDpdSummary();
  setRefreshing(false);
};


  return (
    <View style={styles.container}>
      {/* ===== HEADER ===== */}
      <View style={styles.header}>
  {/* BACK BUTTON */}
  <TouchableOpacity
   onPress={() => {
  console.log("⬅️ [NPA] Back pressed");
  navigation.goBack();
}}
>
    <Ionicons name="arrow-back" size={22} color="#fff" />
  </TouchableOpacity>

  {/* TITLE */}
  <Text style={styles.headerTitle}>DPD QUEUE</Text>

  {/* HOME BUTTON */}
  <TouchableOpacity
    onPress={async () => {
      console.log("🏠 [NPA] Home clicked");
      const saved = await AsyncStorage.getItem("LOGGED_USER");
      const user = saved ? JSON.parse(saved) : null;

      if (!user) {
        alert("Session expired. Please login again.");
        return;
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "Home", params: { user } }],
      });
    }}
  >
    <Ionicons name="home" size={22} color="#fff" />
  </TouchableOpacity>
</View>

      {/* ===== CARD ===== */}
 <FlatList
  data={[1]} // dummy data to enable refresh
  keyExtractor={() => "npa"}
  refreshing={refreshing}
  onRefresh={onRefresh}
  contentContainerStyle={{ paddingBottom: 20 }}
  renderItem={() => (
    <View style={styles.card}>

      {/* COLUMN HEADERS */}
      <View style={[styles.row, styles.headerRowBlue]}>
        <Text style={[styles.colLabel, styles.headerTextWhite]}>
          DPD Queue
        </Text>
        <Text style={[styles.colValue, styles.headerTextWhite]}>
          Pending
        </Text>
        <Text style={[styles.colValue, styles.headerTextWhite]}>
          In-Process
        </Text>
        <Text style={[styles.colValue, styles.headerTextWhite]}>
          Completed
        </Text>
      </View>

      {/* ROWS */}
      {[
        { label: "0–30 days", key: "0_30", dpd: "01" },
        { label: "31–60 days", key: "31_60", dpd: "02" },
        { label: "61–90 days", key: "61_90", dpd: "03" },
        { label: "Above 90 days", key: "90_plus", dpd: "04,05,06,07" },
      ].map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.row}
          activeOpacity={0.7}
      onPress={() => {
  console.log("➡️ [NPA] DPD row clicked", {
    dpd: item.dpd,
    label: item.label
  });

  navigation.navigate("DPDList", {
    dpdQueue: item.dpd,
    userId: userId,
  });
}}
        >
          <Text style={styles.colLabel}>{item.label}</Text>

          <Text style={styles.colValue}>
            {dpdCounts[item.key]?.pending ?? 0}
          </Text>

          <Text style={styles.colValue}>
            {dpdCounts[item.key]?.inProcess ?? 0}
          </Text>

          <Text style={styles.colValue}>
            {dpdCounts[item.key]?.completed ?? 0}
          </Text>
        </TouchableOpacity>
      ))}

    </View>
  )}
/>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f5f9",
  },

  /* ===== HEADER ===== */
  header: {
    height: 78,
    backgroundColor: "#0b3c5d", // richer blue
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 26,
    elevation: 6,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 1,
  },

  /* ===== CARD ===== */
  card: {
    backgroundColor: "#fff",
    margin: 16,
    marginTop:30,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
  },

headerRowBlue: {
  backgroundColor: "#0b3c5d",
},

headerTextWhite: {
  fontSize: 12,
  fontWeight: "700",
  color: "#fff",
},

  /* ===== ROWS ===== */
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },

  headerRow: {
    backgroundColor: "#fbfcfe",
  },

  /* ===== COLUMNS ===== */
  colLabel: {
    width: "36%",
    fontSize: 14,
    color: "#333",
  },
  colValue: {
    width: "21%",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },

  headerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
  },
});
