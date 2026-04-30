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

  const [scheduledMode, setScheduledMode] = useState(false);
  const [scheduledData, setScheduledData] = useState([]);
  const [selectedAccounts, setSelectedAccounts] = useState([]);
const [scheduledTitle, setScheduledTitle] = useState("");

  useFocusEffect(
    useCallback(() => {
      console.log("📱 DPDListScreen focused", { dpdQueue, userId });
      fetchDPDData();
    }, [dpdQueue, userId])
  );
useEffect(() => {
  const unsubscribe = navigation.addListener("beforeRemove", (e) => {

    // allow navigation reset (HOME) to work normally
    if (
      e.data.action.type === "RESET" ||
      e.data.action.type === "REPLACE"
    ) {
      return;
    }

    if (!scheduledMode) return;

    e.preventDefault();
    setScheduledMode(false);
  });

  return unsubscribe;
}, [navigation, scheduledMode]);
const fetchDPDData = async () => {
  console.log("📥 Fetch DPD list", { dpdQueue, userId });

  try {

    const saved = await AsyncStorage.getItem("LOGGED_USER");
    const user = saved ? JSON.parse(saved) : null;

    console.log("👤 Logged user", {
      userId,
      userName: user?.UserName || user?.name
    });

    console.log("🌐 Calling /api/dpd-list");

    const response = await fetch(`${BASE_URL}/api/dpd-list`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dpdQueue,
        userId,
        userName: user?.UserName || user?.name
      }),
    });

    const result = await response.json();
    const records = result.records || [];
console.log("📦 DPD fetched data", {
  userId,
  userName: user?.UserName || user?.name,
  records
});

console.log("✅ DPD list received", records.length);

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

const fetchScheduledAccounts = async (type) => {
  const saved = await AsyncStorage.getItem("LOGGED_USER");
const user = saved ? JSON.parse(saved) : null;
  console.log("📥 Fetch scheduled accounts", type);
  try {
    console.log("🌐 Calling /api/recovery/scheduled-list", type);
   const response = await fetch(`${BASE_URL}/api/recovery/scheduled-list`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    type,
    userId,
    userName: user?.UserName || user?.name
  }),
});

    const result = await response.json();
    console.log("📦 Scheduled accounts fetched", {
  userId,
  userName: user?.UserName || user?.name,
  type,
  records: result.records
});

    setScheduledData(result.records || []);
    setScheduledMode(true);
    setSelectedAccounts([]);

    setScheduledTitle(
      type === "FUTURE"
        ? "Future Scheduled Accounts"
        : "Past Scheduled Accounts"
    );

  } catch (error) {
    console.log("Scheduled accounts fetch error:", error);
  }
};

