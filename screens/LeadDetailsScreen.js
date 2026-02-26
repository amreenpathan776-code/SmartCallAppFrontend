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
import BASE_URL from "./config";
import {
  requestLocationPermission,
  getCurrentLocation,
} from "./LocationService";

export default function LeadDetailsScreen({ route, navigation }) {
  const { lead } = route.params;

  const [leadDetails, setLeadDetails] = useState(null);
  const [location, setLocation] = useState(null);

  const [callStage, setCallStage] = useState("MAIN");
  const [showModal, setShowModal] = useState(false);
  const [openAfterDial, setOpenAfterDial] = useState(false);

  const [spokeChoice, setSpokeChoice] = useState(null);
  const [notInterestedChoice, setNotInterestedChoice] = useState(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [otherReason, setOtherReason] = useState("");

  useEffect(() => {
    fetchLeadDetails();
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" && openAfterDial) {
        setShowModal(true);
        setOpenAfterDial(false);
        setCallStage("MAIN");
      }
    });
    return () => subscription.remove();
  }, [openAfterDial]);

  const fetchLeadDetails = async () => {
    try {
      const res = await fetch(
        `${BASE_URL}/api/getLeadDetails/${lead.SNo}`
      );
      const data = await res.json();
      if (data.success) setLeadDetails(data.lead);
    } catch (err) {
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

  const handleCaptureLocation = async () => {
    const allowed = await requestLocationPermission();
    if (!allowed) return;
    const pos = await getCurrentLocation();
    setLocation(pos.coords);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-GB");
  };

  const resetFlow = () => {
    setCallStage("MAIN");
    setSpokeChoice(null);
    setNotInterestedChoice(null);
    setAccountNumber("");
    setOtherReason("");
  };

  const closeModal = () => {
    setShowModal(false);
    resetFlow();
  };

  if (!leadDetails) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>LEAD MEMBER DETAILS</Text>
        <Ionicons name="home" size={22} color="#fff" />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer}>

        <View style={styles.card}>
          <DetailRow label="Lead Name" value={leadDetails.FullName} />
          <Divider />
          <DetailRow label="DOB" value={formatDate(leadDetails.DOB)} />
          <Divider />
          <DetailRow label="Address" value={leadDetails.Address} />
          <Divider />
          <DetailRow label="Pincode" value={leadDetails.PinCode} />
          <Divider />

          <View style={styles.locationRow}>
            <Text style={styles.label}>Location</Text>
            <TouchableOpacity
              style={styles.captureBtn}
              onPress={handleCaptureLocation}
            >
              <Ionicons name="location" size={14} color="#fff" />
              <Text style={styles.captureText}>Capture</Text>
            </TouchableOpacity>
          </View>

          <Divider />
          <DetailRow label="Mobile No." value={leadDetails.MobileNumber} />
          <Divider />
          <DetailRow label="Product" value={leadDetails.SelectProduct} />
          <Divider />
          <DetailRow label="Lead Type" value={leadDetails.SelectLeadType} />
        </View>

        <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
          <Ionicons name="call" size={18} color="#fff" />
          <Text style={styles.btnText}>CALL NOW</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ================= CALL OUTCOME MODAL ================= */}
      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>

            {callStage !== "MAIN" && (
              <TouchableOpacity
                onPress={() => {
                  setCallStage("MAIN");
                  setSpokeChoice(null);
                  setNotInterestedChoice(null);
                }}
                style={{ marginBottom: 10 }}
              >
                <Ionicons name="arrow-back" size={22} color="#2563eb" />
              </TouchableOpacity>
            )}

            {/* MAIN */}
            {callStage === "MAIN" && (
              <SectionCard
                icon="call-outline"
                title="Call Outcome"
                subtitle="Select call connection status"
                options={[
                  {
                    icon: "checkmark-circle-outline",
                    title: "Spoke to the Lead",
                    sub: "Customer answered the call",
                    action: () => setCallStage("SPOKE"),
                  },
                  {
                    icon: "close-circle-outline",
                    title: "Didn't Speak to the Lead",
                    sub: "Call was not connected",
                    action: () => setCallStage("NOT_SPOKE"),
                  },
                ]}
              />
            )}
                        {/* SPOKE */}
            {callStage === "SPOKE" && spokeChoice === null && (
              <SectionCard
                icon="chatbubble-ellipses-outline"
                title="Customer Response"
                subtitle="Select customer response"
                options={[
                  {
                    icon: "thumbs-up-outline",
                    title: "Is Interested",
                    sub: "Customer showed interest",
                    action: () => setSpokeChoice("INTERESTED"),
                  },
                  {
                    icon: "thumbs-down-outline",
                    title: "Is Not Interested",
                    sub: "Customer declined",
                    action: () => setSpokeChoice("NOT_INTERESTED"),
                  },
                ]}
              />
            )}

            {/* INTERESTED */}
            {callStage === "SPOKE" &&
              spokeChoice === "INTERESTED" && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionHeaderRow}>
                    <Ionicons name="card-outline" size={22} color="#2563eb" />
                    <Text style={styles.sectionTitle}>Enter Account Number</Text>
                  </View>

                  <TextInput
                    style={styles.input}
                    placeholder="Enter Account Number"
                    value={accountNumber}
                    onChangeText={setAccountNumber}
                  />

                  {accountNumber !== "" && (
                    <PrimaryButton
                      title="Proceed"
                      onPress={() => {
                        Alert.alert("Success", "Lead marked Interested");
                        closeModal();
                        navigation.goBack();
                      }}
                    />
                  )}
                </View>
              )}

            {/* NOT INTERESTED */}
            {callStage === "SPOKE" &&
              spokeChoice === "NOT_INTERESTED" &&
              notInterestedChoice === null && (
                <SectionCard
                  icon="close-circle-outline"
                  title="Reason"
                  subtitle="Select reason"
                  options={[
                    {
                      icon: "ellipse-outline",
                      title: "Does Not Require Loan",
                      sub: "",
                      action: () => setNotInterestedChoice("NO_REQUIREMENT"),
                    },
                    {
                      icon: "ellipse-outline",
                      title: "Interested in Another Product",
                      sub: "",
                      action: () => setNotInterestedChoice("OTHER_PRODUCT"),
                    },
                    {
                      icon: "ellipsis-horizontal",
                      title: "Others",
                      sub: "",
                      action: () => setNotInterestedChoice("OTHERS"),
                    },
                  ]}
                />
              )}

            {/* NOT INTERESTED - OTHERS */}
            {callStage === "SPOKE" &&
              spokeChoice === "NOT_INTERESTED" &&
              notInterestedChoice === "OTHERS" && (
                <View style={styles.sectionCard}>
                  <TextInput
                    style={styles.textArea}
                    placeholder="Enter reason"
                    value={otherReason}
                    onChangeText={setOtherReason}
                    multiline
                  />

                  {otherReason !== "" && (
                    <PrimaryButton
                      title="Submit"
                      onPress={() => {
                        Alert.alert("Success", "Saved successfully");
                        closeModal();
                        navigation.goBack();
                      }}
                    />
                  )}
                </View>
              )}

            {/* NOT INTERESTED - DIRECT */}
            {callStage === "SPOKE" &&
              spokeChoice === "NOT_INTERESTED" &&
              notInterestedChoice &&
              notInterestedChoice !== "OTHERS" && (
                <PrimaryButton
                  title="Submit"
                  onPress={() => {
                    Alert.alert("Success", "Saved successfully");
                    closeModal();
                    navigation.goBack();
                  }}
                />
              )}

            {/* NOT SPOKE */}
            {callStage === "NOT_SPOKE" && (
              <SectionCard
                icon="call-outline"
                title="Call Not Connected"
                subtitle="Select failure reason"
                options={[
                  {
                    icon: "time-outline",
                    title: "No Response / Busy",
                    sub: "",
                    action: closeModal,
                  },
                  {
                    icon: "phone-portrait-outline",
                    title: "Not Reachable / Switched Off",
                    sub: "",
                    action: closeModal,
                  },
                  {
                    icon: "close-circle-outline",
                    title: "Number Invalid",
                    sub: "",
                    action: closeModal,
                  },
                ]}
              />
            )}

          </View>
        </View>
      </Modal>

    </View>
  );
}

