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

export default function ActivityHistoryScreen({ route, navigation }) {
  const { userId } = route.params;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/activity/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const result = await res.json();
const sorted = (result.records || []).sort(
  (a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt)
);

setData(sorted);
      setLoading(false);
    } catch (err) {
      console.log("History fetch error:", err);
      setLoading(false);
    }
  };

const getStatus = (item) => item.AccountStatus;

  const renderItem = ({ item }) => {
    const status = getStatus(item);

return (
  <TouchableOpacity
    activeOpacity={0.8}
onPress={() =>
  navigation.navigate("ActivityHistoryDetails", {
    userId: userId,   // 🔥 ADD THIS
    loanAccountNumber: item.LoanAccountNumber,
    customerName: item.CustomerName,
  })
}
  >
    <View style={styles.card}>
        {/* Top Row */}
        <View style={styles.nameRow}>
          <View style={styles.personRow}>
            <Ionicons name="person-circle" size={22} color="#0a3d62" />
            <Text style={styles.name}>
              {item.CustomerName || "Unknown"}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              status === "COMPLETED"
                ? styles.statusCompleted
                : status === "IN PROCESS"
                ? styles.statusInProcess
                : styles.statusPending,
            ]}
          >
            <Text style={styles.statusText}>{status}</Text>
          </View>
        </View>

        {/* Account */}
        <Text style={styles.sub}>
          Loan A/c: {item.LoanAccountNumber}
        </Text>

        {/* Action */}
        <View style={styles.row}>
          <Text style={styles.action}>
            {item.SessionType} → {item.ActionLabel}
          </Text>
        </View>

        {/* Time */}
        <Text style={styles.time}>
          {item.FormattedTime}
        </Text>
        </View>
  </TouchableOpacity>

    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0a3d62" />
        <Text>Loading history...</Text>
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

        <Text style={styles.headerTitle}>Activity History</Text>

        <View style={{ width: 24 }} />
      </View>

      {/* LIST */}
      <FlatList
        data={data}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
          <Text style={{ textAlign: "center", marginTop: 20 }}>
            No history found
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f4f6f9" },

  /* ===== Header (Same style as DPD/NPA) ===== */
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

  /* ===== Card (Same as DPD cards) ===== */
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
  },

  nameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0a3d62",
  },

  sub: {
    fontSize: 12,
    color: "#555",
    marginVertical: 6,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  action: {
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
  },

  time: {
    fontSize: 12,
    color: "#777",
    marginTop: 6,
  },

  /* ===== Status Badge (Matching DPD style) ===== */
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

  statusInProcess: {
    backgroundColor: "#f39c12",
  },

  statusCompleted: {
    backgroundColor: "#27ae60",
  },

  statusPending: {
    backgroundColor: "#676463",
  },

  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});