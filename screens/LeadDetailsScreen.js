import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  Modal,
  AppState,
  TextInput,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Calendar } from "react-native-calendars";
import BASE_URL from "./config";

export default function LeadDetailsScreen({ route, navigation }) {
  const { lead } = route.params;

  const [leadDetails, setLeadDetails] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [openAfterDial, setOpenAfterDial] = useState(false);

  const [callStage, setCallStage] = useState("MAIN");

  const [spokeChoice, setSpokeChoice] = useState(null);
  const [notInterestedChoice, setNotInterestedChoice] = useState(null);
  const [productChoice, setProductChoice] = useState(null);
  const [didNotSpeakChoice, setDidNotSpeakChoice] = useState(null);

  const [accountNumber, setAccountNumber] = useState("");
  const [otherReason, setOtherReason] = useState("");

  const [calendarMode, setCalendarMode] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [losSubmitted, setLosSubmitted] = useState(false);

  const [hour, setHour] = useState("10");
const [minute, setMinute] = useState("00");
const [ampm, setAmpm] = useState("AM");
const [productOtherSubmitted, setProductOtherSubmitted] = useState(false);
const [notInterestedOtherSubmitted, setNotInterestedOtherSubmitted] = useState(false);
  useEffect(() => {
    fetchLeadDetails();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && openAfterDial) {
        setShowModal(true);
        setOpenAfterDial(false);
        resetFlow();
      }
    });
    return () => subscription.remove();
  }, [openAfterDial]);

  const resetFlow = () => {
    setCallStage("MAIN");
    setSpokeChoice(null);
    setNotInterestedChoice(null);
    setProductChoice(null);
    setDidNotSpeakChoice(null);
    setAccountNumber("");
    setLosSubmitted(false);
    setOtherReason("");
    setCalendarMode(null);
    setSelectedDate(null);
    setNotInterestedOtherSubmitted(false);
  };

  const fetchLeadDetails = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/getLeadDetails/${lead.SNo}`);
      const data = await res.json();
      if (data.success) setLeadDetails(data.lead);
    } catch {
      Alert.alert("Error fetching lead details");
    }
  };

  const handleCall = () => {
    if (!leadDetails?.MobileNumber) {
      Alert.alert("No Number Available");
      return;
    }
    setOpenAfterDial(true);
    Linking.openURL(`tel:${leadDetails.MobileNumber}`);
  };

  const closeAndExit = () => {
    setShowModal(false);
    resetFlow();
    navigation.goBack();
  };

  if (!leadDetails) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }
const handleModalBack = () => {

  // If calendar open → close only calendar
  if (calendarMode) {
    setCalendarMode(null);
    return;
  }

  // If in product selection
  if (productChoice) {
    setProductChoice(null);
    return;
  }

  // If in not interested reason
  if (notInterestedChoice) {
    setNotInterestedChoice(null);
    return;
  }

  // If in spoke selection
  if (spokeChoice) {
    setSpokeChoice(null);
    return;
  }

  // If in did not speak
  if (didNotSpeakChoice) {
    setDidNotSpeakChoice(null);
    return;
  }

  // If not main → go to main
  if (callStage !== "MAIN") {
    setCallStage("MAIN");
    return;
  }

  // Finally close modal
  setShowModal(false);
};
    return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back-outline" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LEAD MEMBER DETAILS</Text>
        <Ionicons name="home-outline" size={22} color="#fff" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.card}>
          <DetailRow label="Lead Name" value={leadDetails.FullName} />
          <Divider />
          <DetailRow
            label="DOB"
            value={
              leadDetails.DOB
                ? new Date(leadDetails.DOB).toLocaleDateString("en-GB")
                : "-"
            }
          />
          <Divider />
          <DetailRow label="Address" value={leadDetails.Address} />
          <Divider />
          <DetailRow label="Pincode" value={leadDetails.PinCode} />
          <Divider />
          <DetailRow label="Mobile No." value={leadDetails.MobileNumber} />
          <Divider />
          <DetailRow label="Product" value={leadDetails.SelectProduct} />
          <Divider />
          <DetailRow label="Lead Type" value={leadDetails.SelectLeadType} />
        </View>

        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Ionicons name="call-outline" size={18} color="#fff" />
          <Text style={styles.btnText}>CALL NOW</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* MODAL */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>

            {/* HEADER */}
            <View style={styles.modalHeaderRow}>
<TouchableOpacity onPress={handleModalBack}>
  <Ionicons name="arrow-back-outline" size={22} color="#1e4fa1" />
</TouchableOpacity>
              <Text style={styles.modalTitle}>Call Flow</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close-outline" size={22} />
              </TouchableOpacity>
            </View>

            {/* MAIN */}
            {callStage === "MAIN" && (
              <SectionCard
                icon="call-outline"
                title="Call Outcome"
                subtitle="Select call connection status"
                options={[
                  {
                    icon: "chatbubble-outline",
                    title: "Spoke to the Lead",
                    action: () => setCallStage("SPOKE"),
                  },
                  {
                    icon: "close-circle-outline",
                    title: "Didn't Speak to the Lead",
                    action: () => setCallStage("NOT_SPOKE"),
                  },
                ]}
              />
            )}

            {/* SPOKE */}
            {callStage === "SPOKE" && !spokeChoice && (
              <SectionCard
                icon="chatbubble-outline"
                title="Customer Response"
                subtitle="Select response"
                options={[
                  {
                    icon: "happy-outline",
                    title: "Is Interested",
                    action: () => setSpokeChoice("INTERESTED"),
                  },
                  {
                    icon: "close-circle-outline",
                    title: "Is Not Interested",
                    action: () => setSpokeChoice("NOT_INTERESTED"),
                  },
                ]}
              />
            )}

            {/* INTERESTED */}
{spokeChoice === "INTERESTED" && !calendarMode && (
  <>
    {!losSubmitted ? (
      <InputCard
        icon="document-text-outline"
        title="Enter LOS Number"
        value={accountNumber}
onChange={(text) => {
  const numericValue = text.replace(/[^0-9]/g, "");
  if (numericValue.length <= 10) {
    setAccountNumber(numericValue);
  }
}}        placeholder="Enter LOS Number"
        buttonTitle="Proceed"
        onSubmit={() => {
 if (accountNumber.length < 1 || accountNumber.length > 10) {
  Alert.alert("LOS number must be 1 to 10 digits");
  return;
}
          setLosSubmitted(true);
        }}
      />
    ) : (
      <ThreeActionButtons
        onSubmit={closeAndExit}
        onScheduleCall={() => setCalendarMode("CALL")}
        onScheduleVisit={() => setCalendarMode("VISIT")}
      />
    )}
  </>
)}

            {/* NOT INTERESTED */}
            {spokeChoice === "NOT_INTERESTED" && !notInterestedChoice && (
              <SectionCard
                icon="close-circle-outline"
                title="Reason"
                subtitle="Select reason"
                options={[
                  {
                    icon: "remove-circle-outline",
                    title: "Does Not Require Loan",
                    action: () => setNotInterestedChoice("NO_REQUIREMENT"),
                  },
                  {
                    icon: "swap-horizontal-outline",
                    title: "Interested in Another Product",
                    action: () => setNotInterestedChoice("OTHER_PRODUCT"),
                  },
                  {
                    icon: "ellipsis-horizontal-outline",
                    title: "Others",
                    action: () => setNotInterestedChoice("OTHERS"),
                  },
                ]}
              />
            )}

            {/* NO REQUIREMENT */}
{notInterestedChoice === "OTHERS" && !calendarMode && (
  <>
    {!notInterestedOtherSubmitted ? (
      <InputCard
        icon="create-outline"
        title="Specify Reason"
        value={otherReason}
        onChange={setOtherReason}
        placeholder="Enter reason..."
        buttonTitle="Proceed"
        onSubmit={() => {
          if (otherReason.trim().length < 3) {
            Alert.alert("Please enter proper reason");
            return;
          }
          setNotInterestedOtherSubmitted(true);
        }}
      />
    ) : (
      <ThreeActionButtons
        onSubmit={closeAndExit}
        onScheduleCall={() => setCalendarMode("CALL")}
        onScheduleVisit={() => setCalendarMode("VISIT")}
      />
    )}
  </>
)}

            {/* OTHER PRODUCT */}
            {notInterestedChoice === "OTHER_PRODUCT" && !productChoice && (
              <SectionCard
                icon="cube-outline"
                title="Select Product"
                subtitle="Choose product type"
                options={[
                  {
                    icon: "wallet-outline",
                    title: "Deposits",
                    action: () => setProductChoice("DEPOSITS"),
                  },
                  {
                    icon: "cash-outline",
                    title: "Loans",
                    action: () => setProductChoice("LOANS"),
                  },
                  {
                    icon: "ellipsis-horizontal-outline",
                    title: "Others",
                    action: () => setProductChoice("OTHERS"),
                  },
                ]}
              />
            )}

      {(productChoice === "DEPOSITS" ||
  productChoice === "LOANS") && !calendarMode && (
  <ThreeActionButtons
                onSubmit={closeAndExit}
                onScheduleCall={() => setCalendarMode("CALL")}
                onScheduleVisit={() => setCalendarMode("VISIT")}
              />
            )}

{productChoice === "OTHERS" &&
 !calendarMode &&
 notInterestedChoice === "OTHER_PRODUCT" && (
  <>
    {!productOtherSubmitted ? (
      <InputCard
        icon="create-outline"
        title="Specify Product"
        value={otherReason}
        onChange={setOtherReason}
        placeholder="Enter product..."
        buttonTitle="Proceed"
        onSubmit={() => {
          if (otherReason.trim().length < 2) {
            Alert.alert("Please enter product name");
            return;
          }
          setProductOtherSubmitted(true);
        }}
      />
    ) : (
      <ThreeActionButtons
        onSubmit={closeAndExit}
        onScheduleCall={() => setCalendarMode("CALL")}
        onScheduleVisit={() => setCalendarMode("VISIT")}
      />
    )}
  </>
)}

            {/* NOT SPOKE */}
            {callStage === "NOT_SPOKE" && !didNotSpeakChoice && (
              <SectionCard
                icon="close-circle-outline"
                title="Call Not Connected"
                subtitle="Select reason"
                options={[
                  {
                    icon: "time-outline",
                    title: "No Response / Busy",
                    action: () => setDidNotSpeakChoice("BUSY"),
                  },
                  {
                    icon: "call-outline",
                    title: "Not Reachable / Switched Off",
                    action: () => setDidNotSpeakChoice("NOT_REACHABLE"),
                  },
                  {
                    icon: "alert-circle-outline",
                    title: "Invalid Number",
                    action: () => setDidNotSpeakChoice("INVALID"),
                  },
                  {
                    icon: "ellipsis-horizontal-outline",
                    title: "Others",
                    action: () => setDidNotSpeakChoice("OTHERS"),
                  },
                ]}
              />
            )}

          {["BUSY", "NOT_REACHABLE", "INVALID"].includes(
  didNotSpeakChoice
) && !calendarMode && (
  <ThreeActionButtons
                onSubmit={closeAndExit}
                onScheduleCall={() => setCalendarMode("CALL")}
                onScheduleVisit={() => setCalendarMode("VISIT")}
              />
            )}

     {didNotSpeakChoice === "OTHERS" && !calendarMode && (
  <>
    <InputCard
      icon="create-outline"
      title="Specify Reason"
      value={otherReason}
      onChange={setOtherReason}
      placeholder="Enter reason..."
      buttonTitle="Proceed"
      onSubmit={() => {
        if (otherReason.trim().length < 3) {
          Alert.alert("Please enter proper reason");
          return;
        }
        setDidNotSpeakChoice("OTHERS_FILLED");
      }}
    />
  </>
)}

{didNotSpeakChoice === "OTHERS_FILLED" && !calendarMode && (
  <ThreeActionButtons
    onSubmit={closeAndExit}
    onScheduleCall={() => setCalendarMode("CALL")}
    onScheduleVisit={() => setCalendarMode("VISIT")}
  />
)}
          {/* CALENDAR */}
{/* ================= CALENDAR SCREEN ================= */}
{calendarMode && (
  <View style={styles.sectionCard}>

      <View style={styles.sectionHeaderRow}>
        <Ionicons name="calendar-outline" size={22} color="#2563eb" />
        <Text style={styles.sectionTitle}>
          {calendarMode === "CALL" ? "Schedule Call" : "Schedule Visit"}
        </Text>
      </View>

      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: "#2563eb",
          },
        }}
      />

      {selectedDate && (
        <>
          <View style={styles.timeRow}>
            <TextInput
              style={styles.timeInput}
              value={hour}
              onChangeText={setHour}
              keyboardType="number-pad"
              maxLength={2}
            />

            <Text style={{ fontSize: 18 }}>:</Text>

            <TextInput
              style={styles.timeInput}
              value={minute}
              onChangeText={setMinute}
              keyboardType="number-pad"
              maxLength={2}
            />

            <TouchableOpacity
              style={styles.ampmBtn}
              onPress={() => setAmpm(ampm === "AM" ? "PM" : "AM")}
            >
              <Text style={{ fontWeight: "700" }}>{ampm}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={closeAndExit}
          >
            <Text style={styles.primaryBtnText}>Confirm</Text>
          </TouchableOpacity>
        </>
      )}
  </View>
)}
          </View>
        </View>
      </Modal>
    </View>
  );
}
const ThreeActionButtons = ({ onSubmit, onScheduleCall, onScheduleVisit }) => (
  <View style={{ marginTop: 10 }}>
    <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit}>
      <Text style={styles.primaryBtnText}>Submit</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.secondaryBtn}
      onPress={onScheduleCall}
    >
      <Text style={styles.secondaryBtnText}>Schedule Call</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.secondaryBtn}
      onPress={onScheduleVisit}
    >
      <Text style={styles.secondaryBtnText}>Schedule Visit</Text>
    </TouchableOpacity>
  </View>
);

const DetailRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || "-"}</Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

const SectionCard = ({ icon, title, subtitle, options }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeaderRow}>
      <Ionicons name={icon} size={22} color="#1e4fa1" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
    <Text style={styles.sectionSubText}>{subtitle}</Text>
    {options.map((opt, i) => (
      <TouchableOpacity key={i} style={styles.optionButton} onPress={opt.action}>
        <View style={styles.optionLeft}>
          <Ionicons name={opt.icon} size={20} color="#1e4fa1" />
          <Text style={styles.optionTitle}>{opt.title}</Text>
        </View>
        <Ionicons name="chevron-forward-outline" size={18} color="#94a3b8" />
      </TouchableOpacity>
    ))}
  </View>
);

const InputCard = ({
  icon,
  title,
  value,
  onChange,
  placeholder,
  buttonTitle,
  onSubmit,
}) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeaderRow}>
      <Ionicons name={icon} size={22} color="#1e4fa1" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>

    <TextInput
      style={styles.premiumInput}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#9ca3af"
    />

    {value !== "" && (
      <TouchableOpacity style={styles.primaryBtn} onPress={onSubmit}>
        <Text style={styles.primaryBtnText}>{buttonTitle}</Text>
      </TouchableOpacity>
    )}
  </View>
);

/* KEEP YOUR EXISTING STYLES BELOW */
/* ---------- STYLES ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f2f4f8",
  },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  /* HEADER */

  header: {
    height: 70,
    backgroundColor: "#0a3d62",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  headerTitle: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },

  scrollContainer: {
    padding: 16,
  },

  /* DETAILS CARD */

  card: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 20,
    elevation: 6,
    marginBottom: 25,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },

  label: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
    maxWidth: "60%",
    textAlign: "right",
  },

  divider: {
    height: 1,
    backgroundColor: "#eef2f6",
    marginVertical: 6,
  },

  /* CALL BUTTON */

  callBtn: {
    backgroundColor: "#0a3d62",
    padding: 18,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
  },

  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },

  /* MODAL */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.4)",
    justifyContent: "center",
    padding: 20,
  },

  modalContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    elevation: 10,
  },

  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },

  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e4fa1",
  },

  /* SECTION CARD */

  sectionCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  sectionSubText: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 15,
  },

  /* OPTION BUTTON */

  optionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    elevation: 2,
  },

  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  optionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },

  /* INPUT */

  premiumInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 14,
    padding: 14,
    backgroundColor: "#ffffff",
  },

  primaryBtn: {
    backgroundColor: "#0a3d62",
    padding: 14,
    borderRadius: 12,
    marginTop: 15,
    alignItems: "center",
  },

  primaryBtnText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  secondaryBtn: {
  backgroundColor: "#ffffff",
  padding: 14,
  borderRadius: 12,
  marginTop: 10,
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#0a3d62",
},

secondaryBtnText: {
  color: "#0a3d62",
  fontWeight: "700",
},
timeRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginTop: 15,
  gap: 10,
},

timeInput: {
  borderWidth: 1,
  borderColor: "#d1d5db",
  borderRadius: 10,
  width: 60,
  padding: 10,
  textAlign: "center",
  fontWeight: "600",
  backgroundColor: "#fff",
},

ampmBtn: {
  borderWidth: 1,
  borderColor: "#2563eb",
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  backgroundColor: "#e0f2fe",
},
});