const resetBulk = async (type) => {
  console.log("📥 Bulk reset", {
    type,
    count: selectedAccounts.length
  });

  const saved = await AsyncStorage.getItem("LOGGED_USER");
  const user = saved ? JSON.parse(saved) : null;

  Alert.alert(
    "Confirm",
    `Reset ${selectedAccounts.length} accounts?`,
    [
      { text: "Cancel" },
      {
        text: "Yes",
        onPress: async () => {
          for (const acc of selectedAccounts) {

            // 1️⃣ Reset API
            await fetch(`${BASE_URL}/api/recovery/reset-today`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                loanAccountNumber: acc,
                type,
              }),
            });

            // 2️⃣ Activity Log API
            await fetch(`${BASE_URL}/api/activity/log`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                actionCode: "RESET_TO_TODAY",
                actionLabel:
                  type === "CALL"
                    ? "Reset to Call Today"
                    : "Reset to Visit Today",

                userId: user?.UserId,
                userName: user?.UserName || user?.name,

                sourceType: "NPA",
                sourceId: acc,

                metadata: {
                  resetType: type
                }
              }),
            });

          }

          setScheduledMode(false);
          fetchDPDData();
        },
      },
    ]
  );
};

  const onRefresh = async () => {
    console.log("🔁 Refresh DPD list");
    setRefreshing(true);
    await fetchDPDData();
    setRefreshing(false);
  };

  const handleSearch = (text) => {
    console.log("🔎 Search", text);
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
const formatDateTime = (value) => {
  if (!value) return "";

  const cleaned = String(value).replace("T", " ").replace("Z", "");

  const [datePart, timePart] = cleaned.split(" ");

  const [year, month, day] = datePart.split("-");

  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const months = ["Jan","Feb","Mar","Apr","May","Jun",
                  "Jul","Aug","Sep","Oct","Nov","Dec"];

  // create date only for day name (safe)
  const tempDate = new Date(year, month - 1, day);

  const dayName = days[tempDate.getDay()];
  const monthName = months[month - 1];

  const time = timePart.substring(0,5);

  return `${dayName}, ${day} ${monthName} ${year}, ${time}`;
};
    const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[
        styles.card,
        item.AccountStatus !== "PENDING" && { opacity: 0.6 },
      ]}
      activeOpacity={item.AccountStatus === "PENDING" ? 0.7 : 1}
     onPress={() => {

console.log("🔘 DPD account clicked", {
loanAccountNumber: item.loanAccountNumber,
name: item.firstname,
mobile: item.mobileNumber,
status: item.AccountStatus,
overdueAmount: item.overdueAmount,
attempt: item.AttemptCount,
scheduleCall: item.ScheduleCallTimestamp,
scheduleVisit: item.ScheduleVisitTimestamp,
userId,
userName: route?.params?.userName,
status: item.AccountStatus
});

  const today = new Date().toISOString().split("T")[0];

  const callDate = item.ScheduleCallTimestamp
    ? new Date(item.ScheduleCallTimestamp).toISOString().split("T")[0]
    : null;

  const visitDate = item.ScheduleVisitTimestamp
    ? new Date(item.ScheduleVisitTimestamp).toISOString().split("T")[0]
    : null;

  // 🔶 IN PROCESS
  if (item.AccountStatus === "IN PROCESS") {
    if (callDate === today || visitDate === today) {
      Alert.alert(
        "Scheduled For Today",
        "This account is scheduled for today. Please open from Schedule For The Day."
      );
    } else {
      Alert.alert(
        "In Process",
        "This account is in process. Use reset option."
      );
    }
    return;
  }

  // 🔴 COMPLETED
  if (item.AccountStatus === "COMPLETED") {
    Alert.alert(
      "Completed",
      "Can't open completed accounts"
    );
    return;
  }
console.log("🔀 Navigating to AccountDetails", item.loanAccountNumber);

  // ✅ PENDING → open normally
  navigation.navigate("AccountDetails", {
    loanAccountNumber: item.loanAccountNumber,
    visitSource: "ASSIGNED",
    accountStatus: item.AccountStatus,
  });

}}

    >
      <View style={styles.nameRow}>
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

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.amount}>₹ {item.overdueAmount}</Text>
          <Text style={{ fontSize: 11 }}>
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
      </View>
    );
  }

  return (
    <View style={styles.container}>
<View style={styles.header}>
  <TouchableOpacity
    style={styles.headerSide}
    onPress={() => {
      if (scheduledMode) {
        setScheduledMode(false);
      } else {
        navigation.goBack();
      }
    }}
  >
    <Ionicons name="arrow-back" size={24} color="#fff" />
  </TouchableOpacity>

  <Text style={styles.headerTitle}>DPD Accounts</Text>

  <View style={styles.headerRight}>
    {!scheduledMode && (
      <>
        <TouchableOpacity
          onPress={() => fetchScheduledAccounts("FUTURE")}
          style={styles.iconBtn}
        >
          <Ionicons name="calendar-outline" size={22} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => fetchScheduledAccounts("PAST")}
          style={styles.iconBtn}
        >
          <Ionicons name="time-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </>
    )}

    <TouchableOpacity
      onPress={async () => {
        const saved = await AsyncStorage.getItem("LOGGED_USER");
        const user = saved ? JSON.parse(saved) : null;

        navigation.reset({
          index: 0,
          routes: [{ name: "Home", params: { user } }],
        });
      }}
      style={styles.iconBtn}
    >
      <Ionicons name="home" size={22} color="#fff" />
    </TouchableOpacity>
  </View>
      </View>
{scheduledMode && (
  <View
    style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginHorizontal: 14,
      marginTop: 5,
    }}
  >
    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
      <Ionicons
        name={
          selectedAccounts.length === scheduledData.length &&
          scheduledData.length > 0
            ? "checkbox"
            : "square-outline"
        }
        size={22}
        color="#0a3d62"
        onPress={() => {
          if (selectedAccounts.length === scheduledData.length) {
            setSelectedAccounts([]);
          } else {
            setSelectedAccounts(
              scheduledData.map(x => x.LoanAccountNumber)
            );
          }
        }}
      />

      <Text
        style={{
          fontSize: 16,
          fontWeight: "700",
          color: "#0a3d62",
        }}
      >
        {scheduledTitle}
      </Text>
    </View>
  </View>
)}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#777" />
        <TextInput
  style={styles.searchInput}
  placeholder="Search name / account / mobile"
  placeholderTextColor="#888"
  value={searchText}
  onChangeText={handleSearch}
