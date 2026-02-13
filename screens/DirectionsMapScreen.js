import React from "react";
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";
import Ionicons from "react-native-vector-icons/Ionicons";

export default function DirectionsMapScreen({ route, navigation }) {

  const start = route?.params?.startLocation;
  const end = route?.params?.customerLocation;

  // ⭐ FULL SAFETY CHECK (important)
  if (
    !start ||
    !end ||
    !start.latitude ||
    !start.longitude ||
    !end.latitude ||
    !end.longitude
  ) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={{ marginTop: 10 }}>Waiting for valid coordinates...</Text>
      </View>
    );
  }

  // ⭐ Convert safely
  const startLat = parseFloat(start.latitude);
  const startLng = parseFloat(start.longitude);
  const endLat = parseFloat(end.latitude);
  const endLng = parseFloat(end.longitude);

  // ⭐ EXTRA protection against NaN crash
  if (
    isNaN(startLat) ||
    isNaN(startLng) ||
    isNaN(endLat) ||
    isNaN(endLng)
  ) {
    return (
      <View style={styles.loader}>
        <Text>Invalid coordinates received</Text>
      </View>
    );
  }

  const points = [
    { latitude: startLat, longitude: startLng },
    { latitude: endLat, longitude: endLng },
  ];

  return (
    <View style={{ flex: 1 }}>
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: startLat,
          longitude: startLng,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        <Marker coordinate={points[0]} title="Start Location" pinColor="green" />
        <Marker coordinate={points[1]} title="Customer Location" pinColor="red" />

        <Polyline
          coordinates={points}
          strokeWidth={4}
          strokeColor="blue"
        />
      </MapView>

      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
        <Text style={{ color: "#fff", marginLeft: 6 }}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    position: "absolute",
    top: 50,
    left: 20,
    backgroundColor: "#2563eb",
    padding: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
