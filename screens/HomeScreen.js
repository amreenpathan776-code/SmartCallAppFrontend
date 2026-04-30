import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
  FlatList,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BASE_URL from "./config";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation, route }) {
  const [showProfile, setShowProfile] = useState(false);

const user = route?.params?.user;
const [showAssigned, setShowAssigned] = useState(false);
const [homeSummary, setHomeSummary] = useState(null);
const [loadingSummary, setLoadingSummary] = useState(false);
const [refreshing, setRefreshing] = useState(false);
const [scheduleCounts, setScheduleCounts] = useState({
  call: { pending: 0, completed: 0 },
  visit: { pending: 0, completed: 0 },
});
const loadHomeData = async () => {
  console.log("📊 [HOME] Loading home data");
  try {
    await fetchHomeSummary();
    await fetchScheduleSummary();
  } catch (err) {
    console.log("Home refresh error:", err);
  }
};
const onRefresh = async () => {
  console.log("🔄 [HOME] Pull to refresh triggered");
  setRefreshing(true);
  await loadHomeData();
  setRefreshing(false);
};



const employee = {
  name: user?.UserName || "",
  empId: user?.UserId || "",
  designation: user?.Role || "",
  branchName: user?.BranchName || "",
  branchCode: user?.BranchCode || "",
};
console.log("👤 [HOME] Screen loaded for user:", user?.UserId);
const fetchHomeSummary = async () => {
  console.log("📡 [HOME] Fetching members summary", {
    userId: user?.UserId,
    userName: user?.UserName
  });

  try {
    setLoadingSummary(true);

    const res = await fetch(
      `${BASE_URL}/api/home/members-summary-v3`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user?.UserId,
        }),
      }
    );

    const data = await res.json();

    console.log("📦 [HOME] Members summary fetched", {
      userId: user?.UserId,
      data
    });

    setHomeSummary(data);