/>
      </View>

      <FlatList
        data={scheduledMode ? scheduledData : filteredData}
        keyExtractor={(item, index) => index.toString()}
      renderItem={({ item }) => {

  // ⭐ scheduled mode UI
if (scheduledMode) {
  const isSelected = selectedAccounts.includes(item.LoanAccountNumber);

return (
  <View style={{ flexDirection: "row", alignItems: "flex-start", marginHorizontal: 6 }}>
    
    <TouchableOpacity
      onPress={() => {
        if (isSelected) {
          setSelectedAccounts(
            selectedAccounts.filter(x => x !== item.LoanAccountNumber)
          );
        } else {
          setSelectedAccounts([
            ...selectedAccounts,
            item.LoanAccountNumber
          ]);
        }
      }}
      style={{ paddingTop: 18, paddingRight: 6 }}
    >
      <Ionicons
        name={isSelected ? "checkbox" : "square-outline"}
        size={22}
        color="#0a3d62"
      />
    </TouchableOpacity>

    <TouchableOpacity
      style={[styles.card, { flex: 1 }]}
      activeOpacity={1}
    >
      {/* reuse full dpd card layout */}
      <View style={styles.nameRow}>
        <View style={styles.personRow}>
          <Ionicons name="person-circle" size={22} color="#0a3d62" />
          <Text style={styles.name}>{item.firstname}</Text>
        </View>
      </View>

      <Text style={styles.sub}>
        Loan A/c: {item.LoanAccountNumber}
      </Text>

      <View style={styles.row}>
        <View style={styles.phoneRow}>
          <Ionicons name="call" size={18} color="#27ae60" />
          <Text style={styles.phoneText}>{item.mobileNumber}</Text>
        </View>

        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.amount}>₹ {item.overdueAmount}</Text>
          <Text style={{ fontSize: 11 }}>
            Attempt No : {item.AttemptCount || 0}
          </Text>
        </View>
      </View>

      {item.ScheduleCallTimestamp && (
        <Text style={{ fontSize: 11, marginTop: 5, color: "#555" }}>
          Call : {formatDateTime(item.ScheduleCallTimestamp)}
        </Text>
      )}

      {item.ScheduleVisitTimestamp && (
        <Text style={{ fontSize: 11, color: "#555" }}>
          Visit : {formatDateTime(item.ScheduleVisitTimestamp)}
        </Text>
      )}
    </TouchableOpacity>
  </View>
);
}

  // ⭐ normal dpd card
  return renderItem({ item });
}}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
      
  
{/* STICKY BOTTOM BUTTONS */}
    {scheduledMode && (
      <View style={styles.bottomActions}>
        <TouchableOpacity
          style={[styles.resetBtn, { backgroundColor: "#1e88e5" }]}
          disabled={selectedAccounts.length === 0}
          onPress={() => resetBulk("CALL")}
        >
          <Text style={styles.resetText}>
            Reset Selected To Call Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.resetBtn, { backgroundColor: "#43a047" }]}
          disabled={selectedAccounts.length === 0}
          onPress={() => resetBulk("VISIT")}
        >
          <Text style={styles.resetText}>
            Reset Selected To Visit Today
          </Text>
        </TouchableOpacity>
      </View>
    )}

  </View>
);
}
const styles = StyleSheet.create({
container: {
  flex: 1,
  backgroundColor: "#f2f4f7",
},
header: {
  height: 70,
  backgroundColor: "#0a3d62",
  flexDirection: "row",
  alignItems: "center",
  paddingHorizontal: 10,
  paddingTop: 20,
},

headerTitle: {
  flex: 1,
  textAlign: "center",
  color: "#fff",
  fontSize: 17,
  fontWeight: "600",
},

headerSide: {
  width: 40,
  alignItems: "center",
  justifyContent: "center",
},

headerRight: {
  flexDirection: "row",
  alignItems: "center",
},

iconBtn: {
  width: 36,
  alignItems: "center",
},
 searchContainer: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#fff",
  margin: 10,
  paddingHorizontal: 10,
  borderRadius: 8,
  elevation: 2,
},
  

searchInput: {
  flex: 1,
  padding: 8,
  fontSize: 14,
  color: "#000",
},
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

card: {
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: 14,
  marginHorizontal: 10,
  marginVertical: 6,

  // ANDROID shadow
  elevation: 4,

  // IOS shadow
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 3,
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

statusBadge: {
  paddingHorizontal: 12,
  paddingVertical: 5,
  borderRadius: 60,   // <-- IMPORTANT (pill)
  alignSelf: "flex-start",
},

statusText: {
  fontSize: 10,
  fontWeight: "700",
  letterSpacing: 0.3,
},

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
bottomActions: {
  padding: 12,
  backgroundColor: "#fff",
  borderTopWidth: 1,
  borderColor: "#eee",
},

resetBtn: {
  padding: 14,
  borderRadius: 10,
  marginBottom: 10,
  alignItems: "center",
},

resetText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 14,
},
});
