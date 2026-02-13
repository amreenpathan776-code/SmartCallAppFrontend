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
} from "react-native";

import Ionicons from "react-native-vector-icons/Ionicons";
import BASE_URL from "./config";
import { useFocusEffect } from "@react-navigation/native";

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
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.firstname}</Text>

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
          <Text>📞 {item.mobileNumber}</Text>
          <Text style={styles.amount}>₹{item.currentOutstandingBalance}</Text>
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
                    onPress: () => {
                     navigation.navigate("AccountDetails", {
  loanAccountNumber: item.LoanAccountNumber,
  openFlow: "VISIT_START",
  visitSource: "SCHEDULE",
});

                    },
                  },
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

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          Today {type === "CALL" ? "Call" : "Visit"} Schedule
        </Text>

        <View style={{ width: 24 }} />
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
      <FlatList
        data={filteredData}
        keyExtractor={(item, index) => String(item.LoanAccountNumber || index)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 10 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No schedules for today ✅
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
});
