import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Keyboard,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Calendar } from "react-native-calendars";
import BASE_URL from "./config";

export default function ActivityHistoryScreen({ route, navigation }) {
  const { userId } = route.params;

  const today = new Date().toISOString().split("T")[0];

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchText, setSearchText] = useState("");
  const [showCalendar, setShowCalendar] = useState(false);

  const [tempFromDate, setTempFromDate] = useState(null);
  const [tempToDate, setTempToDate] = useState(null);

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);

  const [count, setCount] = useState(0);
const [mode, setMode] = useState("ON_DATE"); 
// ON_DATE | RANGE | TILL_TODAY
const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
};
  useEffect(() => {
    fetchHistory(today, today, "");
  }, []);

  const fetchHistory = async (fDate, tDate, search) => {
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/activity/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fromDate: fDate,
          toDate: tDate,
          searchText: search,
        }),
      });

      const result = await res.json();
      setData(result.records || []);
      setCount(result.count || 0);
    } catch (err) {
      console.log(err);
    }

    setLoading(false);
  };

  // 🔥 APPLY FILTERS (Correct Till Date Logic)
const applyFilters = () => {
  if (!tempFromDate) return;

  const todayDate = new Date().toISOString().split("T")[0];

  let finalFrom;
  let finalTo;

  if (mode === "ON_DATE") {
    finalFrom = tempFromDate;
    finalTo = tempFromDate;
  }

  if (mode === "RANGE") {
    if (!tempToDate) return;
    finalFrom = tempFromDate;
    finalTo = tempToDate;
  }

  if (mode === "TILL_TODAY") {
    finalFrom = tempFromDate;
    finalTo = todayDate;
  }

  setFromDate(finalFrom);
  setToDate(finalTo);

  setShowCalendar(false);

  fetchHistory(finalFrom, finalTo, searchText);
};

  // 🔥 CLEAR (Fixed Properly)
  const clearFilter = () => {
    const todayDate = new Date().toISOString().split("T")[0];

    setSearchText("");
    setTempFromDate(null);
    setTempToDate(null);

    setFromDate(todayDate);
    setToDate(todayDate);

    fetchHistory(todayDate, todayDate, "");
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate("ActivityHistoryDetails", {
          userId,
          loanAccountNumber: item.LoanAccountNumber,
          customerName: item.CustomerName,
        })
      }
    >
      <View style={styles.card}>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{item.CustomerName}</Text>
          <View
            style={[
              styles.statusBadge,
              item.AccountStatus === "COMPLETED"
                ? styles.statusCompleted
                : item.AccountStatus === "IN PROCESS"
                ? styles.statusInProcess
                : styles.statusPending,
            ]}
          >
            <Text style={styles.statusText}>{item.AccountStatus}</Text>
          </View>
        </View>

        <Text style={styles.sub}>Loan: {item.LoanAccountNumber}</Text>
        <Text style={styles.sub}>DPD: {item.dpdQueue}</Text>
        <Text style={styles.action}>
          {item.SessionType} → {item.ActionLabel}
        </Text>
        <Text style={styles.time}>{item.FormattedTime}</Text>
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
            {/* HEADER */}
<View style={styles.header}>
  <TouchableOpacity onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} color="#fff" />
  </TouchableOpacity>

  <View style={styles.headerCenter}>
    <Text style={styles.headerTitle}>Activity History</Text>
    <Text style={styles.headerSub}>
      {fromDate === toDate
        ? formatDisplayDate(fromDate)
        : `${formatDisplayDate(fromDate)} → ${formatDisplayDate(toDate)}`}
    </Text>
  </View>

  <TouchableOpacity
    onPress={() => {
      Keyboard.dismiss();
      setMode("ON_DATE");
      setShowCalendar(true);
    }}
  >
    <Ionicons name="calendar-outline" size={22} color="#fff" />
  </TouchableOpacity>
</View>

      {/* SEARCH BAR */}
      <View style={styles.searchBox}>
        <TextInput
          style={{ flex: 1 }}
          placeholder="Search Account / Name / DPD"
          value={searchText}
          onChangeText={setSearchText}
        />

        <TouchableOpacity
  onPress={() => {
  Keyboard.dismiss();

  if (!searchText.trim()) return;

  // 🔥 Search across ALL dates
  fetchHistory(null, null, searchText);
}} 
          
        >
          <Ionicons name="search" size={22} color="#0a3d62" />
        </TouchableOpacity>
      </View>

      {/* COUNT + BUTTONS */}
      <View style={styles.countBar}>
        <Text style={styles.countText}>{count} Activities</Text>

        <View style={{ flexDirection: "row", gap: 15 }}>
          <TouchableOpacity onPress={clearFilter}>
            <Text style={{ color: "#ef4444" }}>Clear</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              clearFilter();
            }}
          >
            <Text style={{ color: "#2563eb" }}>Today</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={
  <Text style={styles.notFoundText}>
    Not Found
  </Text>
}
      />

      {/* CALENDAR MODAL */}
      {showCalendar && (
        <View style={styles.calendarModal}>
          <View style={styles.calendarBox}>

            <Text style={styles.calendarTitle}>Select Date Range</Text>
<View style={styles.modeContainer}>

  <TouchableOpacity
    style={[
      styles.modeButton,
      mode === "ON_DATE" && styles.modeActive,
    ]}
    onPress={() => setMode("ON_DATE")}
  >
    <Text
      style={[
        styles.modeText,
        mode === "ON_DATE" && styles.modeTextActive,
      ]}
    >
      On Date
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.modeButton,
      mode === "RANGE" && styles.modeActive,
    ]}
    onPress={() => setMode("RANGE")}
  >
    <Text
      style={[
        styles.modeText,
        mode === "RANGE" && styles.modeTextActive,
      ]}
    >
      From → To
    </Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={[
      styles.modeButton,
      mode === "TILL_TODAY" && styles.modeActive,
    ]}
    onPress={() => setMode("TILL_TODAY")}
  >
    <Text
      style={[
        styles.modeText,
        mode === "TILL_TODAY" && styles.modeTextActive,
      ]}
    >
      Till Today
    </Text>
  </TouchableOpacity>