console.log("📊 [HOME] Assigned counts", {
  userId: user?.UserId,
  userName: user?.UserName,

  membersPending: data?.members?.pending || 0,
  membersInProcess: data?.members?.inProcess || 0,
  membersCompleted: data?.members?.completed || 0,

  marketingPending: data?.marketing?.pending || 0,
  marketingInProcess: data?.marketing?.inProcess || 0,
  marketingCompleted: data?.marketing?.completed || 0,

  npaPending: data?.npa?.pending || 0,
  npaInProcess: data?.npa?.inProcess || 0,
  npaCompleted: data?.npa?.completed || 0,

  welcomePending: data?.welcome?.pending || 0,
  welcomeInProcess: data?.welcome?.inProcess || 0,
  welcomeCompleted: data?.welcome?.completed || 0
});
    console.log("✅ [HOME] Members summary loaded", {
      userId: user?.UserId
    });

  } catch (err) {
    console.error("❌ Home summary fetch failed", err);
  } finally {
    setLoadingSummary(false);
  }
};
const fetchScheduleSummary = async () => {
  console.log("📡 [HOME] Fetching schedule summary", {
    userId: user?.UserId,
    userName: user?.UserName
  });

  try {
    const res = await fetch(`${BASE_URL}/api/home/schedule-summary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?.UserId,
      }),
    });

    const data = await res.json();

    console.log("📦 [HOME] Schedule summary fetched", {
      userId: user?.UserId,
      data
    });

    setScheduleCounts(data);
console.log("📊 [HOME] Schedule For The Day counts", {
  userId: user?.UserId,
  userName: user?.UserName,
  callPending: data?.call?.pending || 0,
  callCompleted: data?.call?.completed || 0,
  visitPending: data?.visit?.pending || 0,
  visitCompleted: data?.visit?.completed || 0
});
    console.log("✅ [HOME] Schedule summary loaded", {
      userId: user?.UserId
    });

  } catch (err) {
    console.error("❌ Schedule summary fetch failed:", err);
  }
};
useEffect(() => {
  if (user?.UserId) {
    fetchHomeSummary();
    fetchScheduleSummary();
  }
}, [user?.UserId]);
useFocusEffect(
  useCallback(() => {
    console.log("📱 [HOME] Screen focused");
    if (user?.UserId) {
      loadHomeData(); // ✅ Auto refresh when screen comes back
    }
  }, [user?.UserId])
);

  return (
    <View style={styles.container}>
      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setShowProfile(true)}>
          <Ionicons name="person-circle-outline" size={34} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>DASHBOARD</Text>

 <View style={{ flexDirection: "row", alignItems: "center", gap: 15 }}>

  {/* 🔥 HISTORY ICON */}
  <TouchableOpacity
onPress={() => {
  console.log("🕘 [HOME] Activity history clicked");
  navigation.navigate("ActivityHistory", {
    userId: user?.UserId,
  });
}}
  >
    <Ionicons name="time-outline" size={26} color="#fff" />
  </TouchableOpacity>

  {/* 🚪 LOGOUT ICON */}
  <TouchableOpacity
onPress={async () => {
  try {
    const savedUser = await AsyncStorage.getItem("LOGGED_USER");
    const parsedUser = savedUser ? JSON.parse(savedUser) : null;

    console.log("🚪 [HOME] Logout clicked", {
      userId: parsedUser?.UserId,
      userName: parsedUser?.UserName,
      deviceId: parsedUser?.DeviceId
    });

    await AsyncStorage.removeItem("LOGGED_USER");

    console.log("✅ [HOME] User logged out", {
      userId: parsedUser?.UserId,
      userName: parsedUser?.UserName,
      deviceId: parsedUser?.DeviceId
    });

    navigation.reset({
      index: 0,
      routes: [{ name: "Welcome" }],
    });

  } catch (err) {
    console.log("❌ [HOME] Logout error", err);
  }
}}
  >
    <Ionicons name="log-out-outline" size={28} color="#fff" />
  </TouchableOpacity>

</View>
</View>
{/* ================= BODY ================= */}
<FlatList
  data={[1]} // dummy
  keyExtractor={() => "home"}
  refreshing={refreshing}
  onRefresh={onRefresh}
  contentContainerStyle={styles.body}
  renderItem={() => (
    <>
      <Text style={styles.welcomeText}>Welcome..!</Text>
      <Text style={styles.userName}>{employee.name}</Text>

      {/* ================= SCHEDULE ================= */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderText}>
            Schedule For The Day
          </Text>
        </View>

        {/* COLUMN HEADERS */}
        <View style={styles.tableHeader}>
          <Text style={styles.headerCell}></Text>
          <Text style={styles.headerCell}>Pending</Text>
          <Text style={styles.headerCell}>Completed</Text>
        </View>

        <View style={styles.headerDivider} />

        {/* ROWS */}
 <TouchableOpacity
  style={styles.tableRow}
  activeOpacity={0.8}
onPress={() => {
  console.log("📅 [HOME] Today CALL schedule clicked");
  navigation.navigate("TodayScheduleList", {
    userId: user?.UserId,
    type: "CALL",
  });
}}
>
  <Text style={styles.rowLabel}>Call</Text>
  <Text style={styles.rowValue}>{scheduleCounts.call.pending}</Text>
  <Text style={styles.rowValue}>{scheduleCounts.call.completed}</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.tableRow}
  activeOpacity={0.8}
onPress={() => {
  console.log("📅 [HOME] Today VISIT schedule clicked");
  navigation.navigate("TodayScheduleList", {
    userId: user?.UserId,
    type: "VISIT",
  });
}}
>
  <Text style={styles.rowLabel}>Visit</Text>
  <Text style={styles.rowValue}>{scheduleCounts.visit.pending}</Text>
  <Text style={styles.rowValue}>{scheduleCounts.visit.completed}</Text>
</TouchableOpacity>

      </View>

      {/* ================= ASSIGNED ================= */}
      <View style={styles.card}>

        <View style={styles.cardHeader}>
          <Text style={styles.cardHeaderText}>
            Assigned
          </Text>
        </View>

        {/* Column Headers */}
        <View style={styles.assignedRow}>
          <Text style={[styles.colLabel, styles.headerText]}></Text>
          <Text style={[styles.colValue, styles.headerText]}>Pending</Text>
          <Text style={[styles.colValue, styles.headerText]}>In-Process</Text>
          <Text style={[styles.colValue, styles.headerText]}>Completed</Text>
          <View style={styles.colIcon} />
        </View>

        {/* MEMBERS ROW */}
        <TouchableOpacity
          style={styles.assignedRow}
          onPress={() => setShowAssigned(!showAssigned)}
          activeOpacity={0.7}
        >
          <Text style={[styles.colLabel, styles.boldText]}>
            Members
          </Text>

          <Text style={styles.colValue}>
            {homeSummary?.members?.pending ?? 0}
          </Text>
          <Text style={styles.colValue}>
            {homeSummary?.members?.inProcess ?? 0}
          </Text>
          <Text style={styles.colValue}>
            {homeSummary?.members?.completed ?? 0}
          </Text>

          <View style={styles.colIcon}>
            <Ionicons
              name={showAssigned ? "chevron-up" : "chevron-down"}
              size={18}
              color="#555"
            />
          </View>
        </TouchableOpacity>

        {/* EXPANDED CONTENT */}
        {showAssigned && (
          <>
            {/* MARKETING */}
            <TouchableOpacity
              style={styles.assignedRow}
              onPress={() => navigation.navigate("Marketing")}
            >
              <Text style={styles.colLabel}>Marketing</Text>
              <Text style={styles.colValue}>
                {homeSummary?.marketing?.pending ?? 0}
              </Text>
              <Text style={styles.colValue}>
                {homeSummary?.marketing?.inProcess ?? 0}
              </Text>
              <Text style={styles.colValue}>
                {homeSummary?.marketing?.completed ?? 0}
              </Text>
              <View style={styles.colIcon} />
            </TouchableOpacity>

            {/* NPA */}
            <TouchableOpacity
              style={styles.assignedRow}
              onPress={() =>
                navigation.navigate("NPA", {
                  userId: user?.UserId,
                })
              }
            >
              <Text style={[styles.colLabel, styles.boldText]}>
                NPA
              </Text>
              <Text style={styles.colValue}>
                {homeSummary?.npa?.pending ?? 0}
              </Text>
              <Text style={styles.colValue}>
                {homeSummary?.npa?.inProcess ?? 0}
              </Text>
              <Text style={styles.colValue}>
                {homeSummary?.npa?.completed ?? 0}
              </Text>

              <View style={styles.colIcon} />
            </TouchableOpacity>

            {/* WELCOME CALL */}
            <TouchableOpacity
              style={styles.assignedRow}
              onPress={() => navigation.navigate("WelcomeCall")}
            >
              <Text style={styles.colLabel}>Welcome Call</Text>
              <Text style={styles.colValue}>
                {homeSummary?.welcome?.pending ?? 0}
              </Text>
              <Text style={styles.colValue}>
                {homeSummary?.welcome?.inProcess ?? 0}
              </Text>
              <Text style={styles.colValue}>
                {homeSummary?.welcome?.completed ?? 0}
              </Text>
              <View style={styles.colIcon} />
            </TouchableOpacity>
          </>
        )}
      </View>
      {/* ================= SMA BUTTON ================= */}
<TouchableOpacity
  style={styles.smaButton}
  onPress={() =>
    navigation.navigate("SMA", {
      userId: user?.UserId,
    })
  }
>
  <Text style={styles.smaButtonText}>CO Use</Text>
</TouchableOpacity>
    </>
  )}
/>
      {/* ================= PROFILE SIDEBAR ================= */}
      {showProfile && (
        <View style={styles.overlay}>
          <Pressable
            style={styles.overlay}
            onPress={() => setShowProfile(false)}
          />

          <View style={styles.sidebar}>
            <Ionicons
              name="person-circle"
              size={90}
              color="#0a3d62"
              style={{ alignSelf: "center" }}
            />

            <Text style={styles.profileName}>{employee.name}</Text>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Employee ID</Text>
              <Text style={styles.profileValue}>{employee.empId}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Designation</Text>
              <Text style={styles.profileValue}>{employee.designation}</Text>
            </View>

            <View style={styles.profileItem}>
              <Text style={styles.profileLabel}>Branch</Text>
              <Text style={styles.profileValue}>
                {employee.branchName} ({employee.branchCode})
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f6f9",
  },

  /* ===== Header ===== */
  header: {
    height: 88,
    backgroundColor: "#0a3d62",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 30,
    elevation: 8,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "700",
    letterSpacing: 1,
  },

  /* ===== Body ===== */
  body: {
    padding: 16,
  },
welcomeText: {
  fontSize: 15,
  color: "#010c17",
  textAlign: "center",
  marginBottom: 6, 
  fontWeight: "600",       // 👈 creates clear gap
},

userName: {
  fontWeight: "900",
  color: "#1a5f91",
  fontSize: 20,
  textAlign: "center",
  lineHeight: 22,
  marginBottom: 20,   // 👈 adds space before the card
},

  /* ===== Cards ===== */
card: {
  backgroundColor: "#ffffff",
  borderRadius: 16,
  padding: 18,
  marginBottom: 18,
  elevation: 4,
  shadowColor: "#000",
  shadowOpacity: 0.05,
  shadowRadius: 6,
},
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0a3d62",
    marginBottom: 12,
  },

  /* ===== Rows ===== */
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.4,
    borderBottomColor: "#e0e0e0",
  },
  boldText: {
    fontWeight: "800",
  },

  /* ===== Overlay ===== */
  overlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    flexDirection: "row",
  },

  /* ===== Sidebar ===== */
  sidebar: {
    width: width * 0.75,
    backgroundColor: "#fff",
    padding: 22,
    elevation: 12,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  profileName: {
    fontSize: 19,
    fontWeight: "800",
    textAlign: "center",
    marginVertical: 12,
    color: "#0a3d62",
  },
  profileItem: {
    marginTop: 18,
  },
  profileLabel: {
    fontSize: 12,
    color: "#888",
  },
  profileValue: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginTop: 2,
  },
  tableHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 8,
},

headerCell: {
  flex: 1,
  textAlign: "center",
  fontSize: 12,
  color: "rgb(86, 78, 78)",
  fontWeight: "700",
},

tableRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 10,
  borderBottomWidth: 0.4,
  borderBottomColor: "#d7d2d2",
},

simpleRow: {
  flexDirection: "row",
  justifyContent: "space-between",
  paddingVertical: 12,
},

assignedHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: 10,
},

rowLabel: {
  flex: 1,
  fontSize: 14,
  color: "#333",
},

rowValue: {
  flex: 1,
  fontSize: 14,
  fontWeight: "700",
  textAlign: "center",
},
rowRight: {
  flexDirection: "row",
  alignItems: "center",
  gap: 6,
},
assignedTableHeader: {
  flexDirection: "row",
  alignItems: "center",
  paddingBottom: 6,
  borderBottomWidth: 0.5,
  borderBottomColor: "#d7d2d2",
},

headerLeft: {
  flex: 1.5,
},
centerTitle: {
  textAlign: "center",
},

/* ===== Assigned Table Columns ===== */

assignedRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 8,
  borderBottomWidth: 0.4,
  borderBottomColor: "#d7d2d2",
  marginVertical:2,
},

colLabel: {
  width: "34%",         
  fontSize: 14,
  color: "#333",
},

colValue: {
  width: "20%",
  textAlign: "center",
  fontSize: 15,
  fontWeight: "500",
  color: "#2c3e50",
}
,
headerText: {
    flexDirection: "row",
  alignItems: "center",
  paddingVertical:2,
  fontSize: 12,
  fontWeight: "700",
  color: "rgb(86, 78, 78)",
  textAlign: "center",
  flexWrap: "nowrap",  
  marginTop:-7,  
  marginVertical:1,
},

colIcon: {
  width: "8%",         
  alignItems: "flex-end",
},

centerTitle: {
  textAlign: "center",
},

boldText: {
  fontWeight: "800",
},
cardHeader: {
  backgroundColor: "#0b3c5d",
  paddingVertical: 10,
  paddingHorizontal: 12,
  borderTopLeftRadius: 16,
  borderTopRightRadius: 16,
  marginHorizontal: -18,   // matches card padding
  marginTop: -18,
  marginBottom: 12,
},

cardHeaderText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "700",
  textAlign: "center",
},
headerDivider: {
  height: 1,
  backgroundColor: "#d7d2d2",
  marginVertical:2,
},
smaButton: {
  backgroundColor: "#0a3d62",
  paddingVertical: 14,
  borderRadius: 12,
  alignItems: "center",
  marginBottom: 20,
  elevation: 3,
},

smaButtonText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "700",
  letterSpacing: 1,
},
});
