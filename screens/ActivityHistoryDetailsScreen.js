import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BASE_URL from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ActivityHistoryDetailsScreen({ route, navigation }) {
  const { userId, loanAccountNumber, customerName } = route.params;
 const [userName, setUserName] = useState("");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

useEffect(() => {
  const loadUser = async () => {
    const saved = await AsyncStorage.getItem("LOGGED_USER");
    const user = saved ? JSON.parse(saved) : null;

    if (user) {
      setUserName(user.UserName);

      console.log("📱 [ACTIVITY_DETAILS] Screen loaded", {
        userId,
        userName: user.UserName,
        account: loanAccountNumber
      });

      fetchDetails(user.UserName);
    }
  };

  loadUser();
}, []);

  const fetchDetails = async (uName = userName) => {
    console.log("📡 [ACTIVITY_DETAILS] Fetching details", {
  userId,
  account: loanAccountNumber
});
    try {
      const res = await fetch(`${BASE_URL}/api/activity/history-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
  userId,
  userName: uName,
  loanAccountNumber
}),
      });

      const result = await res.json();
      setData(result.records || []);
console.log("📦 [ACTIVITY_DETAILS] Data fetched", {
  userId,
  userName: uName,
  account: loanAccountNumber,
  count: result.records?.length || 0,
  data: result.records || []
});
      setLoading(false);
    } catch (err) {
     console.log("❌ [ACTIVITY_DETAILS] Fetch error", err?.message);
      setLoading(false);
    }
  };

const renderItem = ({ item }) => {
const isScheduled =
  item.ActionLabel?.toLowerCase().includes("scheduled");

const scheduleTime =
  item.FormattedCallSchedule || item.FormattedVisitSchedule;

  return (
    <View style={styles.timelineRow}>
      <View style={styles.dot} />
      <View style={styles.content}>
       <Text style={styles.action}>
  {(item.SourceType === "CO_USE" ? "CO USE" : item.SessionType)} → {item.ActionLabel}
</Text>

        <Text style={styles.time}>
          {item.FormattedTime}
        </Text>
{isScheduled && scheduleTime && (
  <Text style={styles.schedule}>
    Scheduled On: {scheduleTime}
  </Text>
)}
      </View>
    </View>
  );
};

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0a3d62" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
   <View style={styles.header}>
  {/* BACK BUTTON */}
  <TouchableOpacity 
  onPress={() => {
  console.log("⬅️ [ACTIVITY_DETAILS] Back pressed");
  navigation.goBack();
}}>
    <Ionicons name="arrow-back" size={24} color="#fff" />
  </TouchableOpacity>

  {/* TITLE */}
  <Text style={styles.headerTitle}>Activity Details</Text>

  {/* HOME BUTTON */}
  <TouchableOpacity
    onPress={async () => {
      console.log("🏠 [ACTIVITY_DETAILS] Home clicked");
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

      {/* Account Info */}
      <View style={styles.accountCard}>
        <Text style={styles.customer}>{customerName}</Text>
        <Text style={styles.account}>
  {loanAccountNumber?.length === 10
    ? `Mobile No: ${loanAccountNumber}`
    : `Loan A/c: ${loanAccountNumber}`}
</Text>
      </View>

      {/* Timeline */}
      <FlatList
        data={data}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 15 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f9" },

  header: {
    height: 70,
    backgroundColor: "#0a3d62",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 20,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },

  accountCard: {
    backgroundColor: "#fff",
    padding: 15,
    margin: 12,
    borderRadius: 10,
    elevation: 2,
  },

  customer: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0a3d62",
  },

  account: {
    fontSize: 12,
    marginTop: 4,
    color: "#555",
  },

  timelineRow: {
    flexDirection: "row",
    marginBottom: 20,
  },

  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#0a3d62",
    marginTop: 5,
    marginRight: 10,
  },

  content: {
    flex: 1,
  },

  action: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  time: {
    fontSize: 12,
    color: "#777",
    marginTop: 4,
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  schedule: {
  fontSize: 12,
  color: "#0a3d62",
  marginTop: 4,
  fontWeight: "600",
},
});