</View>
            <Calendar
              markingType={"period"}
              onDayPress={(day) => {
                if (!tempFromDate) {
                  setTempFromDate(day.dateString);
                  setTempToDate(null);
                } else if (!tempToDate) {
                  setTempToDate(day.dateString);
                } else {
                  setTempFromDate(day.dateString);
                  setTempToDate(null);
                }
              }}
markedDates={
  mode === "ON_DATE"
    ? tempFromDate && {
        [tempFromDate]: {
          startingDay: true,
          endingDay: true,
          color: "#2f54eb",
          textColor: "#fff",
        },
      }

: mode === "TILL_TODAY" && tempFromDate
? (() => {
    const earlier =
      tempFromDate < today ? tempFromDate : today;
    const later =
      tempFromDate < today ? today : tempFromDate;

    return {
      [earlier]: {
        startingDay: true,
        color: "#2f54eb",
        textColor: "#fff",
      },
      [later]: {
        endingDay: true,
        color: "#2f54eb",
        textColor: "#fff",
      },
    };
  })()

    : {
        ...(tempFromDate && {
          [tempFromDate]: {
            startingDay: true,
            color: "#2f54eb",
            textColor: "#fff",
          },
        }),
        ...(tempToDate && {
          [tempToDate]: {
            endingDay: true,
            color: "#2f54eb",
            textColor: "#fff",
          },
        }),
      }
}
            />
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={applyFilters}
            >
              <Text style={styles.confirmText}>Apply</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 10, alignItems: "center" }}
              onPress={() => setShowCalendar(false)}
            >
              <Text style={{ color: "#ef4444" }}>Cancel</Text>
            </TouchableOpacity>

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

  /* HEADER */
  header: {
    height: 80,
    backgroundColor: "#0a3d62",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: 25,
  },

  headerTitle: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },

  headerSub: {
    color: "#cbd5e1",
    fontSize: 12,
    marginTop: 2,
  },

  /* SEARCH */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    height: 48,
    elevation: 2,
  },

  /* COUNT BAR */
  countBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
  },

  countText: {
    fontWeight: "600",
    color: "#0a3d62",
  },

  /* CARD */
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

  name: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0a3d62",
  },

  sub: {
    fontSize: 12,
    color: "#555",
    marginTop: 4,
  },

  action: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    color: "#333",
  },

  time: {
    fontSize: 12,
    color: "#777",
    marginTop: 6,
  },

  /* STATUS BADGE */
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

  statusCompleted: {
    backgroundColor: "#27ae60",
  },

  statusInProcess: {
    backgroundColor: "#f39c12",
  },

  statusPending: {
    backgroundColor: "#676463",
  },

  /* LOADER */
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* CALENDAR MODAL */
  calendarModal: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  calendarBox: {
    backgroundColor: "#fff",
    width: "90%",
    borderRadius: 12,
    padding: 15,
  },

  calendarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0a3d62",
    marginBottom: 10,
  },

  confirmBtn: {
    marginTop: 20,
    backgroundColor: "#2f54eb",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  confirmText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  modeContainer: {
  flexDirection: "row",
  justifyContent: "space-between",
  marginBottom: 15,
},

modeButton: {
  flex: 1,
  paddingVertical: 8,
  borderRadius: 8,
  borderWidth: 1,
  borderColor: "#cbd5e1",
  marginHorizontal: 3,
  alignItems: "center",
},

modeActive: {
  backgroundColor: "#0a3d62",
  borderColor: "#0a3d62",
},

modeText: {
  fontSize: 12,
  fontWeight: "600",
  color: "#0a3d62",
},

modeTextActive: {
  color: "#fff",
},
headerCenter: {
  position: "absolute",
  left: 0,
  right: 0,
  top: 25,
  bottom: 0,
  justifyContent: "center",
  alignItems: "center",
},
notFoundText: {
  textAlign: "center",
  marginTop: 40,
  fontSize: 16,
  fontWeight: "600",
  color: "#64748b",
},
});