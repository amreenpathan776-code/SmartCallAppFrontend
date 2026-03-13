import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
  Alert,
  SectionList,
} from "react-native";

import Ionicons from "react-native-vector-icons/Ionicons";
import BASE_URL from "./config";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function TodayScheduleList({ route, navigation }) {
  const { userId, type } = route.params; // type = CALL / VISIT

  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchTodaySchedules = async () => {
    try {
      setLoading(true);

      const res = await fetch(`${BASE_URL}/api/home/schedule-today-list`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, type }),
      });

      const data = await res.json();
      const list = data.records || [];

      setRecords(list);
      setFilteredData(list);
    } catch (err) {
      console.log("❌ Today schedule list error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodaySchedules();
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchTodaySchedules(); // ✅ auto refresh when back
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTodaySchedules();
    setRefreshing(false);
  };

  // ✅ SEARCH (same like dpdlist)
  const handleSearch = (text) => {
    setSearchText(text);

    if (text.trim() === "") {
      setFilteredData(records);
      return;
    }

    const lower = text.toLowerCase();

    const filtered = records.filter(
      (item) =>
        item.firstname?.toLowerCase().includes(lower) ||
        item.LoanAccountNumber?.toString().includes(lower) ||
        item.mobileNumber?.toString().includes(lower)
    );

    setFilteredData(filtered);
  };

  const renderItem = ({ item }) => {
    const isPending =
      type === "CALL"
        ? Number(item.ScheduleCallPendingFlag) === 1
        : Number(item.ScheduleVisitPendingFlag) === 1;

    const isCompleted =
      type === "CALL"
        ? Number(item.ScheduleCallCompletedFlag) === 1
        : Number(item.ScheduleVisitCompletedFlag) === 1;

    const badgeText = isCompleted ? "COMPLETED" : "PENDING";

    return (
      <View style={[styles.card, isCompleted && { opacity: 0.55 }]}>
        {/* NAME + BADGE */}
<View style={styles.personRow}>
  <View style={{ flexDirection: "row", alignItems: "center" }}>
    <Ionicons name="person-circle" size={22} color="#0a3d62" />
    <Text style={[styles.name, { marginLeft: 6 }]}>
      {item.firstname}
    </Text>
  </View>

  <View
    style={[
      styles.statusBadge,
      isCompleted ? styles.statusCompleted : styles.statusPending,
    ]}
  >
    <Text style={styles.statusText}>{badgeText}</Text>
  </View>
</View>

        <Text style={styles.sub}>Loan A/c: {item.LoanAccountNumber}</Text>

        <View style={styles.row}>
            <View style={styles.phoneRow}>
              <Ionicons name="call" size={18} color="#27ae60" />
              <Text style={styles.phoneText}>{item.mobileNumber}</Text>
            </View>
          <Text style={styles.amount}>₹{item.overdueAmount}</Text>
        </View>

        {/* ✅ ACTION ICONS (ONLY ONE ICON BASED ON TYPE) */}
        <View style={styles.actions}>
          {/* ✅ If type = CALL → show only CALL icon */}
          {type === "CALL" && (
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={() => {
                // ✅ COMPLETED: block click
                if (isCompleted) {
                  Alert.alert(
                    "Completed Today ✅",
                    "This schedule is already completed."
                  );
                  return;
                }

                const phone = String(item.mobileNumber || "").trim();

                if (!phone) {
                  Alert.alert(
                    "No Number",
                    "Mobile number not available for this customer"
                  );
                  return;
                }

                navigation.navigate("AccountDetails", {
                  loanAccountNumber: item.LoanAccountNumber,
                  openFlow: "CALL_AFTER_DIAL",
                  dialNumber: phone,
                });
              }}
            >
              <Ionicons name="call" size={18} color="#0a3d62" />
              <Text style={styles.iconText}>Call</Text>
            </TouchableOpacity>
          )}

          {/* ✅ If type = VISIT → show only VISIT icon */}
          {type === "VISIT" && (
            <TouchableOpacity
              style={styles.iconBtn}
              activeOpacity={0.7}
              onPress={() => {
                // ✅ COMPLETED: block click
                if (isCompleted) {
                  Alert.alert(
                    "Completed Today ✅",
                    "This schedule is already completed."
                  );
                  return;
                }

                Alert.alert("Start Visit", "Do you want to start the visit?", [
                  { text: "No", style: "cancel" },
                 {
  text: "Yes",
  onPress: async () => {

const activeVisit = await AsyncStorage.getItem("ACTIVE_VISIT_SESSION");

if (activeVisit) {

  Alert.alert(
    "Visit Already Running",
    "You already have a visit in progress. Opening that visit.",
    [
      {
        text: "Continue Visit",
        onPress: () => {
          navigation.navigate("AccountDetails", {
            loanAccountNumber: item.LoanAccountNumber,
            openFlow: "VISIT_START",
            visitSource: "SCHEDULE",
          });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]
  );

  return;
}

    navigation.navigate("AccountDetails", {
      loanAccountNumber: item.LoanAccountNumber,
      openFlow: "VISIT_START",
      visitSource: "SCHEDULE",
    });

  },
}
                ]);
              }}
            >
              <Ionicons name="location" size={18} color="#27ae60" />
              <Text style={styles.iconText}>Visit</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0a3d62" />
        <Text>Loading today schedules...</Text>
      </View>
    );
  }
const groupByDate = (data) => {
  const grouped = {};
  const today = new Date();

  data.forEach((item) => {
    let rawDate;

    const isCompleted =
      type === "CALL"
        ? Number(item.ScheduleCallCompletedFlag) === 1
        : Number(item.ScheduleVisitCompletedFlag) === 1;

    // 🔥 If completed → use UpdatedAt
    if (isCompleted) {
      rawDate = item.UpdatedAt;
    } else {
      rawDate =
        type === "CALL"
          ? item.ScheduleCallTimestamp
          : item.ScheduleVisitTimestamp;
    }

    if (!rawDate) return;

    const dateObj = new Date(rawDate);

    const formatted =
      dateObj.toDateString() === today.toDateString()
        ? "TODAY"
        : dateObj.toLocaleDateString("en-GB");

    if (!grouped[formatted]) {
      grouped[formatted] = [];
    }

    grouped[formatted].push(item);
  });

  // 🔥 Convert to sections
  const sections = Object.keys(grouped).map((date) => ({
    title: date,
    data: grouped[date],
  }));

  // 🔥 SORT SECTIONS (Latest first, TODAY always top)
  sections.sort((a, b) => {
    if (a.title === "TODAY") return -1;
    if (b.title === "TODAY") return 1;

    const dateA = new Date(a.title.split("/").reverse().join("-"));
    const dateB = new Date(b.title.split("/").reverse().join("-"));

    return dateB - dateA;
  });

  return sections;
};
  return (
    <View style={styles.container}>
      {/* HEADER */}
     <View style={styles.header}>
  {/* BACK BUTTON */}
  <TouchableOpacity onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} color="#fff" />
  </TouchableOpacity>

  {/* TITLE */}
  <Text style={styles.headerTitle}>
    Today {type === "CALL" ? "Call" : "Visit"} Schedule
  </Text>

  {/* HOME BUTTON */}
  <TouchableOpacity
    onPress={async () => {
      const saved = await AsyncStorage.getItem("LOGGED_USER");
      const user = saved ? JSON.parse(saved) : null;

      if (!user) {
        Alert.alert("Session expired", "Please login again.");
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

      {/* ✅ SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#777" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name / account / mobile"
          value={searchText}
          onChangeText={handleSearch}
        />
      </View>

      {/* LIST */}
      <SectionList
  sections={groupByDate(filteredData)}
  keyExtractor={(item, index) => item.LoanAccountNumber + index}
  renderItem={renderItem}
  renderSectionHeader={({ section }) => (
  <View style={{
    backgroundColor: section.title === "TODAY" ? "#0a3d62" : "#0a3d62",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 15,
    borderRadius: 8,
    elevation: 2,
    alignItems: "center",

  }}>
    <Text style={{
      fontWeight: "900",
      fontSize: 15,
      color: section.title === "TODAY" ? "#fff" : "#fff"
    }}>
      {section.title}
    </Text>
  </View>
)}

  contentContainerStyle={{ padding: 10 }}
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
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
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

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

  name: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0a3d62",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
  },

  statusPending: {
    backgroundColor: "#7f8c8d",
  },

  statusCompleted: {
    backgroundColor: "#27ae60",
  },

  sub: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
    marginBottom: 6,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  amount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#c0392b",
  },

  actions: {
    flexDirection: "row",
    justifyContent: "center", // ✅ only 1 icon shows
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },

  iconBtn: {
    alignItems: "center",
    width: 100,
  },

  iconText: {
    fontSize: 11,
    marginTop: 2,
  },
personRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
},

  phoneRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},

phoneText: {
  fontSize: 13,
  color: "#333",
},
});
