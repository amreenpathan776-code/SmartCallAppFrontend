import React, { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BASE_URL from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function DPDListScreen({ route, navigation }) {
  const { dpdQueue, userId } = route.params;

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
const [activeTab, setActiveTab] = useState("ALL");

  useFocusEffect(
    useCallback(() => {
      fetchDPDData();
    }, [dpdQueue, userId])
  );

  const fetchDPDData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/dpd-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dpdQueue, userId }),
      });

      const result = await response.json();
      const records = result.records || [];

const today = new Date().toISOString().split("T")[0];

const filteredRecords = records.filter((item) => {
  if (item.AccountStatus !== "COMPLETED") return true;

  if (!item.CompletedAt) return false;

  const completedDate = new Date(item.CompletedAt)
    .toISOString()
    .split("T")[0];

  return completedDate === today;
});

setData(filteredRecords);
setFilteredData(filteredRecords);
      setLoading(false);
    } catch (error) {
      console.error("DPD Fetch Error:", error);
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchDPDData();
    setRefreshing(false);
  };

  /* SEARCH */
  const handleSearch = (text) => {
    setSearchText(text);

    if (text.trim() === "") {
      setFilteredData(data);
      return;
    }

    const lower = text.toLowerCase();

    const filtered = data.filter(
      (item) =>
        item.firstname?.toLowerCase().includes(lower) ||
        item.loanAccountNumber?.toString().includes(lower) ||
        item.mobileNumber?.toString().includes(lower)
    );

    setFilteredData(filtered);
  };

  /* CARD */
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        item.AccountStatus !== "PENDING" && { opacity: 0.6 },
      ]}
      activeOpacity={item.AccountStatus === "PENDING" ? 0.7 : 1}
onPress={() => {

  const today = new Date().toISOString().split("T")[0];

  const callDate = item.ScheduleCallTimestamp
    ? new Date(item.ScheduleCallTimestamp).toISOString().split("T")[0]
    : null;

  const visitDate = item.ScheduleVisitTimestamp
    ? new Date(item.ScheduleVisitTimestamp).toISOString().split("T")[0]
    : null;

  // 🚫 Already scheduled for today
  if (callDate === today || visitDate === today) {
    Alert.alert(
      "Scheduled For Today",
      "This account is already moved to today's schedule. Please open from Schedule For The Day."
    );
    return;
  }

  // 🔁 In process → open reset screen
  if (item.AccountStatus === "IN PROCESS") {
    navigation.navigate("ResetForToday", {
      loanAccountNumber: item.loanAccountNumber
    });
    return;
  }

  // ✅ Normal flow
  navigation.navigate("AccountDetails", {
    loanAccountNumber: item.loanAccountNumber,
    visitSource: "ASSIGNED",
    accountStatus: item.AccountStatus
  });

}}
    >
<View style={styles.nameRow}>
  
  {/* 👤 PERSON ICON + NAME */}
  <View style={styles.personRow}>
    <Ionicons name="person-circle" size={22} color="#0a3d62" />
    <Text style={styles.name}>{item.firstname}</Text>
  </View>
{item.AccountStatus && (
          <View
style={[
    styles.statusBadge,
    item.AccountStatus === "IN PROCESS"
      ? styles.statusInProcess
      : item.AccountStatus === "COMPLETED"
      ? styles.statusCompleted
      : styles.statusPending,
  ]}
>
  <Text
    style={[
      styles.statusText,
      item.AccountStatus === "IN PROCESS" && { color: "#000" },
      item.AccountStatus === "COMPLETED" && { color: "#000" },
      item.AccountStatus === "PENDING" && { color: "#fff" },
    ]}
  >
    {item.AccountStatus}
  </Text>
</View>

        )}
      </View>

      <Text style={styles.sub}>Loan A/c: {item.loanAccountNumber}</Text>

 <View style={styles.row}>

  <View style={styles.phoneRow}>
    <Ionicons name="call" size={18} color="#27ae60" />
    <Text style={styles.phoneText}>{item.mobileNumber}</Text>
  </View>

  <View style={{alignItems:"flex-end"}}>
    <Text style={styles.amount}>₹ {item.overdueAmount}</Text>

    <Text style={{fontSize:11,color:"#555"}}>
      Attempt No : {item.AttemptCount || 0}
    </Text>
  </View>

</View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0a3d62" />
        <Text>Loading accounts...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* HEADER */}
 <View style={styles.header}>
  {/* BACK BUTTON */}
  <TouchableOpacity onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} color="#fff" />
  </TouchableOpacity>

  {/* TITLE */}
  <Text style={styles.headerTitle}>DPD Accounts</Text>

  {/* HOME BUTTON */}
  <TouchableOpacity
    onPress={async () => {
      const saved = await AsyncStorage.getItem("LOGGED_USER");
      const user = saved ? JSON.parse(saved) : null;

      if (!user) {
        Alert.alert("Error", "User session expired. Please login again.");
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

      {/* SEARCH */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#777" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name / account / mobile"
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>
{/* STATUS TABS */}
<View style={styles.tabContainer}>

  {["ALL", "PENDING", "IN PROCESS", "COMPLETED"].map((tab) => (
    <TouchableOpacity
      key={tab}
      style={[
        styles.tabButton,
        activeTab === tab && styles.activeTab,
      ]}
      onPress={() => {
        setActiveTab(tab);

        if (tab === "ALL") {
          setFilteredData(data);
        } else {
          const filtered = data.filter(
            (item) => item.AccountStatus === tab
          );
          setFilteredData(filtered);
        }
      }}
    >
      <Text
        style={[
          styles.tabText,
          activeTab === tab && styles.activeTabText,
        ]}
      >
        {tab}
      </Text>
    </TouchableOpacity>
  ))}

</View>
      {/* LIST */}
      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No records found
          </Text>
        }
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

  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "600" },

  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    margin: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    elevation: 2,
  },

  searchInput: { flex: 1, padding: 8, fontSize: 14 },

  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    elevation: 2,
  },

  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  name: { fontSize:14,fontWeight: "700", color: "#0a3d62" },


  sub: { fontSize: 12, color: "#555", marginBottom: 6 },

  row: { flexDirection: "row", justifyContent: "space-between" },

  amount: { fontSize: 14, fontWeight: "700", color: "#c0392b" },

  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },

  statusText: { fontSize: 10, fontWeight: "700", color: "#fff" },

statusInProcess: { backgroundColor: "#f39c12" }, // ORANGE
statusCompleted: { backgroundColor: "#27ae60" }, // GREEN
statusPending: { backgroundColor: "#676463" },   // RED

  phoneRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

phoneText: {
  fontSize: 13,
  color: "#333",
},
personRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},
tabContainer: {
  flexDirection: "row",
  justifyContent: "space-around",
  marginHorizontal: 10,
  marginTop: 10,
  marginBottom: 5,
},

tabButton: {
  paddingVertical: 6,
  paddingHorizontal: 10,
  borderRadius: 20,
  backgroundColor: "#e5e7eb",
},

activeTab: {
  backgroundColor: "#0a3d62",
},

tabText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#333",
},

activeTabText: {
  color: "#fff",
},
});