/* COMPONENTS */

const PrimaryButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.primaryBtn} onPress={onPress}>
    <Text style={styles.primaryBtnText}>{title}</Text>
  </TouchableOpacity>
);

const SectionCard = ({ icon, title, subtitle, options }) => (
  <View style={styles.sectionCard}>
    <View style={styles.sectionHeaderRow}>
      <Ionicons name={icon} size={22} color="#2563eb" />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>

    <Text style={styles.sectionSubText}>{subtitle}</Text>

    {options.map((opt, index) => (
      <TouchableOpacity
        key={index}
        style={styles.optionRowAligned}
        onPress={opt.action}
      >
        <View style={styles.optionLeft}>
          <Ionicons name={opt.icon} size={20} color="#2563eb" />
          <Text style={styles.optionTitle}>{opt.title}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </TouchableOpacity>
    ))}
  </View>
);

const DetailRow = ({ label, value }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value || "-"}</Text>
  </View>
);

const Divider = () => <View style={styles.divider} />;

/* STYLES */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f2f4f8" },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },

  header: {
    height: 70,
    backgroundColor: "#0a3d62",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },

  scrollContainer: { padding: 16 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 5,
    marginBottom: 25,
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 6,
  },

  label: { fontSize: 14, color: "#636f7a", fontWeight: "600" },

  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e2a38",
    maxWidth: "60%",
    textAlign: "right",
  },

  divider: { height: 1, backgroundColor: "#eef2f6", marginVertical: 8 },

  locationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  captureBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e53935",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },

  captureText: {
    color: "#fff",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },

  callBtn: {
    backgroundColor: "#0a3d62",
    padding: 18,
    borderRadius: 14,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    marginLeft: 8,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },

  modalContainer: {},

  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    elevation: 4,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 8,
  },

  sectionSubText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 15,
  },

  optionRowAligned: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eef2f6",
  },

  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  optionTitle: { fontSize: 14, fontWeight: "600" },

  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
    marginBottom: 15,
  },

  textArea: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 12,
    minHeight: 90,
    textAlignVertical: "top",
  },

  primaryBtn: {
    backgroundColor: "#0a3d62",
    padding: 14,
    borderRadius: 10,
    marginTop: 15,
    alignItems: "center",
  },

  primaryBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
});