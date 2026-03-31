import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";

import BASE_URL from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";

import {
  requestLocationPermission,
  getCurrentLocation,
} from "./LocationService";

export default function NearbyCustomersScreen({ navigation }) {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNearbyCustomers();
  }, []);

  const loadNearbyCustomers = async () => {
    try {
      setLoading(true);

      const allowed = await requestLocationPermission();
      if (!allowed) {
        Alert.alert("Permission required", "Location permission is needed");
        setLoading(false);
        return;
      }

      const position = await getCurrentLocation();

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      const user = JSON.parse(await AsyncStorage.getItem("LOGGED_USER"));

      const response = await fetch(
        `${BASE_URL}/nearby-customers?lat=${lat}&lng=${lng}&userId=${user.UserId}`
      );

      const data = await response.json();

      // ✅ SORT LOW → HIGH DISTANCE
      const sorted = data.sort((a, b) => a.distance - b.distance);

      setCustomers(sorted);
      setLoading(false);
    } catch (error) {
      console.log("Nearby customers error:", error);
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() =>
        navigation.navigate("AccountDetails", {
          loanAccountNumber: item.loanAccountNumber,
        })
      }
    >
      <View style={styles.rowBetween}>
        
        {/* 👤 ICON + NAME */}
        <View style={styles.nameRow}>
          <Ionicons
            name="person-circle-outline"
            size={22}
            color="#1e4fa1"
          />
          <Text style={styles.name}>
            {item.customerName}
          </Text>
        </View>

        {/* DISTANCE */}
        <View style={styles.distanceBadge}>
          <Text style={styles.distanceText}>
            {Number(item.distance).toFixed(2)} KM
          </Text>
        </View>

      </View>

      <Text style={styles.address}>{item.address}</Text>

      <View style={styles.visitRow}>
        <Ionicons name="walk-outline" size={16} color="#1e4fa1" />
        <Text style={styles.visitText}>Tap to start visit</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          VISIT NEARBY CUSTOMERS
        </Text>

        <TouchableOpacity
          onPress={async () => {
            const saved = await AsyncStorage.getItem("LOGGED_USER");
            const user = saved ? JSON.parse(saved) : null;

            navigation.reset({
              index: 0,
              routes: [{ name: "Home", params: { user } }],
            });
          }}
        >
          <Ionicons name="home" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={{ marginTop: 10 }}>
            Finding nearby customers...
          </Text>
        </View>
      ) : !customers.length ? (
        <View style={styles.center}>
          <Text>No nearby customers found</Text>

          <TouchableOpacity
            style={styles.retryBtn}
            onPress={loadNearbyCustomers}
          >
            <Text style={{ color: "#fff" }}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(item) => item.loanAccountNumber}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 10 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f6fa",
  },

  header: {
    backgroundColor: "#1e4fa1",
    paddingTop: 45,
    paddingBottom: 15,
    paddingHorizontal: 15,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },

  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 10,
    marginBottom: 12,
    elevation: 3,
  },

  nameRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  name: {
    fontWeight: "bold",
    fontSize: 15,
    marginLeft: 6,
  },

  address: {
    color: "#555",
    marginTop: 5,
  },

  distanceBadge: {
    backgroundColor: "#e0edff",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },

  distanceText: {
    color: "#1e4fa1",
    fontWeight: "600",
    fontSize: 12,
  },

  visitRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },

  visitText: {
    marginLeft: 6,
    color: "#1e4fa1",
    fontSize: 12,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  retryBtn: {
    marginTop: 15,
    backgroundColor: "#2563eb",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },
});