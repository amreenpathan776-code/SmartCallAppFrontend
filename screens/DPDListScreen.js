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

export default function DPDListScreen({ route, navigation }) {
const { dpdQueue, userId } = route.params;

  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDPDData();
  }, []);
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
      body: JSON.stringify({
        dpdQueue,
        userId,
      }),
    });

    const result = await response.json();
    const records = result.records || [];

    setData(records);
    setFilteredData(records);
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


  /* ===== SEARCH ===== */
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

  /* ===== EACH CARD ===== */
const renderItem = ({ item }) => (
<TouchableOpacity
  style={[
    styles.card,
    item.AccountStatus !== "PENDING" && { opacity: 0.6 } // ✅ visually disabled
  ]}
  activeOpacity={item.AccountStatus === "PENDING" ? 0.7 : 1}
onPress={() => {
  if (item.AccountStatus !== "PENDING") {
    Alert.alert(
      "Not Allowed",
      "This account is already IN PROCESS / COMPLETED. Please open it from Schedule For The Day."
    );
    return;
  }

navigation.navigate("AccountDetails", {
  loanAccountNumber: item.loanAccountNumber,
  visitSource: "ASSIGNED",
});

}}

>

<View style={styles.nameRow}>
  <Text style={styles.name}>{item.firstname}</Text>

  {/* ✅ STATUS BADGE */}
  {item.AccountStatus ? (
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
      <Text style={styles.statusText}>{item.AccountStatus}</Text>
    </View>
  ) : null}
</View>

    <Text style={styles.sub}>
      Loan A/c: {item.loanAccountNumber}
    </Text>

    <View style={styles.row}>
      <Text>📞 {item.mobileNumber}</Text>
      <Text style={styles.amount}>
        ₹{item.currentOutstandingBalance}
      </Text>
    </View>

    <View style={styles.actions}>
      <View style={styles.iconBtn}>
        <Ionicons name="call" size={18} color="#0a3d62" />
        <Text style={styles.iconText}>Call</Text>
      </View>

      <View style={styles.iconBtn}>
        <Ionicons name="location" size={18} color="#27ae60" />
        <Text style={styles.iconText}>Visit</Text>
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>DPD Accounts</Text>
        <View style={{ width: 24 }} />
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

/* ===== STYLES ===== */

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
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0a3d62",
  },
  sub: {
    fontSize: 12,
    color: "#555",
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
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 8,
  },
  iconBtn: {
    alignItems: "center",
  },
  iconText: {
    fontSize: 11,
    marginTop: 2,
  },
  nameRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
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

statusInProcess: {
  backgroundColor: "#f39c12", // orange
},

statusCompleted: {
  backgroundColor: "#27ae60", // green
},

statusPending: {
  backgroundColor: "#7f8c8d", // grey
},

});
