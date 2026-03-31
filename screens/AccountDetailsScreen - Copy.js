import React, { useState, useEffect, useCallback } from "react";

import BASE_URL from "./config";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  TextInput,
  Modal,
  BackHandler, 
  AppState,
  Platform,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Calendar } from "react-native-calendars";
import {
  requestLocationPermission,
  getCurrentLocation,
  getCoordsFromAddressGoogle,
  getAddressFromCoordsGoogle   // ⭐ ADD THIS
} from "./LocationService";
const ThreeActionButtons = ({
  onSubmit,
  onScheduleCall,
  onScheduleVisit,
  logCallAction,
  reasonCode = null,
  actionSource = "CALL",

  // ⭐ NEW PROP
  exitToDPDList,
}) => {

  const safeLog = async (payload) => {
    try {
      if (typeof logCallAction === "function") {
        await logCallAction(payload);
      }
    } catch (e) {
      console.log("ThreeActionButtons log error:", e?.message || e);
    }
  };

  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>Next Action</Text>
      <Text style={styles.sectionSubText}>Choose how you want to proceed</Text>

      {/* ✅ SUBMIT */}
      <TouchableOpacity
        style={styles.optionRowAligned}
        onPress={async () => {
          // ✅ LOG -> COMPLETED
          await safeLog({
            actionCode: actionSource === "VISIT" ? "VISIT_COMPLETED" : "CALL_COMPLETED",
            actionLabel: actionSource === "VISIT" ? "Visit Completed" : "Call Flow Completed",
            reasonCode: reasonCode,
          });

          // run old submit
// run old submit if needed (optional business logic)
if (typeof onSubmit === "function") {
  await onSubmit();
}

// ⭐ CLOSE FLOW & GO BACK TO DPD LIST
if (typeof exitToDPDList === "function") {
  await exitToDPDList();
}

        }}
      >
        <View style={styles.optionLeft}>
          <Ionicons name="checkmark-circle-outline" size={20} color="#2563eb" />
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Submit</Text>
            <Text style={styles.optionSubText}>Record customer commitment</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </TouchableOpacity>

      {/* ✅ SCHEDULE CALL */}
      <TouchableOpacity
        style={styles.optionRowAligned}
        onPress={async () => {
          // ✅ LOG -> INPROCESS
          await safeLog({
            actionCode: "SCHEDULE_CALL",
            actionLabel: "Schedule a Call",
            reasonCode: reasonCode,
          });

          if (typeof onScheduleCall === "function") {
            onScheduleCall();
          }
        }}
      >
        <View style={styles.optionLeft}>
          <Ionicons name="call-outline" size={20} color="#2563eb" />
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Schedule a Call</Text>
            <Text style={styles.optionSubText}>Plan a follow-up call with customer</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </TouchableOpacity>

      {/* ✅ SCHEDULE VISIT */}
      <TouchableOpacity
        style={styles.optionRowAligned}
        onPress={async () => {
          // ✅ LOG -> INPROCESS
          await safeLog({
            actionCode: "SCHEDULE_VISIT",
            actionLabel: "Schedule a Visit",
            reasonCode: reasonCode,
          });

          if (typeof onScheduleVisit === "function") {
            onScheduleVisit();
          }
        }}
      >
        <View style={styles.optionLeft}>
          <Ionicons name="calendar-outline" size={20} color="#2563eb" />
          <View style={styles.optionTextWrap}>
            <Text style={styles.optionTitle}>Schedule a Visit</Text>
            <Text style={styles.optionSubText}>Plan a future field visit</Text>
          </View>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </TouchableOpacity>
    </View>
  );
};

const ACTIVE_VISIT_KEY = "ACTIVE_VISIT_SESSION";
const VISIT_START_TIME_KEY = "VISIT_START_TIME";
const ACTIVE_VISIT_SNO_KEY = "ACTIVE_VISIT_SNO";
const ACTIVE_VISIT_USER_KEY = "ACTIVE_VISIT_USER";


const ReasonSubmitBlock = ({
  reason,
  setReason,
  onSubmit,
}) => (
  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons
        name="document-text-outline"
        size={22}
        color="#2563eb"
      />
      <Text style={styles.sectionTitle}>Specify Reason</Text>
    </View>

    <Text style={styles.sectionSubText}>
      Please provide additional details shared by the customer
    </Text>

    {/* Text Area */}
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>Reason</Text>

      <TextInput
        style={styles.textAreaEnhanced}
        placeholder="Type the reason here…"
        value={reason}
        onChangeText={setReason}
        multiline
        textAlignVertical="top"
        blurOnSubmit={false}
      />
    </View>

    {/* Helper */}
    <Text style={styles.helperText}>
      This information will be saved for future reference
    </Text>

    {/* Action */}
    <TouchableOpacity
      style={[
        styles.primaryActionBtn,
        !reason && { opacity: 0.5 },
      ]}
      disabled={!reason}
      onPress={onSubmit}
    >
      <Text style={styles.primaryActionText}>
        Save & Continue
      </Text>
    </TouchableOpacity>

  </View>
);


export default function AccountDetailsScreen({ route, navigation }) {
const [showThreeActionAfterCloseNo, setShowThreeActionAfterCloseNo] = useState(false);
const [showReasonNextActions, setShowReasonNextActions] = useState(false);
const [flowStack, setFlowStack] = useState([]);
const [showCallFlowModal, setShowCallFlowModal] = useState(false);
// 🔥 ACTIVITY SESSION
const [callSessionId, setCallSessionId] = useState(null);
const [openCallModalAfterDial, setOpenCallModalAfterDial] = useState(false);
useEffect(() => {
  const autoDialFromTodaySchedule = async () => {
    try {
      if (openFlow !== "CALL_AFTER_DIAL") return;
      if (!dialNumber) return;

      const phone = String(dialNumber).trim();
      if (!phone) return;

      console.log("📞 Opening dial pad for:", phone);

      // ✅ Start call session first
      const sessionId = await startCallSession();
      if (!sessionId) return;

      // ✅ Log dialed
      await logCallAction({
        actionCode: "CALL_DIALED",
        actionLabel: "Call Dialed",
        metadata: { phoneNumber: phone },
      });

      // ✅ IMPORTANT: Set this BEFORE opening dial pad
      setOpenCallModalAfterDial(true);

      // ✅ Open dialer
      Linking.openURL(`tel:${phone}`);
    } catch (e) {
      console.log("❌ Auto dial error:", e);
    }
  };

  autoDialFromTodaySchedule();
}, [openFlow, dialNumber]);

useEffect(() => {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active" && openCallModalAfterDial) {
      console.log("✅ Returned from dialer → opening CALL FLOW MODAL");

      setCallStage("AFTER_CALL");

      // ✅ OPEN THE CALL FLOW MODAL
      setShowCallFlowModal(true);

      // ✅ stop repeating
      setOpenCallModalAfterDial(false);

      // ✅ clear params so it doesn't trigger again
      navigation.setParams({ openFlow: null, dialNumber: null });
    }
  });

  return () => subscription.remove();
}, [openCallModalAfterDial]);


// ===============================
// ACTIVITY LOGGING HELPERS
// ===============================

const getLoggedUser = async () => {
  try {
    const u = await AsyncStorage.getItem("LOGGED_USER");
    return u ? JSON.parse(u) : null;
  } catch (e) {
    return null;
  }
};

const startCallSession = async () => {
  try {
    const user = await getLoggedUser();
    if (!user?.UserId || !user?.UserName) {
      Alert.alert("Error", "Login expired. Please login again.");
      return null;
    }

    const res = await fetch(`${BASE_URL}/api/activity/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
body: JSON.stringify({
  loanAccountNumber,
  sessionType: "CALL",
  userId: user.UserId,
  userName: user.UserName,

  sourceType: "NPA",
  sourceId: loanAccountNumber,
}),
    });

    const data = await res.json();
    setCallSessionId(data.sessionId);
    return data.sessionId;
  } catch (err) {
    console.error("Start call session failed", err);
    return null;
  }
};
const logCallAction = async ({
  actionCode,
  actionLabel,
  reasonCode = null,
  metadata = null,
  noteText = null,
}) => {
  if (!callSessionId) {
  console.log("Call session missing");
}

  try {
    const user = await getLoggedUser();
    if (!user?.UserId || !user?.UserName) return;

    await fetch(`${BASE_URL}/api/activity/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
  sessionId: callSessionId,
  actionCode,
  actionLabel,
  reasonCode,
  metadata,
  noteText,
  userId: user.UserId,
  userName: user.UserName,

  sourceType: "NPA",
  sourceId: loanAccountNumber,
}),
    });
  } catch (err) {
    console.error("Log action failed", err);
  }
};


const endCallSession = async () => {
  if (!callSessionId) return;

  try {
    await fetch(`${BASE_URL}/api/activity/session/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: callSessionId }),
    });
  } catch (err) {
    console.error("End call session failed", err);
  } finally {
    setCallSessionId(null);
  }
};
// ===============================
// STEP 4: SAFETY AUTO-END SESSION
// ===============================
useEffect(() => {
  return () => {
    if (callSessionId) {
      // 🔐 auto close if user leaves screen unexpectedly
      endCallSession();
    }
  };
}, [callSessionId]);

useEffect(() => {
  const onBackPress = () => {
    if (showCallFlowModal) {
      handleModalBack();
      return true; // ⛔ stop app from closing
    }
    return false;
  };

  const subscription = BackHandler.addEventListener(
    "hardwareBackPress",
    onBackPress
  );

  return () => subscription.remove();
}, [showCallFlowModal, flowStack]);
const logDialedNumber = async (number) => {
  await logCallAction({
    actionCode: "CALL_DIALED",
    actionLabel: "Call Dialed",
    metadata: {
      phoneNumber: number,
    },
  });
};
useEffect(() => {
  const onBackPress = () => {
    if (showVisitModal && visitExitStage === "FINAL_EXIT") {
      return true; // block back button
    }
    return false;
  };

  const subscription = BackHandler.addEventListener(
    "hardwareBackPress",
    onBackPress
  );

  return () => subscription.remove();
}, [showVisitModal, visitExitStage]);

// 🔥 VISIT ACTIVITY SESSION
const [visitSessionId, setVisitSessionId] = useState(null);
const startVisitSession = async () => {
  try {
    const user = await getLoggedUser();

    if (!user?.UserId || !user?.UserName) {
      Alert.alert("Error", "Login expired. Please login again.");
      return null;
    }

    const res = await fetch(`${BASE_URL}/api/activity/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        assignmentId: null,
        loanAccountNumber,
        sessionType: "VISIT",
        userId: user.UserId,
        userName: user.UserName,
        sourceType: "NPA",
        sourceId: loanAccountNumber,
      }),
    });

    const data = await res.json();

    const sessionId = (data.sessionId || data.SessionId)?.toString();

    if (!sessionId) {
      console.log("Visit session missing from API response", data);
      return null;
    }

    setVisitSessionId(sessionId);

    // ⭐ SAVE SESSION GLOBALLY
    await AsyncStorage.setItem(ACTIVE_VISIT_KEY, sessionId);
    await AsyncStorage.setItem(
      ACTIVE_VISIT_USER_KEY,
      user.UserId.toString()
    );

    return sessionId;

  } catch (err) {
    console.error("Start visit session failed", err);
    return null;
  }
};
const logVisitAction = async ({
  actionCode,
  actionLabel,
  reasonCode = null,
  metadata = null,
  noteText = null,
  sessionIdOverride = null
}) => {

  let sessionIdToUse = sessionIdOverride || visitSessionId;

  // ⭐ RECOVER SESSION IF STATE LOST
  if (!sessionIdToUse) {
    sessionIdToUse = await AsyncStorage.getItem(ACTIVE_VISIT_KEY);
  }
if (!sessionIdToUse) {
  console.log("⚠ Session missing — backend will recover");
}

  try {
    const user = await getLoggedUser();
    if (!user?.UserId || !user?.UserName) return;

    console.log("🚀 VISIT LOG SENDING:", {
      actionCode,
      sessionId: sessionIdToUse,
    });

    await fetch(`${BASE_URL}/api/activity/log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: Number(sessionIdToUse),
        actionCode,
        actionLabel,
        reasonCode,
        metadata,
        noteText,
        userId: user.UserId,
        userName: user.UserName,
        sourceType: "NPA",
        sourceId: loanAccountNumber,
      }),
    });

  } catch (err) {
    console.error("Log visit action failed", err);
  }
};
const endVisitSession = async () => {
  if (!visitSessionId) return;

  try {
    await fetch(`${BASE_URL}/api/activity/session/end`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: visitSessionId
      }),
    });

  } catch (err) {
    console.error("End visit session failed", err);
  } finally {
    setVisitSessionId(null);

    await AsyncStorage.removeItem(ACTIVE_VISIT_KEY);
    await AsyncStorage.removeItem("ACTIVE_VISIT_SNO");
    await AsyncStorage.removeItem("VISIT_START_TIME");
    await AsyncStorage.removeItem("ACTIVE_VISIT_USER");
  }
};

  const resetVisitAndReturnToSchedule = async () => {
  try {

    const user = await getLoggedUser();

    await fetch(`${BASE_URL}/api/visit/reset`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loanAccountNumber,
        userId: user.UserId
      }),
    });

    // stop visit session
    await endVisitSession();

    // reset UI
    resetVisitFlow();

    Alert.alert("Visit Reset", "Account moved back to Schedule");

    navigation.goBack();

  } catch (e) {
    console.log("Reset visit error:", e);
  }
};


const pushStep = () => {
  setFlowStack(prev => [
    ...prev,
    {
      // 🔹 CALL FLOW
      callStage,
      spokeChoice,
      readyPayChoice,
      notReadyChoice,
      foVisitAction,
      relativeFlow,
      didNotSpeakChoice,
      physicalVisitReason,
      invalidNumberFlow,
      calendarMode,

      // 🔹 VISIT FLOW
      visitStage,
      visitMeetStatus,
      visitAction,
      paymentMode,
      notReadyStage,
      notReadyReason,
      notReadyTextReason,
      notMetStage,
      notMetReason,
      notMetPaidStage,

      // 🔹 INPUT / TEMP DATA
      selectedDate,
      hour,
      minute,
      ampm,

      foVisitDate,
      foName,

      relativeName,
      relativeContact,

      otherReason,
      visitReason,
      collectionResult,
showPostCollectionActions,
showFinalExitOptions,
finalizeVisit,
paymentStep,

    },
  ]);
};
const handleBack = () => {
  setFlowStack(prev => {
    if (prev.length === 0) return prev;

    const last = prev[prev.length - 1];

    // 🔹 CALL FLOW
    setCallStage(last.callStage);
    setSpokeChoice(last.spokeChoice);
    setReadyPayChoice(last.readyPayChoice);
    setNotReadyChoice(last.notReadyChoice);
    setFoVisitAction(last.foVisitAction);
    setRelativeFlow(last.relativeFlow);
    setDidNotSpeakChoice(last.didNotSpeakChoice);
    setPhysicalVisitReason(last.physicalVisitReason);
    setInvalidNumberFlow(last.invalidNumberFlow);
    setCalendarMode(last.calendarMode);

    // 🔹 VISIT FLOW
    setVisitStage(last.visitStage);
    setVisitMeetStatus(last.visitMeetStatus);
    setVisitAction(last.visitAction);
    setPaymentMode(last.paymentMode);
    setNotReadyStage(last.notReadyStage);
    setNotReadyReason(last.notReadyReason);
    setNotReadyTextReason(last.notReadyTextReason);
    setNotMetStage(last.notMetStage);
    setNotMetReason(last.notMetReason);
    setNotMetPaidStage(last.notMetPaidStage);

    // 🔹 INPUT / TEMP DATA
    setSelectedDate(last.selectedDate);
    setHour(last.hour);
    setMinute(last.minute);
    setAmpm(last.ampm);

    setFoVisitDate(last.foVisitDate);
    setFoName(last.foName);

    setRelativeName(last.relativeName);
    setRelativeContact(last.relativeContact);

    setOtherReason(last.otherReason);
    setVisitReason(last.visitReason);
    setCollectionResult(last.collectionResult);
setShowPostCollectionActions(last.showPostCollectionActions);
setShowFinalExitOptions(last.showFinalExitOptions);
setFinalizeVisit(last.finalizeVisit);
setPaymentStep(last.paymentStep);

    // 🗑️ remove snapshot
    return prev.slice(0, -1);
  });
};
const handleModalBack = () => {
  if (flowStack.length > 0) {
    handleBack(); // ⬅️ go to previous stage
  } else {
    // ⛔ nothing to go back → close modal fully
    setShowCallFlowModal(false);
    setShowCallModal(false);
    setCallStage("IDLE");
    setCalendarMode(null);
  }
};

const { loanAccountNumber, openFlow, directCall, dialNumber } = route.params;

const [account, setAccount] = useState(null);
const [loading, setLoading] = useState(true);

const [altUnlocked, setAltUnlocked] = useState(false);
const [altEditable, setAltEditable] = useState(false);
const [altNumber, setAltNumber] = useState("");

const [showCallModal, setShowCallModal] = useState(false);
const [callStage, setCallStage] = useState("IDLE");
const [spokeChoice, setSpokeChoice] = useState(null);

const [readyPayChoice, setReadyPayChoice] = useState(null);
const [selectedDate, setSelectedDate] = useState("");
const [hour, setHour] = useState("10");
const [minute, setMinute] = useState("00");
const [ampm, setAmpm] = useState("AM");
const [notReadyChoice, setNotReadyChoice] = useState(null);
const [lumpSumScheduleType, setLumpSumScheduleType] = useState(null);
const [showCloseAccountModal, setShowCloseAccountModal] = useState(false);
const [foVisitAction, setFoVisitAction] = useState(null); 
const [foVisitDate, setFoVisitDate] = useState(null);
const [showFoDatePicker, setShowFoDatePicker] = useState(false);
const [foName, setFoName] = useState("");
const [notTakenAction, setNotTakenAction] = useState(null);
const [relativeFlow, setRelativeFlow] = useState(null);
const [relativeScheduleType, setRelativeScheduleType] = useState(null);
const [otherReason, setOtherReason] = useState("");
const [callBackLater, setCallBackLater] = useState(false);
const [spokeOtherReason, setSpokeOtherReason] = useState("");
const [didNotSpeakChoice, setDidNotSpeakChoice] = useState(null);
const [physicalVisitReason, setPhysicalVisitReason] = useState(null);
const [showPhysicalVisitSchedule, setShowPhysicalVisitSchedule] = useState(false);
const [calendarMode, setCalendarMode] = useState(null);
// =====================
// UNSCHEDULED VISIT
// =====================
const [isVisitFullScreen, setIsVisitFullScreen] = useState(false);
const [showVisitModal, setShowVisitModal] = useState(false);
const [visitStage, setVisitStage] = useState("IDLE");
const [visitMeetStatus, setVisitMeetStatus] = useState(null);
const [visitAction, setVisitAction] = useState(null);
const [visitSubAction, setVisitSubAction] = useState(null);
const [paymentMode, setPaymentMode] = useState(null);
const [paymentStep, setPaymentStep] = useState(null);
const [payments, setPayments] = useState([]);
const [visitReason, setVisitReason] = useState("");
const [chequeNumber, setChequeNumber] = useState("");
const [chequeDate, setChequeDate] = useState("");
const [chequeBank, setChequeBank] = useState("");
const [chequeIFSC, setChequeIFSC] = useState("");
const [chequeAmount, setChequeAmount] = useState("");
const [cashAmount, setCashAmount] = useState("");
const [finalizeVisit, setFinalizeVisit] = useState(false);
const [relativeName, setRelativeName] = useState("");
const [relativeContact, setRelativeContact] = useState("");
const [notReadyTextReason, setNotReadyTextReason] = useState("");
const [notReadyReason, setNotReadyReason] = useState(null);
const [notReadyStage, setNotReadyStage] = useState("SELECT");
const [visitFlow, setVisitFlow] = useState(null);
const [notMetReason, setNotMetReason] = useState(null);
const [notMetStage, setNotMetStage] = useState("SELECT");
const [notMetPaidStage, setNotMetPaidStage] = useState(null);
const [invalidNumberFlow, setInvalidNumberFlow] = useState(false);
const [notMetTextReason, setNotMetTextReason] = useState("");
const [collectionResult, setCollectionResult] = useState(null); 
// "FULL" | "PARTIAL"

const [showPostCollectionActions, setShowPostCollectionActions] = useState(false);
// Back to list / Complete

const [showFinalExitOptions, setShowFinalExitOptions] = useState(false);
// Visit nearby / Go dashboard
const [visitExitStage, setVisitExitStage] = useState("NONE");
// "NONE" | "POST_COLLECTION" | "FINAL_EXIT"
const [closeAccountSource, setCloseAccountSource] = useState("CALL"); 
// "CALL" or "VISIT"
const [capturedLocation, setCapturedLocation] = useState(null);
const [capturedAddress, setCapturedAddress] = useState("");
const [stopLocation, setStopLocation] = useState(null);
const [stopAddress, setStopAddress] = useState("");
const [currentVisitSNo, setCurrentVisitSNo] = useState(null);
const [startLocation, setStartLocation] = useState(null);
const [startAddress, setStartAddress] = useState("");
// ⭐ UNIVERSAL EXIT AFTER SUBMIT
const exitToDPDList = async () => {
  try {
    if (callSessionId) {
      await endCallSession();
    }

    setFlowStack([]);
    setShowCallFlowModal(false);
    setShowCallModal(false);
    setCallStage("IDLE");
    setCalendarMode(null);

    // ⭐ THIS IS THE IMPORTANT PART
    navigation.goBack();   // 🔥 go back to DPD LIST
  } catch (e) {
    console.log("Exit error", e);
  }
};

  // ✅ VISIT START: capture location first then open visit modal
// 🚀 MASTER START VISIT (TODAY + UNSCHEDULED USE SAME)
const startVisitFlow = async () => {
  try {
setIsVisitFullScreen(false); 
    setVisitStage("IDLE");
    setShowVisitModal(true);

    // ✅ 2) Start VISIT session first (fast operation)
    const sessionId = await startVisitSession();
    if (!sessionId) return;
setVisitSessionId(sessionId);

// ⭐ save active visit globally
await AsyncStorage.setItem(ACTIVE_VISIT_KEY, sessionId);
await AsyncStorage.setItem(VISIT_START_TIME_KEY, Date.now().toString());

const user = await getLoggedUser();
await AsyncStorage.setItem(ACTIVE_VISIT_USER_KEY, user.UserId.toString());

    // ✅ 3) Capture start location
    const coords = await handleCaptureLocation();
    if (!coords) return;

    setStartLocation({
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: coords.accuracy,
    });
    setStartAddress(coords.address);

    // ✅ 4) Save to DB
    const sno = await saveStartLocationToDBAndReturnSNo(coords);
    if (!sno) return;

    setCurrentVisitSNo(sno);
await AsyncStorage.setItem(ACTIVE_VISIT_SNO_KEY, sno.toString());
    // ✅ 5) Log
await logVisitAction({
  actionCode: "VISIT_STARTED",
  actionLabel: "Visit Started",
  sessionIdOverride: sessionId,
  metadata: {
    sno,
    startLat: coords.latitude,
    startLng: coords.longitude,
    accuracy: coords.accuracy,
    address: coords.address,
  },
});

  } catch (e) {
    console.log("Start visit error:", e);
    Alert.alert("Error", "Unable to start visit");
  }
};
const saveStartLocationToDBAndReturnSNo = async (coords) => {
  try {
    const userStr = await AsyncStorage.getItem("LOGGED_USER");
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user?.UserId || !user?.UserName) {
      Alert.alert("Error", "Login expired. Please login again.");
      return null;
    }

    // ⭐ STEP 1 — Build customer full address
    const customerAddress =
      `${account?.village || ""}, ${account?.gp || ""}, ${account?.pincode || ""}`;

    // ⭐ STEP 2 — Convert customer address → coordinates
    let customerCoords = null;
    try {
      customerCoords = await getCoordsFromAddressGoogle(customerAddress);
    } catch (e) {
      console.log("Customer geocoding failed:", e);
    }

    const payload = {
      userId: user.UserId,
      userName: user.UserName,
      accountNo: account?.loanAccountNumber,
      customerName: account?.firstname,

      // 🔴 START LOCATION (Officer)
      startLat: coords.latitude,
      startLng: coords.longitude,
      startAddress: coords.address,

      // 🔴 CUSTOMER LOCATION (Borrower)
  customerLat: customerCoords?.latitude,
customerLng: customerCoords?.longitude,
      customerAddress: customerAddress,
    };

    console.log("📤 Sending Visit Start Payload:", payload);

    const res = await fetch(`${BASE_URL}/api/field-visit/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      Alert.alert("❌ Save Failed", data.message || "Unable to save start");
      return null;
    }

    return data.sno;
  } catch (err) {
    Alert.alert("Error", err.message);
    return null;
  }
};
{/*
  const rescheduleRecovery = async (type, timestamp) => {

  try {

    const res = await fetch(`${BASE_URL}/api/recovery/reschedule`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        loanAccountNumber,
        type,
        timestamp
      })
    });

    const data = await res.json();

    if (!res.ok) {
      Alert.alert("Error", data.message || "Unable to update schedule");
      return;
    }

    Alert.alert("Success", "Schedule updated");

  } catch (e) {

    console.log("Reschedule error:", e);
    Alert.alert("Error", "Server error");

  }

};

useEffect(() => {

  if(route.params?.accountStatus === "IN PROCESS"){

    Alert.alert(
      "Scheduled Activity Exists",
      "This account already has a scheduled activity. You may call the customer and edit the schedule."
    );

  }

},[]); 
*/}

const resetNotReadyFlow = () => {
  setNotReadyStage("SELECT");
  setNotReadyReason(null);
  setNotReadyTextReason("");
  setRelativeName("");
  setRelativeContact("");
  setVisitExitStage("NONE");
};
const resetVisitFlow = () => {
setIsVisitFullScreen(false); 
 //setShowVisitModal(false);

  // visit flow
  setVisitStage("IDLE");
  setVisitMeetStatus(null);
  setVisitAction(null);

  // ready / payment
  setPaymentMode(null);
  setPayments([]);
  setFinalizeVisit(false);

  // not ready
  setNotReadyStage("SELECT");
  setNotReadyReason(null);
  setNotReadyTextReason("");
  setRelativeName("");
  setRelativeContact("");

  // call / spoke
  setCallStage("AFTER_CALL");
  setSpokeChoice(null);
  setNotReadyChoice(null);
  setReadyPayChoice(null);

  // calendar
  setCalendarMode(null);
  setSelectedDate(null);
  setHour("");
  setMinute("");
  setAmpm("AM");

  // others
  setVisitReason("");
  setShowVisitModal(false);
  setVisitStage("IDLE");
  setShowCloseAccountModal(false);
  setVisitMeetStatus(null);
  setVisitAction(null);
  setVisitSubAction(null);
setPaymentMode(null);
setPaymentStep(null);
setPaymentStep("METHOD");
setPayments([]);
  setVisitReason("");
  setFinalizeVisit(false);
  resetNotReadyFlow();
  setCalendarMode(null);
  setVisitExitStage("NONE");

};

const EndActionBlock = ({ onBack, onComplete }) => (
  <View style={{ marginTop: 16 }}>

    <TouchableOpacity
      style={styles.secondaryBtnFull}
      onPress={onBack}
    >
      <Text style={styles.secondaryBtnText}>Back to List</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.primaryBtnFull}
      onPress={onComplete}
    >
      <Text style={styles.primaryBtnText}>Complete</Text>
    </TouchableOpacity>

  </View>
);
const OtherReasonBlock = ({ reason, setReason, onComplete }) => (
  <View style={styles.sectionCard}>
    <TextInput
      style={styles.textArea}
      placeholder="Enter reason"
      value={reason}
      onChangeText={setReason}
      multiline
      textAlignVertical="top"
    />

    <TouchableOpacity
      style={[
        styles.primaryBtnFull,
        !reason && { opacity: 0.5 },
      ]}
      disabled={!reason}
      onPress={onComplete}
    >
      <Text style={styles.primaryBtnText}>Continue</Text>
    </TouchableOpacity>
  </View>
);
const BackOptionsBlock = ({ navigation }) => (
  <View style={styles.backOptionsBox}>

    {/* Visit Nearby Customers */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      onPress={() => navigation.navigate("NearbyCustomers")}
    >
      {/* Left side */}
      <View style={styles.optionLeft}>
        <Ionicons name="walk-outline" size={20} color="#1e4fa1" />
        <Text style={styles.optionText}>Visit Nearby Customers</Text>
      </View>

      {/* Right chevron */}
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
        style={styles.optionChevron}
      />
    </TouchableOpacity>

    {/* Go to Dashboard */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={async () => {
  const saved = await AsyncStorage.getItem("LOGGED_USER");
  const user = saved ? JSON.parse(saved) : null;

  navigation.reset({
    index: 0,
    routes: [{ name: "Home", params: { user } }],
  });
}}
    >
      {/* Left side */}
      <View style={styles.optionLeft}>
        <Ionicons name="home-outline" size={20} color="#1e4fa1" />
        <Text style={styles.optionText}>Go to Dashboard</Text>
      </View>

      {/* Right chevron */}
      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
        style={styles.optionChevron}
      />
    </TouchableOpacity>

  </View>
);
const saveAlternateNumber = async () => {
  if (!altNumber || altNumber.length !== 10) {
    Alert.alert("Invalid", "Alternate number must be 10 digits");
    return false;
  }
  try {
    const res = await fetch(`${BASE_URL}/api/account/save-alternate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loanAccountNumber: account.loanAccountNumber,
        alternateNumber: altNumber,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      Alert.alert("Error", data.message || "Unable to save");
      return false;
    }
// ✅ lock after save
setAltEditable(false);
setAltUnlocked(true);   // 👈 ADD THIS LINE
    return true;
  } catch (e) {
    Alert.alert("Error", "Server error");
    return false;
  }
};
useEffect(() => {
  if (
    visitStage === "OUTCOME" &&
    visitMeetStatus === "MET" &&
    visitAction === "READY" &&
    paymentMode === null &&
    finalizeVisit
  ) {
    setFinalizeVisit(false);
  }
}, [visitStage, visitMeetStatus, visitAction, paymentMode]);

  useEffect(() => {
    fetchAccountDetails();
  }, []);

useEffect(() => {
  if (!account) return;
// ✅ CALL: do not open modal immediately
// Because we want: Dial pad first → then modal after returning
if (openFlow === "CALL") {
  // do nothing here
}
  // ✅ VISIT: direct open visit flow (old)
  if (openFlow === "VISIT") {
    setShowVisitModal(true);
  }
if (openFlow === "VISIT_START") {
  startVisitFlow();
}


}, [account, openFlow]);

useEffect(() => {

  const restoreVisit = async () => {

    const activeVisit = await AsyncStorage.getItem(ACTIVE_VISIT_KEY);
    const visitSNo = await AsyncStorage.getItem(ACTIVE_VISIT_SNO_KEY);
    const visitUser = await AsyncStorage.getItem(ACTIVE_VISIT_USER_KEY);

    const user = await getLoggedUser();

    if (activeVisit && visitUser === user?.UserId?.toString()) {

      setVisitSessionId(activeVisit);

      if (visitSNo) {
        setCurrentVisitSNo(parseInt(visitSNo));
      }

      Alert.alert(
        "Visit Running",
        "You have an active visit. Please stop it before starting another."
      );
    }

  };

  restoreVisit();

}, []);
useEffect(() => {

  const interval = setInterval(async () => {

    const startTime = await AsyncStorage.getItem(VISIT_START_TIME_KEY);
    const visitUser = await AsyncStorage.getItem(ACTIVE_VISIT_USER_KEY);

    if (!startTime) return;

    const user = await getLoggedUser();

    // ✅ reminder only for same user
    if (visitUser !== user?.UserId?.toString()) return;

    const elapsed = Date.now() - parseInt(startTime);

    if (elapsed > 20 * 60 * 1000) {

      Alert.alert(
        "Visit Reminder",
        "Visit has been running for 20 minutes. Please stop it if completed."
      );

    }

  }, 60000);

  return () => clearInterval(interval);

}, []);
useEffect(() => {
  if (visitSessionId && !showVisitModal) {
    setShowVisitModal(true);
  }
}, [visitSessionId]);

  const fetchAccountDetails = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/account-details`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loanAccountNumber }),
      });

      const data = await res.json();
      setAccount(data.account);
      // ✅ PREFILL ALTERNATE NUMBER IF EXISTS
if (data.account?.AlternateNumber) {
  setAltNumber(data.account.AlternateNumber);
  setAltUnlocked(true);
  setAltEditable(false); // lock if already saved
} else {
  setAltNumber("");
  setAltUnlocked(true);   // allow entry
  setAltEditable(true);
}
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };
const handleCaptureLocation = async () => {
  const allowed = await requestLocationPermission();

  if (!allowed) {
    Alert.alert("Permission Required", "Please allow location permission.");
    return null;
  }

  try {
    const position = await getCurrentLocation();

    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };

    setCapturedLocation(coords);

    // ✅ Fetch Human Readable Address (FREE)
const address = await getAddressFromCoordsGoogle(
  coords.latitude,
  coords.longitude
);

    setCapturedAddress(address);

    Alert.alert(
      "✅ Location Captured",
      `Lat: ${coords.latitude}\nLng: ${coords.longitude}\nAccuracy: ${coords.accuracy}m\n\n📍 ${address}`
    );

    return { ...coords, address };
  } catch (err) {
    Alert.alert("❌ Location Error", err.message);
    return null;
  }
};

const openInGoogleMaps = (lat, lng, label = "Destination") => {
  if (!lat || !lng) {
    Alert.alert("Missing Location", "Please capture location first.");
    return;
  }

  const googleMapsUrl = Platform.select({
    android: `google.navigation:q=${lat},${lng}`,
    ios: `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`,
  });

  const webFallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  Linking.canOpenURL(googleMapsUrl)
    .then((supported) => {
      if (supported) {
        return Linking.openURL(googleMapsUrl);
      } else {
        return Linking.openURL(webFallbackUrl);
      }
    })
    .catch(() => {
      Linking.openURL(webFallbackUrl);
    });
};
const saveStartLocationToDB = async (coords) => {
  try {
    const userStr = await AsyncStorage.getItem("LOGGED_USER");
    const user = userStr ? JSON.parse(userStr) : null;

    if (!user?.UserId || !user?.UserName) {
      Alert.alert("Error", "Login expired. Please login again.");
      return;
    }

    const payload = {
      userId: user.UserId,
      userName: user.UserName,
      accountNo: account?.loanAccountNumber,
      customerName: account?.firstname,
      startLat: coords.latitude,
      startLng: coords.longitude,
    };

    const res = await fetch(`${BASE_URL}/api/field-visit/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      Alert.alert("❌ Save Failed", data.message || "Unable to save location");
      return;
    }
  } catch (err) {
    Alert.alert("Error", err.message);
  }
};
const captureStopLocation = async () => {
  const allowed = await requestLocationPermission();

  if (!allowed) {
    Alert.alert("Permission Required", "Please allow location permission.");
    return null;
  }

  try {
    const position = await getCurrentLocation();

    const coords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
    };

const address = await getAddressFromCoordsGoogle(
  coords.latitude,
  coords.longitude
);

    setStopLocation(coords);
    setStopAddress(address);

    return { ...coords, address };
  } catch (err) {
    Alert.alert("❌ Location Error", err.message);
    return null;
  }
};

const handleCallNow = async () => {
  try {
    if (!account) return;

    // ✅ If alternate is editable and filled → save first
if (altNumber && altNumber.length === 10) {
  const saved = await saveAlternateNumber();
  if (!saved) return;
}

    // ✅ collect numbers AFTER save
    const primary = String(account.mobileNumber || "").trim();
    const alt = String(altNumber || "").trim();

    const numbers = [primary, alt].filter(
      (n) => n && n.length === 10
    );

    if (numbers.length === 0) {
      Alert.alert("No Number", "No valid phone number available");
      return;
    }

    // ✅ Start CALL session
    const sessionId = await startCallSession();
    if (!sessionId) {
      Alert.alert("Error", "Unable to start call session");
      return;
    }

    setOpenCallModalAfterDial(true);

    // ✅ Single number
    if (numbers.length === 1) {
      await logCallAction({
        actionCode: "CALL_DIALED",
        actionLabel: "Call Dialed",
        metadata: { phoneNumber: numbers[0] },
      });

      Linking.openURL(`tel:${numbers[0]}`);
      return;
    }

    // ✅ Multiple numbers
    setShowCallModal(true);

  } catch (e) {
    console.log("handleCallNow error:", e);
    Alert.alert("Error", "Unable to start call");
  }
};

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading account details...</Text>
      </View>
    );
  }

  if (!account) {
    return (
      <View style={styles.center}>
        <Text>No account data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
{visitSessionId && (
  <View
    style={{
      backgroundColor: "#fde68a",
      padding: 15,
      alignItems: "center"
    }}
  >

    {/* Continue Visit */}
    <TouchableOpacity
      onPress={async () => {

        const storedSession = await AsyncStorage.getItem(ACTIVE_VISIT_KEY);
        const visitSNo = await AsyncStorage.getItem(ACTIVE_VISIT_SNO_KEY);

        if (storedSession) {
          setVisitSessionId(storedSession);
        }

        if (visitSNo) {
          setCurrentVisitSNo(parseInt(visitSNo));
        }

        setShowVisitModal(true);
        setVisitStage("IDLE");

      }}
    >
      <Text style={{ fontWeight: "bold", color: "#73320a", marginBottom: 2, paddingTop:12 }}>
        ⚠ Visit in progress. Tap here to continue the visit.
      </Text>
    </TouchableOpacity>


{/* NEW RESET VISIT BUTTON */}
<TouchableOpacity
  style={{
    backgroundColor: "#ef4444",
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 6
  }}
  onPress={resetVisitAndReturnToSchedule}
>
  <Text style={{ color: "#fff", fontWeight: "bold" }}>
    RESET VISIT
  </Text>
</TouchableOpacity>

  </View>
)}
  

      {/* ===== HEADER ===== */}
   <View style={styles.header}>
  <TouchableOpacity onPress={() => navigation.goBack()}>
    <Ionicons name="arrow-back" size={24} color="#fff" />
  </TouchableOpacity>

  <Text style={styles.headerTitle}>
    CALLING NPA - CUSTOMER DETAILS
  </Text>
 {/*
<TouchableOpacity
  style={{ backgroundColor: "red", padding: 2, margin: 2 }}
  onPress={async () => {
    await AsyncStorage.removeItem(ACTIVE_VISIT_KEY);
    await AsyncStorage.removeItem("VISIT_START_TIME");
    await AsyncStorage.removeItem("ACTIVE_VISIT_SNO");

    Alert.alert("Reset Done", "Visit storage cleared. Restart the app.");
  }}
>
  <Text style={{ color: "#fff" }}>RESET VISIT</Text>
</TouchableOpacity> 
*/}

  {/* ✅ FIXED HOME BUTTON */}
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

      {/* ===== BODY ===== */}
      <ScrollView contentContainerStyle={styles.body}>

        {/* ===== CUSTOMER DETAILS ===== */}
        <View style={styles.card}>
          <DetailRow label="Name" value={account.firstname} />
          <DetailRow label="Father's Name" value={account.fathersName || "-"} />
          <DetailRow
            label="Address"
            value={`${account.village || ""}, ${account.gp || ""}`}
            multiline
          />
          <DetailRow label="Pincode" value={account.pincode || "-"} />
          <DetailRow label="Scheduled Time" value="-" />
          <DetailRow label="Mobile No." value={account.mobileNumber} />

          {/* ALTERNATE NUMBER */}
          <View style={styles.row}>
            <Text style={styles.label}>Alternate Number</Text>

            {!altUnlocked ? (
              <TouchableOpacity
                onPress={() => {
                  setAltUnlocked(true);
                  setAltEditable(true);
                }}
              >
                <Ionicons name="lock-closed" size={20} color="#555" />
              </TouchableOpacity>
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <TextInput
                  style={styles.altInput}
                  placeholder="Enter number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  editable={altEditable}
                  value={altNumber}
onChangeText={(text) => {
  const cleaned = text.replace(/[^0-9]/g, "");
  setAltNumber(cleaned);
}}                />

                <TouchableOpacity
                  onPress={() => setAltEditable(!altEditable)}
                  style={{ marginLeft: 8 }}
                >
                  <Ionicons
                    name={altEditable ? "lock-open" : "lock-closed"}
                    size={20}
                    color={altEditable ? "#27ae60" : "#555"}
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* ===== LOAN DETAILS ===== */}
        <View style={styles.card}>
          <DetailRow label="Loan A/c No." value={account.loanAccountNumber} />
          <DetailRow label="Product" value={account.product} />
          <DetailRow label="Principal Due" value={`₹${account.principleDue || 0}`} />
          <DetailRow label="Interest Due" value={`₹${account.interestDue || 0}`} />
          <DetailRow label="Total Due" value={`₹${account.OVERDUEAMT || 0}`} />
          <DetailRow label="Interest Rate" value={`${account.interestRate || 0}%`} />
         <DetailRow
  label="Last Interest Applied Upto"
  value={account.lastInterestAppliedDate || "-"}
/>


          <DetailRow label="EMI Amount" value={`₹${account.EMIAMOUNT || 0}`} />
          <DetailRow
            label="Total Payable"
            value={`₹${account.currentOutstandingBalance || 0}`}
          />
        </View>

        {/* ===== ACTION BUTTONS ===== */}
{callStage === "IDLE" && !openFlow && (
  <>
    <TouchableOpacity
      style={styles.visitBtn}
      onPress={async () => {

        const activeVisit = await AsyncStorage.getItem(ACTIVE_VISIT_KEY);
        const visitUser = await AsyncStorage.getItem(ACTIVE_VISIT_USER_KEY);

        const user = await getLoggedUser();

        if (activeVisit && visitUser === user?.UserId?.toString()) {
          Alert.alert(
            "Visit Already Running",
            "You must stop your current visit before starting another."
          );
          return;
        }

        startVisitFlow();
      }}
    >
      <Ionicons name="walk" size={18} color="#fff" />
      <Text style={styles.btnText}>UNSCHEDULED VISIT</Text>
    </TouchableOpacity>

    <TouchableOpacity style={styles.callBtn} onPress={handleCallNow}>
      <Ionicons name="call" size={18} color="#fff" />
      <Text style={styles.btnText}>CALL NOW</Text>
    </TouchableOpacity>
  </>
)}

      </ScrollView>
      <Modal
  visible={showCallFlowModal}
  animationType="slide"
  transparent
>
  <View style={styles.modalOverlay}>
<View style={styles.callFlowModal}>

  {/* ===== MODAL HEADER ===== */}
  <View style={styles.modalHeaderRow}>

    <TouchableOpacity onPress={handleModalBack}>
      <Ionicons name="arrow-back" size={22} color="#1e4fa1" />
    </TouchableOpacity>

    <TouchableOpacity
onPress={async () => {
  if (callSessionId) {
    await logCallAction({
      actionCode: "CALL_ABORTED",
      actionLabel: "Call Flow Aborted",
    });
    await endCallSession();
  }

  setFlowStack([]);
  setShowCallFlowModal(false);
  setShowCallModal(false);
  setCallStage("IDLE");
  setCalendarMode(null);
}}

    >
      <Ionicons name="close" size={22} color="#000" />
    </TouchableOpacity>

  </View>

  {/* ===== MODAL CONTENT ===== */}
{/* ===== MODAL CONTENT ===== */}
<View style={{ paddingTop: 8 }}>

        {!calendarMode && (
<>
  {showThreeActionAfterCloseNo && (
<ThreeActionButtons
  logCallAction={logCallAction}
  reasonCode="CLOSE_ACCOUNT_NO"
  exitToDPDList={exitToDPDList}

  onSubmit={async () => {
    Alert.alert("Submitted", "Follow-up recorded");
  }}

  onScheduleCall={() => {
    setCalendarMode("CLOSE_ACCOUNT_NO_CALL");
    setShowThreeActionAfterCloseNo(false);
  }}

  onScheduleVisit={() => {
    setCalendarMode("CLOSE_ACCOUNT_NO_VISIT");
    setShowThreeActionAfterCloseNo(false);
  }}
/>

  )}

{callStage === "AFTER_CALL" && !showThreeActionAfterCloseNo && (
  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons name="call-outline" size={22} color="#1e4fa1" />
      <Text style={styles.sectionTitle}>Call Outcome</Text>
    </View>

    <Text style={styles.sectionSubText}>
      Select the outcome based on your interaction with the customer
    </Text>

    {/* ✅ SPOKE TO CUSTOMER */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "CALL_SPOKE",
    actionLabel: "Spoke to Customer",
  });
  pushStep();
  setCallStage("SPOKE");
}}

      activeOpacity={0.85}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="checkmark-circle-outline"
          size={22}
          color="#27ae60"
          style={{ marginTop: 2 }}   // optical alignment
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>
            Spoke to Customer
          </Text>
          <Text style={styles.optionSubText}>
            Customer answered/discussion completed
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
      />
    </TouchableOpacity>

    {/* ❌ DID NOT SPEAK TO CUSTOMER */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "CALL_NOT_SPOKE",
    actionLabel: "Did Not Speak to Customer",
  });
  pushStep();
  setCallStage("NOT_SPOKE");
}}

      activeOpacity={0.85}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="close-circle-outline"
          size={22}
          color="#dc2626"
          style={{ marginTop: 2 }}
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>
            Did Not Speak to Customer
          </Text>
          <Text style={styles.optionSubText}>
            Call not connected/customer unavailable
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
      />
    </TouchableOpacity>

  </View>
)}
{callStage === "SPOKE" && spokeChoice === null && !showThreeActionAfterCloseNo &&  (
  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons name="chatbubble-ellipses-outline" size={22} color="#2563eb" />
      <Text style={styles.sectionTitle}>Customer Response</Text>
    </View>

    <Text style={styles.sectionSubText}>
      Select the outcome based on the customer’s response
    </Text>

    {/* ✅ READY TO PAY */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "READY_TO_PAY",
    actionLabel: "Customer Ready to Pay",
  });
  pushStep();
  setSpokeChoice("READY");
}}

      activeOpacity={0.85}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="cash-outline"
          size={22}
          color="#2563eb"
          style={{ marginTop: 2 }}
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Ready to Pay</Text>
          <Text style={styles.optionSubText}>
            Customer is willing to make payment now
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* ⏳ NOT READY TO PAY */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "NOT_READY_TO_PAY",
    actionLabel: "Customer Not Ready to Pay",
  });
  pushStep();
  setSpokeChoice("NOT_READY");
}}

      activeOpacity={0.85}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="time-outline"
          size={22}
          color="#2563eb"
          style={{ marginTop: 2 }}
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Not Ready to Pay</Text>
          <Text style={styles.optionSubText}>
            Customer unable to make payment at this time
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* 📞 CALL BACK LATER */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "CALL_BACK_LATER",
    actionLabel: "Asked to Call Back Later",
  });
  pushStep();
  setSpokeChoice("CALL_LATER");
  setCalendarMode("CALL_BACK_LATER");
}}


      activeOpacity={0.85}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="call-outline"
          size={22}
          color="#2563eb"
          style={{ marginTop: 2 }}
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Asked to Call Back Later</Text>
          <Text style={styles.optionSubText}>
            Customer requested a follow-up call
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* ✍️ OTHERS */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "CALL_SPOKE_OTHERS",
    actionLabel: "Other Response from Customer",
  });
  pushStep();
  setSpokeChoice("OTHERS");
}}

      activeOpacity={0.85}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="ellipsis-horizontal"
          size={22}
          color="#2563eb"
          style={{ marginTop: 2 }}
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Others</Text>
          <Text style={styles.optionSubText}>
            Specify a different customer response
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

  </View>
)}


{callStage === "SPOKE" &&
 spokeChoice === "READY" &&
 readyPayChoice === null && (

  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons name="cash-outline" size={22} color="#2563eb" />
      <Text style={styles.sectionTitle}>Payment Preference</Text>
    </View>

    <Text style={styles.sectionSubText}>
      Select how the customer prefers to make the payment
    </Text>

    {/* 🔗 ONLINE PAYMENT */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
      onPress={() =>
        Alert.alert("Info", "Online payment link feature will be added later")
      }
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="link-outline"
          size={22}
          color="#2563eb"
          style={{ marginTop: 2 }}
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>
            Send Online Payment Link
          </Text>
          <Text style={styles.optionSubText}>
            Customer will pay via UPI or NetBanking
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* 📅 SCHEDULE VISIT */}
{/* 📅 SCHEDULE VISIT */}
<TouchableOpacity
  style={styles.optionRowAligned}
  activeOpacity={0.85}
  onPress={() => {
    // ✅ Log activity immediately
    logCallAction({
      actionCode: "SCHEDULE_VISIT_FOR_COLLECTION",
      actionLabel: "Schedule Visit for Collection",
    });

    pushStep();
    setReadyPayChoice("SCHEDULE_VISIT");
    setCalendarMode("READY_VISIT");
  }}
>
  <View style={styles.optionLeft}>
    <Ionicons
      name="calendar-outline"
      size={22}
      color="#2563eb"
      style={{ marginTop: 2 }}
    />

    <View style={styles.optionTextWrap}>
      <Text style={styles.optionTitle}>
        Schedule Visit for Collection
      </Text>
      <Text style={styles.optionSubText}>
        Fix a date and time to collect payment in person
      </Text>
    </View>
  </View>

  <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
</TouchableOpacity>

  </View>
)}

{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === null && (

  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons name="alert-circle-outline" size={22} color="#2563eb" />
      <Text style={styles.sectionTitle}>Not Ready to Pay</Text>
    </View>

    <Text style={styles.sectionSubText}>
      Select the reason provided by the customer
    </Text>

    {/* WILL PAY LUMPSUM */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "LUMPSUM",
    actionLabel: "Customer Will Pay Lump Sum",
  });
  pushStep();
  setNotReadyChoice("LUMPSUM");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="calendar-outline" size={20} color="#2563eb" />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Will Pay Lump Sum</Text>
          <Text style={styles.optionSubText}>
            Customer promised full payment later
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* ALREADY PAID */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "ALREADY_PAID",
    actionLabel: "Customer Claimed Already Paid",
  });
  pushStep();
  setNotReadyChoice("ALREADY_PAID");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="checkmark-done-outline" size={20} color="#2563eb" />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Already Paid</Text>
          <Text style={styles.optionSubText}>
            Customer claims payment already done
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* FO NOT VISITED */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "FO_NOT_VISITED",
    actionLabel: "FO Not Visited Yet",
  });
  pushStep();
  setNotReadyChoice("FO_NOT_VISITED");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="walk-outline" size={20} color="#2563eb" />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>FO Not Visited</Text>
          <Text style={styles.optionSubText}>
            Field officer has not visited yet
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* NOT TAKEN LOAN */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "NOT_TAKEN_LOAN",
    actionLabel: "Customer not taken loan",
  });
  pushStep();
  setNotReadyChoice("NOT_TAKEN_LOAN");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="close-circle-outline" size={20} color="#2563eb" />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Not Taken Loan</Text>
          <Text style={styles.optionSubText}>
            Customer denies taking this loan
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* LOAN BY RELATIVE */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "LOAN_BY_RELATIVE",
    actionLabel: "Loan Taken by Relative",
  });
  pushStep();
  setNotReadyChoice("LOAN_BY_RELATIVE");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="people-outline" size={20} color="#2563eb" />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Loan Taken by Relative</Text>
          <Text style={styles.optionSubText}>
            Loan belongs to a family member
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* OTHERS */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={() => {
  logCallAction({
    actionCode: "NOT_READY_OTHERS",
    actionLabel: "Other Reason – Not Ready to Pay",
  });
  pushStep();
  setNotReadyChoice("OTHERS");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="ellipsis-horizontal" size={20} color="#2563eb" />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Others</Text>
          <Text style={styles.optionSubText}>
            Specify a different reason
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

  </View>
)}
{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "LUMPSUM" && (

<ThreeActionButtons
  logCallAction={logCallAction}
  reasonCode="LUMPSUM"
  exitToDPDList={exitToDPDList}

  onSubmit={async () => {
  }}

  onScheduleCall={() => {
    setLumpSumScheduleType("CALL");
    setCalendarMode("LUMPSUM_CALL");
    setSpokeChoice(null);
    setNotReadyChoice(null);
  }}

  onScheduleVisit={() => {
    setLumpSumScheduleType("VISIT");
    setCalendarMode("LUMPSUM_VISIT");
    setSpokeChoice(null);
    setNotReadyChoice(null);
  }}
/>

)}

{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "ALREADY_PAID" && 
  !showThreeActionAfterCloseNo && (

  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons
        name="checkmark-done-outline"
        size={22}

        color="#2563eb"
      />
      <Text style={styles.sectionTitle}>Payment Already Made</Text>
    </View>

    <Text style={styles.sectionSubText}>
      Choose how you want to proceed
    </Text>

    {/* 📤 UPLOAD RECEIPT */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
      onPress={() =>
        Alert.alert(
          "Upload Receipt",
          "Receipt upload will be added later"
        )
      }
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="cloud-upload-outline"
          size={20}
          color="#2563eb"
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Upload Receipt</Text>
          <Text style={styles.optionSubText}>
            Upload proof of payment
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
      />
    </TouchableOpacity>

    {/* ⏭️ SKIP & PROCEED */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={async () => {
  await logCallAction({
    actionCode: "ALREADY_PAID_SKIP",
    actionLabel: "Skipped Receipt Upload",
  });
setCloseAccountSource("CALL");
setShowCloseAccountModal(true);
}}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="arrow-forward-circle-outline"
          size={20}
          color="#2563eb"
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Skip & Proceed</Text>
          <Text style={styles.optionSubText}>
            Continue without uploading receipt
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
      />
    </TouchableOpacity>

  </View>
)}

{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "FO_NOT_VISITED" &&
 foVisitAction === null && (

  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons
        name="walk-outline"
        size={22}
        color="#2563eb"
      />
      <Text style={styles.sectionTitle}>
        FO Not Visited
      </Text>
    </View>

    <Text style={styles.sectionSubText}>
      Choose how you want to proceed
    </Text>

    {/* 📋 CAPTURE DETAILS */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={() => {
  logCallAction({
    actionCode: "FO_VISIT_CAPTURE",
    actionLabel: "Capturing FO Visit Details",
  });
  pushStep();
  setFoVisitAction("CAPTURE");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="document-text-outline"
          size={20}
          color="#2563eb"
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>
            Capture Details
          </Text>
          <Text style={styles.optionSubText}>
            Enter field officer visit details
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
      />
    </TouchableOpacity>

    {/* ⏭️ SKIP & PROCEED */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={() => {
  logCallAction({
    actionCode: "FO_VISIT_SKIP",
    actionLabel: "Skipped FO Visit Details",
  });
  pushStep();
  setFoVisitAction("OPTIONS");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="arrow-forward-circle-outline"
          size={20}
          color="#2563eb"
        />

        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>
            Skip & Proceed
          </Text>
          <Text style={styles.optionSubText}>
            Continue without capturing FO details
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
      />
    </TouchableOpacity>

  </View>
)}
{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "FO_NOT_VISITED" &&
 foVisitAction === "CAPTURE" && (

  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons
        name="clipboard-outline"
        size={22}
        color="#2563eb"
      />
      <Text style={styles.sectionTitle}>
        Capture FO Visit Details
      </Text>
    </View>

    <Text style={styles.sectionSubText}>
      Enter the visit information provided by the customer
    </Text>

{/* 📅 Date of Visit */}
<View style={styles.inputBlock}>
  <Text style={styles.inputLabel}>Date of Visit Promised</Text>

  <TouchableOpacity
    style={styles.simpleInput}
    onPress={() => setShowFoDatePicker(true)}
    activeOpacity={0.8}
  >
    <Text
      style={[
        styles.simpleInputText,
        !foVisitDate && { color: "#94a3b8" },
      ]}
    >
      {foVisitDate || "Select date"}
    </Text>

    <Ionicons
      name="calendar-outline"
      size={18}
      color="#2563eb"
    />
  </TouchableOpacity>
</View>


    {/* Calendar */}
    {showFoDatePicker && (
      <Calendar
        onDayPress={(day) => {
          setFoVisitDate(day.dateString);
          setShowFoDatePicker(false);
        }}
        markedDates={{
          [foVisitDate]: {
            selected: true,
            selectedColor: "#2563eb",
          },
        }}
      />
    )}

    {/* 👤 FO Name */}
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>Field Officer Name</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter FO name"
        value={foName}
        onChangeText={setFoName}
      />
    </View>

    {/* ✅ Proceed */}
    <TouchableOpacity
      style={[
        styles.updateBtn,
        (!foVisitDate || !foName) && { opacity: 0.5 },
      ]}
      disabled={!foVisitDate || !foName}
onPress={async () => {
  await logCallAction({
    actionCode: "FO_VISIT_DETAILS_CAPTURED",
    actionLabel: "FO Visit Details Captured",
    metadata: {
      foVisitDate,
      foName,
    },
  });
  setFoVisitDate(null);
  setFoName("");
  setShowFoDatePicker(false);

  // ✅ Open ThreeActionButtons screen
  setFoVisitAction("OPTIONS");
}}

 >
      <Text style={styles.updateText}>PROCEED</Text>
    </TouchableOpacity>

  </View>
)}

{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "FO_NOT_VISITED" &&
 foVisitAction === "OPTIONS" && (

  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons
        name="walk-outline"
        size={22}
        color="#2563eb"
      />
      <Text style={styles.sectionTitle}>
        FO Not Visited – Next Action
      </Text>
    </View>

    <Text style={styles.sectionSubText}>
      Choose how you want to proceed for this case
    </Text>

    {/* ✅ SUBMIT */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={async () => {
  await logCallAction({
    actionCode: "CALL_COMPLETED",
    actionLabel: "Call Flow Completed",
    reasonCode: "FO_NOT_VISITED",
  });
  await exitToDPDList();
}}


    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="checkmark-circle-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Submit</Text>
          <Text style={styles.optionSubText}>
            Record FO not visited and close this flow
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* 📞 SCHEDULE CALL */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={async () => {
  await logCallAction({
    actionCode: "SCHEDULE_CALL",
    actionLabel: "Schedule a Call",
    reasonCode: "FO_NOT_VISITED",
  });

  setFoVisitAction("CALL");
  setCalendarMode("FO_NOT_VISITED_CALL");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="call-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Schedule a Call</Text>
          <Text style={styles.optionSubText}>
            Fix a follow-up call with the customer
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* 📅 SCHEDULE VISIT */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={async () => {
  await logCallAction({
    actionCode: "SCHEDULE_VISIT",
    actionLabel: "Schedule a Visit",
    reasonCode: "FO_NOT_VISITED",
  });

  setFoVisitAction("CALL");
  setCalendarMode("FO_NOT_VISITED_VISIT");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Schedule a Visit</Text>
          <Text style={styles.optionSubText}>
            Plan a physical visit at a later date
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

  </View>
)}

{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "NOT_TAKEN_LOAN" && (

  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons
        name="close-circle-outline"
        size={22}
        color="#2563eb"
      />
      <Text style={styles.sectionTitle}>
        Not Taken Loan
      </Text>
    </View>

    <Text style={styles.sectionSubText}>
      Choose how you want to proceed for this case
    </Text>

    {/* ✅ SUBMIT */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={async () => {
  await logCallAction({
    actionCode: "CALL_COMPLETED",
    actionLabel: "Call Flow Completed",
    reasonCode: "NOT_TAKEN_LOAN",
  });
  await exitToDPDList();
}}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="checkmark-circle-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Submit</Text>
          <Text style={styles.optionSubText}>
            Record as not taken loan and close this flow
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* 📞 SCHEDULE CALL */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={async () => {
  await logCallAction({
    actionCode: "SCHEDULE_CALL",
    actionLabel: "Schedule a Call",
    reasonCode: "NOT_TAKEN_LOAN",
  });

  setNotTakenAction("CALL");
  setCalendarMode("NOT_TAKEN_LOAN_CALL");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="call-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Schedule a Call</Text>
          <Text style={styles.optionSubText}>
            Follow up with the customer later
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* 📅 SCHEDULE VISIT */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={async () => {
  await logCallAction({
    actionCode: "SCHEDULE_VISIT",
    actionLabel: "Schedule a Visit",
    reasonCode: "NOT_TAKEN_LOAN",
  });

  setNotTakenAction("VISIT");
  setCalendarMode("NOT_TAKEN_LOAN_VISIT");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Schedule a Visit</Text>
          <Text style={styles.optionSubText}>
            Plan a physical visit to verify details
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

  </View>
)}

{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "LOAN_BY_RELATIVE" &&
 relativeFlow === null && (

  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons
        name="people-outline"
        size={22}
        color="#2563eb"
      />
      <Text style={styles.sectionTitle}>
        Loan Taken by Relative
      </Text>
    </View>

    <Text style={styles.sectionSubText}>
      Choose how you want to proceed for this case
    </Text>

    {/* 👤 CAPTURE DETAILS */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={() => {
  pushStep();
  setRelativeFlow("CAPTURE");
}}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="clipboard-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Capture Details</Text>
          <Text style={styles.optionSubText}>
            Enter relative name and contact information
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
      />
    </TouchableOpacity>

    {/* ⏭️ SKIP & PROCEED */}
    <TouchableOpacity
      style={styles.optionRowAligned}
      activeOpacity={0.85}
onPress={() => {
  pushStep();
  setRelativeFlow("SKIP");
}}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="arrow-forward-circle-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>Skip & Proceed</Text>
          <Text style={styles.optionSubText}>
            Continue without capturing relative details
          </Text>
        </View>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
      />
    </TouchableOpacity>

  </View>
)}

{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "LOAN_BY_RELATIVE" &&
 relativeFlow === "CAPTURE" && (

  <View style={styles.sectionCard}>

    {/* Icon Badge + Header */}
    <View style={styles.enhancedHeaderRow}>
      <View style={styles.iconBadge}>
        <Ionicons
          name="people-outline"
          size={22}
          color="#2563eb"
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.sectionTitle}>
          Relative Loan Details
        </Text>
        <Text style={styles.sectionSubText}>
          Loan was taken by a family member
        </Text>
      </View>
    </View>

    {/* Divider */}
    <View style={styles.softDivider} />

    {/* 👤 Relative Name */}
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>Relative Name</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter full name"
        value={relativeName}
        onChangeText={setRelativeName}
      />
    </View>

    {/* 📞 Relative Contact */}
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>Contact Number</Text>
      <TextInput
        style={styles.textInput}
        placeholder="10-digit mobile number"
        keyboardType="number-pad"
        maxLength={10}
        value={relativeContact}
        onChangeText={setRelativeContact}
      />
    </View>

    {/* Helper text */}
    <Text style={styles.helperText}>
      This information helps validate the loan ownership
    </Text>

    {/* ✅ Primary Action */}
    <TouchableOpacity
      style={[
        styles.primaryActionBtn,
        (!relativeName || !relativeContact) && { opacity: 0.5 },
      ]}
      disabled={!relativeName || !relativeContact}
onPress={async () => {
  await logCallAction({
    actionCode: "RELATIVE_DETAILS_CAPTURED",
    actionLabel: "Relative Loan Holder Details Captured",
    metadata: {
      name: relativeName,
      contact: relativeContact,
    },
  });
  setRelativeFlow("OPTIONS");
}}


    >
      <Text style={styles.primaryActionText}>Save & Continue</Text>
    </TouchableOpacity>

  </View>
)}
{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "LOAN_BY_RELATIVE" &&
 relativeFlow === "OPTIONS" && (

  <ThreeActionButtons
    logCallAction={logCallAction}
    reasonCode="LOAN_BY_RELATIVE"
    exitToDPDList={exitToDPDList}
    onSubmit={async () => {
      await logCallAction({
        actionCode: "CALL_COMPLETED",
        actionLabel: "Call Flow Completed",
        reasonCode: "LOAN_BY_RELATIVE",
      });

      await endCallSession();
      resetVisitFlow();

      setRelativeFlow(null);
    }}

    onScheduleCall={async () => {
      await logCallAction({
        actionCode: "SCHEDULE_CALL",
        actionLabel: "Schedule a Call",
        reasonCode: "LOAN_BY_RELATIVE",
      });

      setCalendarMode("LOAN_BY_RELATIVE_CALL");
      setRelativeFlow(null);
    }}

    onScheduleVisit={async () => {
      await logCallAction({
        actionCode: "SCHEDULE_VISIT",
        actionLabel: "Schedule a Visit",
        reasonCode: "LOAN_BY_RELATIVE",
      });

      setCalendarMode("LOAN_BY_RELATIVE_VISIT");
      setRelativeFlow(null);
    }}
  />
)}

{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "LOAN_BY_RELATIVE" &&
 relativeFlow === "SKIP" && (
<ThreeActionButtons
  logCallAction={logCallAction}
  reasonCode="LOAN_BY_RELATIVE"
  exitToDPDList={exitToDPDList}

  onSubmit={async () => {
    setRelativeFlow(null);
  }}

  onScheduleCall={() => {
    setRelativeScheduleType("CALL");
    setCalendarMode("RELATIVE_CALL");
    setRelativeFlow(null);
  }}

  onScheduleVisit={() => {
    setRelativeScheduleType("VISIT");
    setCalendarMode("RELATIVE_VISIT");
    setRelativeFlow(null);
  }}
/>

)}
{callStage === "SPOKE" &&
 spokeChoice === "NOT_READY" &&
 notReadyChoice === "OTHERS" && 
 !showReasonNextActions && ( 
  <ReasonSubmitBlock
    reason={otherReason}
    setReason={setOtherReason}
    onSubmit={async () => {
      await logCallAction({
        actionCode: "REASON_CAPTURED",
        actionLabel: "Reason Saved",
        reasonCode: "NOT_READY_OTHERS",
        noteText: otherReason,
      });
      setShowReasonNextActions(true);
    }}
  />
)}
{callStage === "SPOKE" && spokeChoice === "OTHERS" && !showReasonNextActions && (
  <ReasonSubmitBlock
    reason={otherReason}
    setReason={setOtherReason}
    onSubmit={async () => {
      await logCallAction({
        actionCode: "REASON_CAPTURED",
        actionLabel: "Reason Saved",
        reasonCode: "SPOKE_OTHERS",
        noteText: otherReason,
      });
      setShowReasonNextActions(true);
    }}
  />
)}
{showReasonNextActions && (
  <ThreeActionButtons
    logCallAction={logCallAction}
    reasonCode="OTHERS_REASON"
  exitToDPDList={exitToDPDList}
 onSubmit={async () => {
  setShowReasonNextActions(false);
}}


    onScheduleCall={() => {
      // ✅ ThreeActionButtons already logs SCHEDULE_CALL
      setCalendarMode("REASON_CALL");
      setShowReasonNextActions(false);
    }}

    onScheduleVisit={() => {
      // ✅ ThreeActionButtons already logs SCHEDULE_VISIT
      setCalendarMode("REASON_VISIT");
      setShowReasonNextActions(false);
    }}
  />
)}

{callStage === "NOT_SPOKE" &&

 didNotSpeakChoice === null && (

  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons
        name="call-outline"
        size={22}
        color="#2563eb"
      />
      <Text style={styles.sectionTitle}>
        Call Not Connected
      </Text>
    </View>

    <Text style={styles.sectionSubText}>
      Select the reason why the customer could not be reached
    </Text>

    {/* 🚫 NO RESPONSE / BUSY */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={async () => {

  await logCallAction({
    actionCode: "CALL_BUSY",
    actionLabel: "Customer Busy"
  });

  Alert.alert(
    "Customer Busy",
    "Attempt recorded",
    [
      {
        text: "OK",
        onPress: async () => {
          await endCallSession();
          exitToDPDList();
        }
      }
    ]
  );

}}
      activeOpacity={0.85}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="time-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>
            No Response / Busy
          </Text>
          <Text style={styles.optionSubText}>
            Call was unanswered or line was busy
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* 📵 NOT REACHABLE */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={async () => {

  await logCallAction({
    actionCode: "CALL_NOT_REACHABLE",
    actionLabel: "Customer Not Reachable"
  });

  Alert.alert(
    "Not Reachable",
    "Attempt recorded",
    [
      {
        text: "OK",
        onPress: async () => {
          await endCallSession();
          exitToDPDList();
        }
      }
    ]
  );

}}
      activeOpacity={0.85}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="phone-portrait-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>
            Not Reachable / Switched Off
          </Text>
          <Text style={styles.optionSubText}>
            Phone was switched off or out of coverage
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* ❌ INVALID NUMBER */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={async () => {

  await logCallAction({
    actionCode: "INVALID_NUMBER",
    actionLabel: "Invalid Phone Number",
  });

  Alert.alert(
    "Invalid Number",
    "Please schedule a physical visit to verify the customer.",
    [
      {
        text: "OK",
        onPress: () => {
          pushStep();
          setDidNotSpeakChoice("INVALID");
          setInvalidNumberFlow(true);
          setCalendarMode("INVALID_NUMBER_VISIT");
        }
      }
    ]
  );

}}

      activeOpacity={0.85}
    >
      <View style={styles.optionLeft}>
        <Ionicons
          name="close-circle-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>
            Number Invalid
          </Text>
          <Text style={styles.optionSubText}>
            The number does not belong to the customer
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* 🏃 PHYSICAL VISIT */}
<TouchableOpacity
  style={styles.optionRowAligned}
  onPress={() => {
    logCallAction({
  actionCode: "PHYSICAL_VISIT_REQUIRED",
  actionLabel: "Physical Visit Required",
});

  pushStep();
  setDidNotSpeakChoice("PHYSICAL_VISIT");
      setInvalidNumberFlow(false);   // 👈 ADD THIS LINE

}}

  activeOpacity={0.85}
>
      <View style={styles.optionLeft}>
        <Ionicons
          name="walk-outline"
          size={20}
          color="#2563eb"
        />
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionTitle}>
            Physical Visit Required
          </Text>
          <Text style={styles.optionSubText}>
            Customer must be contacted in person
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

  </View>
)}

{callStage === "NOT_SPOKE" &&
 invalidNumberFlow && (
  <View style={styles.sectionCard}>

    <View style={styles.sectionHeaderRow}>
      <Ionicons
        name="alert-circle-outline"
        size={22}
        color="#2563eb"
      />
      <Text style={styles.sectionTitle}>
        Number Invalid
      </Text>
    </View>

    <Text style={styles.sectionSubText}>
      The customer’s number is invalid. Please schedule a physical visit.
    </Text>

  </View>
)}


{callStage === "NOT_SPOKE" &&
 didNotSpeakChoice === "PHYSICAL_VISIT" && (

  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons
        name="walk-outline"
        size={22}
        color="#2563eb"
      />
      <Text style={styles.sectionTitle}>
        Select Reason
      </Text>
    </View>

    <Text style={styles.sectionSubText}>
      Choose the reason for scheduling a physical visit
    </Text>

    {/* OPTION 1 */}
    <TouchableOpacity
      style={styles.radioRow}
      activeOpacity={0.8}
onPress={() => {
  logCallAction({
  actionCode: "PHYSICAL_VISIT_REASON",
  actionLabel: "Physical Visit Reason Selected",
  metadata: { reason: "NOT_AVAILABLE" },
});

  pushStep();
  setPhysicalVisitReason("NOT_AVAILABLE");
}}
    >
      <Ionicons
        name={
          physicalVisitReason === "NOT_AVAILABLE"
            ? "radio-button-on"
            : "radio-button-off"
        }
        size={20}
        color="#2563eb"
      />
      <Text style={styles.radioText}>
        Number Not Available
      </Text>
    </TouchableOpacity>

    {/* OPTION 2 */}
    <TouchableOpacity
      style={styles.radioRow}
      activeOpacity={0.8}
onPress={() => {
  logCallAction({
    actionCode: "PHYSICAL_VISIT_REASON",
    actionLabel: "Physical Visit Reason Selected",
    metadata: { reason: "INVALID" },
  });

  pushStep();
  setPhysicalVisitReason("INVALID");
}}

    >
      <Ionicons
        name={
          physicalVisitReason === "INVALID"
            ? "radio-button-on"
            : "radio-button-off"
        }
        size={20}
        color="#2563eb"
      />
      <Text style={styles.radioText}>
        Number Invalid
      </Text>
    </TouchableOpacity>

    {/* OPTION 3 */}
    <TouchableOpacity
      style={styles.radioRow}
      activeOpacity={0.8}
onPress={() => {
  logCallAction({
    actionCode: "PHYSICAL_VISIT_REASON",
    actionLabel: "Physical Visit Reason Selected",
    metadata: { reason: "REQUESTED" },
  });

  pushStep();
  setPhysicalVisitReason("REQUESTED");
}}

    >
      <Ionicons
        name={
          physicalVisitReason === "REQUESTED"
            ? "radio-button-on"
            : "radio-button-off"
        }
        size={20}
        color="#2563eb"
      />
      <Text style={styles.radioText}>
        Customer Requested Visit
      </Text>
    </TouchableOpacity>

    {/* PRIMARY ACTION */}
    <TouchableOpacity
      style={[
        styles.updateBtn,
        !physicalVisitReason && { opacity: 0.5 },
      ]}
      disabled={!physicalVisitReason}
      onPress={() => {
        setCalendarMode("PHYSICAL_VISIT");
      }}
    >
      <Text style={styles.updateText}>
        SCHEDULE VISIT
      </Text>
    </TouchableOpacity>

  </View>
)}

  </>
)}
{calendarMode && (
  <View style={styles.scheduleCard}>

    {/* 📅 Calendar */}
    <Calendar
      onDayPress={(day) => setSelectedDate(day.dateString)}
      markedDates={{
        [selectedDate]: {
          selected: true,
          selectedColor: "#1e88e5",
        },
      }}
    />

    {/* ⏰ Time Picker */}
    <View style={styles.timeRow}>
      <TextInput
        style={styles.timeInput}
        value={hour}
        keyboardType="number-pad"
        maxLength={2}
        onChangeText={setHour}
      />

      <Text style={styles.colon}>:</Text>

      <TextInput
        style={styles.timeInput}
        value={minute}
        keyboardType="number-pad"
        maxLength={2}
        onChangeText={setMinute}
      />

      <TouchableOpacity
        style={styles.ampmBtn}
        onPress={() => setAmpm(ampm === "AM" ? "PM" : "AM")}
      >
        <Text style={styles.ampmText}>{ampm}</Text>
      </TouchableOpacity>
    </View>

    {/* ✅ Update */}
    <TouchableOpacity
      style={styles.updateBtn}
      onPress={async () => {

        // ✅ MUST select date
        if (!selectedDate) {
          Alert.alert("Error", "Please select date");
          return;
        }

        // ✅ MUST select time
        if (!hour || !minute) {
          Alert.alert("Error", "Please enter time");
          return;
        }

        // ✅ IMPORTANT: convert PHYSICAL_VISIT → READY_VISIT for backend/procedure
        const modeForDB =
          calendarMode === "PHYSICAL_VISIT" ? "READY_VISIT" : calendarMode;

        await logCallAction({
          actionCode: "SCHEDULED",
          actionLabel: "Follow-up Scheduled",
          metadata: {
            mode: modeForDB,
            date: selectedDate,
            time: `${hour}:${minute} ${ampm}`,
            reason: physicalVisitReason, // ✅ Optional: keeps your selected reason also
          },
        });

    // ✅ End call session first
await endCallSession();

// ✅ Close call modal
setShowCallFlowModal(false);
setShowCallModal(false);

// ✅ Reset entire flow
setFlowStack([]);
setCalendarMode(null);
setCallStage("IDLE");

// ✅ GO BACK TO DPD LIST SCREEN
navigation.goBack();

      }}
    >
      <Text style={styles.updateText}>UPDATE SCHEDULE</Text>
    </TouchableOpacity>

  </View>
)}
</View>

    </View>
  </View>
</Modal>

{/* ✅ CLOSE ACCOUNT MODAL (WORKS FOR BOTH CALL + VISIT) */}
<Modal
  visible={showCloseAccountModal}
  transparent
  animationType="fade"
>
  <View style={styles.modalOverlay}>
    <View style={styles.closeModalCard}>

      {/* Header */}
      <View style={styles.closeModalHeader}>
        <Text style={styles.closeModalTitle}>CLOSE ACCOUNT</Text>

        <TouchableOpacity
          style={{ position: "absolute", right: 16 }}
          onPress={() => setShowCloseAccountModal(false)}
        >
          <Text style={styles.closeModalX}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Body */}
      <Text style={styles.closeModalMsg}>
        No Outstanding Dues?{"\n"}
        Do you want to close this account permanently?
      </Text>

      {/* Buttons */}
      <View style={styles.closeModalBtnRow}>
  {/* ✅ YES = ACCOUNT CLOSED COMPLETED */}
<TouchableOpacity
  style={styles.yesBtn}
  onPress={async () => {
    try {
      // ✅ CALL FLOW YES
      if (callSessionId) {
        await logCallAction({
          actionCode: "ACCOUNT_CLOSED_YES",
          actionLabel: "Account Closed Confirmed",
          metadata: { source: "CALL" }, // ✅ ADD HERE
        });

        await endCallSession();

        setShowCloseAccountModal(false);
        setShowThreeActionAfterCloseNo(false);

        resetVisitFlow();
        await exitToDPDList();
        return;
      }

      // ✅ VISIT FLOW YES
      if (visitSessionId) {
        await logVisitAction({
          actionCode: "ACCOUNT_CLOSED_YES",
          actionLabel: "Account Closed Confirmed",
          metadata: { source: "VISIT" }, // ✅ ADD HERE
        });

        await endVisitSession();

        setShowCloseAccountModal(false);

        // ✅ IMPORTANT FIX (avoid duplicates)
        setVisitExitStage("NONE");

        // ✅ go to Back Options directly
        setNotMetStage("BACK_OPTIONS");
        return;
      }

      // ✅ fallback
      setShowCloseAccountModal(false);
    } catch (err) {
      console.log("Close YES error:", err?.message || err);
      Alert.alert("Error", "Failed to close account");
    }
  }}
>
  <Text style={styles.yesText}>YES</Text>
</TouchableOpacity>


        {/* ✅ NO = Continue Followup */}
        <TouchableOpacity
          style={styles.noBtn}
 onPress={async () => {
  try {
    // ✅ CALL FLOW NO → show 3 action buttons
    if (callSessionId) {
      await logCallAction({
        actionCode: "ACCOUNT_CLOSED_NO",
        actionLabel: "Account Not Closed - Continue Followup",
      });

      setShowCloseAccountModal(false);

      setNotReadyChoice(null);
      setSpokeChoice(null);
      setCallStage("SPOKE");

      setShowThreeActionAfterCloseNo(true);
      return;
    }

    // ✅ VISIT FLOW NO → go to EndActionBlock even if visitSessionId missing
    await logVisitAction({
      actionCode: "ACCOUNT_CLOSED_NO",
      actionLabel: "Account Not Closed - Continue Followup",
    });

    setShowCloseAccountModal(false);

    // ✅ FORCE VISIT FLOW TO END ACTION BLOCK SCREEN
    setVisitMeetStatus("NOT_MET");   // 🔥 important
    setNotMetStage("END");           // 🔥 important

  } catch (err) {
    console.log("Close NO error:", err?.message || err);
    Alert.alert("Error", "Failed to continue");
  }
}}

        >
          <Text style={styles.noText}>NO</Text>
        </TouchableOpacity>

      </View>
    </View>
  </View>
</Modal>



<Modal
  visible={showVisitModal}
  transparent
  animationType="fade"
  onRequestClose={resetVisitFlow}

>
<View
  style={styles.modalOverlay}
>
    {/* Dialog Card */}
 <TouchableOpacity
  activeOpacity={1}
  style={[
    styles.visitDialog,
    isVisitFullScreen && styles.fullScreenVisitDialog
  ]}
  onPress={() => {}}
>
      {/* Header */}
{/* ===== VISIT MODAL HEADER ===== */}
<View style={styles.modalHeaderRow}>

  {/* ⬅ BACK */}
  <TouchableOpacity
onPress={() => {
if (paymentStep === "CASH" || paymentStep === "CHEQUE") {
  setPaymentStep("METHOD");
}
else if (
  visitAction === "READY" &&
  paymentStep === "METHOD" &&
  paymentMode === null
) {
  // ⬅ BACK from Payment Options
  setVisitAction(null);
  setPaymentStep(null);
}


else if (flowStack.length > 0) {
  handleBack();
}
else {
  resetVisitFlow();
}
}}

  >
    <Ionicons name="arrow-back" size={22} color="#1e4fa1" />
  </TouchableOpacity>

  {/* ❌ CLOSE */}
  <TouchableOpacity onPress={resetVisitFlow}>
    <Ionicons name="close" size={22} color="#000" />
  </TouchableOpacity>

</View>


      {/* Body (EMPTY FOR NOW) */}
<View style={styles.visitDialogBody}>

{/* 🛑 STOP VISIT – PROFESSIONAL */}
{visitStage === "IDLE" && (
  <View style={styles.sectionCard}>

<View style={styles.statusHeaderRow}>
  <View style={styles.statusIconWrap}>
    <Ionicons name="location-outline" size={22} color="#1e4fa1" />
  </View>

  <View style={{ flex: 1 }}>
<Text style={styles.statusTitle}>
  {route?.params?.visitSource === "SCHEDULE"
    ? "Scheduled Visit"
    : "Unscheduled Visit"}
</Text>
<Text style={styles.statusSubtitle}>
  {route?.params?.visitSource === "SCHEDULE"
    ? "Scheduled - In Progress"
    : "Unscheduled - In Progress"}
</Text>
  </View>
</View>

    <Text style={styles.sectionSubText}>
   Stop the visit once you reach the customer location or decide to end the visit.
    </Text>

 <TouchableOpacity
  style={styles.stopCircleBtn}
onPress={async () => {
  await logVisitAction({
    actionCode: "VISIT_STOPPED",
    actionLabel: "Visit Stop Initiated",
  });

  pushStep();
  setVisitStage("STOP_CONFIRM");
}}

  activeOpacity={0.85}
>
  <Text style={styles.stopCircleText}>STOP</Text>
</TouchableOpacity>
  </View>
)}

{/* ❓ STOP CONFIRMATION – SIMPLE */}
{visitStage === "STOP_CONFIRM" && (
  <View style={styles.sectionCard}>

    <Text style={styles.sectionTitle}>
      Stop Visit?
    </Text>

    <Text style={styles.sectionSubText}>
      Are you at the customer’s location and want to stop this visit?
    </Text>

    <TouchableOpacity
      style={styles.primaryBtnFull}
      onPress={async () => {
        try {
          // 1️⃣ Capture stop location
          const stop = await captureStopLocation();
          if (!stop) return;

        // 2️⃣ Get visit SNo safely
let sno = currentVisitSNo;

if (!sno) {
  const storedSNo = await AsyncStorage.getItem(ACTIVE_VISIT_SNO_KEY);
  if (storedSNo) {
    sno = parseInt(storedSNo);
    setCurrentVisitSNo(sno);
  }
}

if (!sno) {
  Alert.alert("Error", "Visit session missing.");
  return;
}

          // 3️⃣ Send stop details to backend (NO distance calculation here)
          const res = await fetch(`${BASE_URL}/api/field-visit/stop`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sno: sno,
              stopLat: stop.latitude,
              stopLng: stop.longitude,
              stopAddress: stop.address,
            }),
          });

          const data = await res.json();

          if (!res.ok) {
            Alert.alert("❌ Stop Save Failed", data.message || "Unable to stop visit");
            return;
          }

          const distanceKm = data.distanceKm; // 👈 comes from backend Google API

          // 4️⃣ Log activity
          await logVisitAction({
            actionCode: "VISIT_STOP_CONFIRMED",
            actionLabel: "Visit Stop Confirmed",
            metadata: {
              sno: sno,
              stopLat: stop.latitude,
              stopLng: stop.longitude,
              stopAccuracy: stop.accuracy,
              stopAddress: stop.address,
              distanceKm: distanceKm,
            },
          });

   // ✅ END VISIT SESSION
await endVisitSession();

// ✅ CLEAR ACTIVE VISIT STORAGE
await AsyncStorage.removeItem(ACTIVE_VISIT_KEY);
await AsyncStorage.removeItem(VISIT_START_TIME_KEY);
await AsyncStorage.removeItem(ACTIVE_VISIT_SNO_KEY);
await AsyncStorage.removeItem(ACTIVE_VISIT_USER_KEY);

setVisitSessionId(null);

// 5️⃣ Success alert
Alert.alert(
  "✅ Visit Stopped",
  `Distance Travelled: ${distanceKm} km\n\n📍 ${stop.address}`
);
          // 6️⃣ Reset flow
          setFlowStack([]);
          resetVisitFlow();
          setShowVisitModal(true);
          setVisitStage("OUTCOME");

        } catch (error) {
          Alert.alert("❌ Error", "Failed to stop visit");
        }
      }}
    >
      <Text style={styles.primaryBtnText}>Yes, Stop</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.secondaryBtnFull}
      onPress={() => {
        setStopLocation(null);
        setStopAddress("");
        setVisitStage("IDLE");
      }}
    >
      <Text style={styles.secondaryBtnText}>Cancel</Text>
    </TouchableOpacity>

    {stopLocation && (
      <Text style={{ marginTop: 8, color: "#334155", fontSize: 13 }}>
        ✅ Stop Lat: {stopLocation.latitude}, Stop Lng: {stopLocation.longitude}
      </Text>
    )}

  </View>
)}

{/* 🧭 VISIT OUTCOME – ENHANCED */}
{visitStage === "OUTCOME" && visitMeetStatus === null && (
  <View style={styles.sectionCard}>

    {/* Header */}
    <View style={styles.sectionHeaderRow}>
      <Ionicons name="git-branch-outline" size={24} color="#1e4fa1" />
      <Text style={styles.sectionTitle}>Visit Outcome</Text>
    </View>

    <Text style={styles.sectionSubText}>
      Select what happened during this customer visit
    </Text>

    {/* ✅ VISITED */}
    <TouchableOpacity
      style={styles.outcomeCardEnhanced}
      activeOpacity={0.85}
onPress={async () => {
  await logVisitAction({
    actionCode: "VISIT_MET",
    actionLabel: "Customer Met During Visit",
  });

  pushStep();
  setVisitMeetStatus("MET");
}}
 >
      <View style={styles.outcomeIconCircle}>
        <Ionicons name="checkmark" size={22} color="#25c83eff" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.outcomeTitle}>Visited Customer</Text>
        <Text style={styles.outcomeSubText}>
          Customer was available and interaction happened
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
      />
    </TouchableOpacity>

    {/* ❌ NOT MET */}
    <TouchableOpacity
      style={styles.outcomeCardEnhanced}
      activeOpacity={0.85}
onPress={async () => {
  await logVisitAction({
    actionCode: "VISIT_NOT_MET",
    actionLabel: "Customer Not Met During Visit",
  });

  pushStep();
  setVisitMeetStatus("NOT_MET");
}}

    >
      <View style={styles.outcomeIconCircle}>
        <Ionicons name="close" size={22} color="#d33838ff" />
      </View>

      <View style={{ flex: 1 }}>
        <Text style={styles.outcomeTitle}>Did Not Meet Customer</Text>
        <Text style={styles.outcomeSubText}>
          Customer was unavailable or visit was unsuccessful
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
      />
    </TouchableOpacity>

  </View>
)}


{/* 🏦 VISITED CUSTOMER OPTIONS */}
{visitStage === "OUTCOME" &&
 visitMeetStatus === "MET" &&
 visitAction === null && (

  <View style={styles.visitOptionsContainer}>

    {/* Header */}
    <View style={styles.visitOptionsHeader}>
      <Text style={styles.visitOptionsTitle}>
        Select Visit Outcome
      </Text>
      <Text style={styles.visitOptionsSubText}>
        Choose the appropriate action based on your discussion with the customer
      </Text>
    </View>

    {/* READY TO PAY */}
    <TouchableOpacity
      style={styles.visitOptionBtn}
onPress={async () => {
  await logVisitAction({
    actionCode: "VISIT_READY_TO_PAY",
    actionLabel: "Customer Ready to Pay During Visit",
  });

  pushStep();
  setVisitAction("READY");
  // reset payment flow
  setPaymentMode(null);
  setPaymentStep("METHOD");
  setPayments([]);
}}
    >
      <View style={styles.optionLeft}>
        <Ionicons name="cash-outline" size={20} color="#1e4fa1" />
        <Text style={styles.visitOptionText}>Ready to Pay</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* NOT READY TO PAY */}
    <TouchableOpacity
      style={styles.visitOptionBtn}
onPress={async () => {
  await logVisitAction({
    actionCode: "VISIT_NOT_READY",
    actionLabel: "Customer Not Ready to Pay During Visit",
  });

  pushStep();
  resetNotReadyFlow();
  setVisitAction("NOT_READY");
}}


    >
      <View style={styles.optionLeft}>
        <Ionicons name="time-outline" size={20} color="#1e4fa1" />
        <Text style={styles.visitOptionText}>Not Ready to Pay</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* VISIT LATER */}
    <TouchableOpacity
      style={styles.visitOptionBtn}
onPress={async () => {
  await logVisitAction({
    actionCode: "VISIT_LATER_SELECTED",
    actionLabel: "Visit Follow-up Selected",
  });

  pushStep();
  setVisitAction("VISIT_LATER");
  setCalendarMode("VISIT");
}}


    >
      <View style={styles.optionLeft}>
        <Ionicons name="calendar-outline" size={20} color="#1e4fa1" />
        <Text style={styles.visitOptionText}>Need to Visit Later</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* CALL LATER */}
    <TouchableOpacity
      style={styles.visitOptionBtn}
onPress={async () => {
  await logVisitAction({
    actionCode: "CALL_LATER_SELECTED",
    actionLabel: "Call Follow-up Selected",
  });

  pushStep();
  setVisitAction("CALL_LATER");
  setCalendarMode("CALL");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="call-outline" size={20} color="#1e4fa1" />
        <Text style={styles.visitOptionText}>Need to Call Later</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* OTHERS */}
    <TouchableOpacity
      style={styles.visitOptionBtn}
onPress={async () => {
  await logVisitAction({
    actionCode: "VISIT_OTHERS",
    actionLabel: "Other Visit Outcome Selected",
  });

  pushStep();
  setVisitAction("OTHERS");
}}
 >
      <View style={styles.optionLeft}>
        <Ionicons name="ellipsis-horizontal" size={20} color="#1e4fa1" />
        <Text style={styles.visitOptionText}>Others</Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

  </View>
)}

{/* 💰 READY TO PAY */}
{visitStage === "OUTCOME" &&
 visitMeetStatus === "MET" &&
 visitAction === "READY" &&
 paymentStep === "METHOD" &&
 paymentMode === null && (


  <View style={styles.readyPayContainer}>

    {/* Header */}
    <View style={styles.readyPayHeader}>
      <Text style={styles.readyPayTitle}>Payment Options</Text>
      <Text style={styles.readyPaySubText}>
        Select how the customer will make the payment
      </Text>
    </View>

    {/* 🔗 ONLINE PAYMENT */}
    <TouchableOpacity
      style={styles.readyPayOption}
onPress={async () => {
  await logVisitAction({
    actionCode: "PAYMENT_ONLINE_SELECTED",
    actionLabel: "Online Payment Option Selected",
  });

  Alert.alert(
    "Online Payment",
    "Online payment link will be sent later."
  );
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="link-outline" size={20} color="#1e4fa1" />
        <View style={styles.readyPayTextWrap}>
          <Text style={styles.readyPayOptionTitle}>
            Send Online Payment Link
          </Text>
          <Text style={styles.readyPayOptionSub}>
            Customer will pay using UPI / NetBanking
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

    {/* 💵 OFFLINE PAYMENT */}
    <TouchableOpacity
      style={styles.readyPayOption}
onPress={async () => {
  await logVisitAction({
    actionCode: "PAYMENT_OFFLINE_SELECTED",
    actionLabel: "Offline Payment Option Selected",
  });

  pushStep();
  setFinalizeVisit(false);
  setPaymentMode("SELECT");
  setPaymentStep("METHOD");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="cash-outline" size={20} color="#1e4fa1" />
        <View style={styles.readyPayTextWrap}>
          <Text style={styles.readyPayOptionTitle}>
            Collect Offline Payment
          </Text>
          <Text style={styles.readyPayOptionSub}>
            Cash or cheque collected during visit
          </Text>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
    </TouchableOpacity>

  </View>
)}

{/* 💳 OFFLINE PAYMENT – MODE SELECTION */}
{visitStage === "OUTCOME" &&
 visitMeetStatus === "MET" &&
 visitAction === "READY" &&
 paymentMode === "SELECT" &&
paymentStep === "METHOD" && (

  <View style={styles.paymentModeContainer}>

    {/* Header */}
    <View style={styles.paymentHeader}>
      <Text style={styles.paymentTitle}>
        Offline Payment Collection
      </Text>
      <Text style={styles.paymentSubText}>
        Select the payment mode used by the customer
      </Text>
    </View>

    {/* 💵 Cash */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={async () => {
  await logVisitAction({
    actionCode: "PAYMENT_MODE_CASH",
    actionLabel: "Cash Payment Mode Selected",
  });

  pushStep();
  setPaymentStep("CASH");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="cash-outline" size={20} color="#1e4fa1" />
        <Text style={styles.optionText}>Cash</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
        style={styles.optionChevron}
      />
    </TouchableOpacity>

    {/* 🧾 Cheque */}
    <TouchableOpacity
      style={styles.optionRowAligned}
onPress={async () => {
  await logVisitAction({
    actionCode: "PAYMENT_MODE_CHEQUE",
    actionLabel: "Cheque Payment Mode Selected",
  });

  pushStep();
  setPaymentStep("CHEQUE");
}}

    >
      <View style={styles.optionLeft}>
        <Ionicons name="document-text-outline" size={20} color="#1e4fa1" />
        <Text style={styles.optionText}>Cheque</Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color="#94a3b8"
        style={styles.optionChevron}
      />
    </TouchableOpacity>

  </View>
)}

{/* 💵 CASH PAYMENT ENTRY */}
{visitStage === "OUTCOME" &&
 visitMeetStatus === "MET" &&
 visitAction === "READY" &&
 paymentStep === "CASH" && (

  <View style={styles.cashEntryContainer}>

    {/* Header */}
    <View style={styles.paymentHeader}>
      <Text style={styles.paymentTitle}>
        Cash Payment Details
      </Text>
      <Text style={styles.paymentSubText}>
        Enter the amount collected from the customer
      </Text>
    </View>

    {/* Amount Input */}
    <View style={styles.cashInputWrap}>
      <Text style={styles.cashCurrency}>₹</Text>
      <TextInput
        style={styles.cashInput}
        placeholder="Amount"
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        value={cashAmount}
        onChangeText={setCashAmount}
      />
    </View>

    {/* Confirm */}
    <TouchableOpacity
      style={[
        styles.confirmCashBtn,
        !cashAmount && { opacity: 0.5 },
      ]}
      disabled={!cashAmount}
onPress={async () => {
  await logVisitAction({
    actionCode: "PAYMENT_CASH_COLLECTED",
    actionLabel: "Cash Amount Collected",
    metadata: {
      amount: cashAmount,
    },
  });

  setPayments(prev => [
    ...prev,
    {
      type: "CASH",
      amount: cashAmount,
    },
  ]);

  setCashAmount("");
  setPaymentMode("SUMMARY");
  setPaymentStep(null);
}}

    >
      <Text style={styles.confirmCashText}>
        Confirm Cash Collection
      </Text>
    </TouchableOpacity>

  </View>
)}
{/* 🧾 CHEQUE PAYMENT ENTRY */}
{visitStage === "OUTCOME" &&
 visitMeetStatus === "MET" &&
 visitAction === "READY" &&
 paymentStep === "CHEQUE" && (

  <View style={styles.chequeEntryContainer}>

    {/* Header */}
    <View style={styles.paymentHeader}>
      <Text style={styles.paymentTitle}>
        Cheque Payment Details
      </Text>
      <Text style={styles.paymentSubText}>
        Enter cheque information collected from the customer
      </Text>
    </View>

    {/* Cheque Number */}
    <TextInput
      style={styles.inputField}
      placeholder="Cheque Number"
      placeholderTextColor="#94a3b8"
      keyboardType="numeric"
      value={chequeNumber}
      onChangeText={setChequeNumber}
    />

    {/* Cheque Date */}
    <TextInput
      style={styles.inputField}
      placeholder="Cheque Date (DD-MM-YYYY)"
      placeholderTextColor="#94a3b8"
      value={chequeDate}
      onChangeText={setChequeDate}
    />

    {/* Bank Name */}
    <TextInput
      style={styles.inputField}
      placeholder="Bank Name"
      placeholderTextColor="#94a3b8"
      value={chequeBank}
      onChangeText={setChequeBank}
    />

    {/* IFSC */}
    <TextInput
      style={styles.inputField}
      placeholder="IFSC Code"
      placeholderTextColor="#94a3b8"
      autoCapitalize="characters"
      value={chequeIFSC}
      onChangeText={setChequeIFSC}
    />

    {/* Amount */}
    <View style={styles.cashInputWrap}>
      <Text style={styles.cashCurrency}>₹</Text>
      <TextInput
        style={styles.cashInput}
        placeholder="Amount"
        placeholderTextColor="#94a3b8"
        keyboardType="numeric"
        value={chequeAmount}
        onChangeText={setChequeAmount}
      />
    </View>

    {/* Confirm */}
    <TouchableOpacity
      style={[
        styles.confirmCashBtn,
        !(chequeNumber && chequeDate && chequeBank && chequeIFSC && chequeAmount) && { opacity: 0.5 },
      ]}
      disabled={!(chequeNumber && chequeDate && chequeBank && chequeIFSC && chequeAmount)}
onPress={async () => {
  await logVisitAction({
    actionCode: "PAYMENT_CHEQUE_COLLECTED",
    actionLabel: "Cheque Collected",
    metadata: {
      amount: chequeAmount,
      chequeNumber,
      chequeDate,
      chequeBank,
      chequeIFSC,
    },
  });

  setPayments(prev => [
    ...prev,
    {
      type: "CHEQUE",
      amount: chequeAmount,
      details: {
        chequeNumber,
        chequeDate,
        chequeBank,
        chequeIFSC,
      },
    },
  ]);

  setChequeNumber("");
  setChequeDate("");
  setChequeBank("");
  setChequeIFSC("");
  setChequeAmount("");
  setPaymentMode("SUMMARY");
  setPaymentStep(null);
}}

    >
      <Text style={styles.confirmCashText}>
        Confirm Cheque Collection
      </Text>
    </TouchableOpacity>

  </View>
)}
{/* 📄 PAYMENT SUMMARY & LOOP */}
{visitStage === "OUTCOME" &&
 visitMeetStatus === "MET" &&
 visitAction === "READY" &&
 paymentMode === "SUMMARY" &&
 !finalizeVisit &&
 visitExitStage === "NONE" && (



  <View style={styles.paymentSummaryContainer}>

    {/* Header */}
    <View style={styles.paymentHeader}>
      <Text style={styles.paymentTitle}>
        Payments Collected
      </Text>
      <Text style={styles.paymentSubText}>
        Review payments or add another entry
      </Text>
    </View>

    {/* Payment List */}
    {payments.map((p, index) => (
      <View key={index} style={styles.paymentRow}>
        <Text style={styles.paymentRowText}>
          {p.type} – ₹{p.amount}
        </Text>
      </View>
    ))}

    {/* Actions */}
<TouchableOpacity
  style={styles.addAnotherBtn}
onPress={async () => {
  await logVisitAction({
    actionCode: "PAYMENT_ADD_ANOTHER",
    actionLabel: "User Chose to Add Another Payment",
  });

  setPaymentMode("SELECT");
  setPaymentStep("METHOD");
}}

>

      <Ionicons name="add-circle-outline" size={18} color="#1e4fa1" />
      <Text style={styles.addAnotherText}>
        Add Another Payment
      </Text>
    </TouchableOpacity>

<TouchableOpacity
  style={styles.finishPaymentBtn}
onPress={async () => {
  await logVisitAction({
    actionCode: "PAYMENT_COLLECTION_FINISHED",
    actionLabel: "Payment Collection Finished",
    metadata: {
      totalPayments: payments.length,
      totalAmount: payments.reduce(
        (sum, p) => sum + Number(p.amount),
        0
      ),
    },
  });

setFinalizeVisit(true);
setCollectionResult(null);
setShowPostCollectionActions(false);
setShowFinalExitOptions(false);
}}
>
      <Text style={styles.finishPaymentText}>
        Done with Collection
      </Text>
    </TouchableOpacity>

  </View>
)}
{visitStage === "OUTCOME" &&
 visitMeetStatus === "MET" &&
 visitAction === "READY" &&
 paymentMode === "SUMMARY" &&
 finalizeVisit &&
 collectionResult === null && (

  <View style={styles.sectionCard}>
    <Text style={styles.sectionTitle}>Payment Status</Text>
    <Text style={styles.sectionSubText}>
      Select if full or partial payment collected
    </Text>

    <TouchableOpacity
      style={styles.optionRowAligned}
      onPress={async () => {
        await logVisitAction({
          actionCode: "PAYMENT_RESULT_FULL",
          actionLabel: "Full Amount Paid",
        });

 pushStep();
setCollectionResult("FULL");

      }}
    >
      <Text style={styles.optionText}>Full Amount Paid</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.optionRowAligned}
      onPress={async () => {
        await logVisitAction({
          actionCode: "PAYMENT_RESULT_PARTIAL",
          actionLabel: "Partial Amount Paid",
        });
pushStep();
setCollectionResult("PARTIAL");
      }}
    >
      <Text style={styles.optionText}>Partial Amount Paid</Text>
    </TouchableOpacity>
  </View>
)}



{/* ✅ FINALIZE VISIT */}
{visitStage === "OUTCOME" &&
 visitMeetStatus === "MET" &&
 visitAction === "READY" &&
 paymentMode === "SUMMARY" &&
 finalizeVisit &&
 collectionResult !== null &&
 visitExitStage === "NONE" && (

  <View style={styles.finalizeContainer}>

    {/* Header */}
    <View style={styles.finalizeHeader}>
      <Text style={styles.finalizeTitle}>
        Finalize Visit
      </Text>
      <Text style={styles.finalizeSubText}>
        Please review and confirm visit completion
      </Text>
    </View>

    {/* Summary */}
    <View style={styles.finalizeSummaryBox}>
      <Text style={styles.finalizeSummaryTitle}>
        Payments Collected
      </Text>

      {payments.length === 0 ? (
        <Text style={styles.finalizeSummaryText}>
          No payments collected
        </Text>
      ) : (
        payments.map((p, index) => (
          <Text key={index} style={styles.finalizeSummaryText}>
            {p.type} – ₹{p.amount}
          </Text>
        ))
      )}
    </View>

    {/* Confirm */}
    <TouchableOpacity
      style={styles.finalizeConfirmBtn}
onPress={async () => {
  await logVisitAction({
    actionCode: "VISIT_PAYMENT_COLLECTED",
    actionLabel: "Payment Collected During Visit",
    metadata: { payments, collectionResult },
  });

  await logVisitAction({
    actionCode: "FINALIZE_VISIT_CLICKED",
    actionLabel: "Finalize Visit - Complete Visit Clicked",
  });

  pushStep();

  // ✅ HIDE Finalize screen
  setFinalizeVisit(false);

  // ✅ OPEN Back to List / Complete screen
setVisitExitStage("POST_COLLECTION");
}}
    >
      <Text style={styles.finalizeConfirmText}>
        Complete Visit
      </Text>
    </TouchableOpacity>

  </View>
)}
{visitExitStage === "POST_COLLECTION" && (
  <EndActionBlock
    onBack={() => {
      // ✅ Do NOT navigate back
      // ✅ Just go to final screen
      setVisitExitStage("FINAL_EXIT");
    }}

    onComplete={async () => {
      // ✅ only Complete should mark as completed
      await logVisitAction({
        actionCode: "VISIT_COMPLETED",
        actionLabel: "Unscheduled Visit Completed",
        metadata: { collectionResult },
      });

      // ✅ if you want you can end session here OR after user clicks dashboard
      await endVisitSession();

      // ✅ move to final screen (same as back)
      setVisitExitStage("FINAL_EXIT");
    }}
  />
)}

{visitExitStage === "FINAL_EXIT" && (
  <BackOptionsBlock navigation={navigation} />
)}



{visitAction === "NOT_READY" &&
 notReadyStage === "SELECT" && (

  <View style={styles.sectionCard}>

    <Text style={styles.sectionTitle}>Not Ready to Pay</Text>
    <Text style={styles.sectionSubText}>
      Select the reason provided by the customer
    </Text>

    {[
      ["LACK_OF_FUNDS", "Lack of Funds", "wallet-outline"],
      ["ALREADY_PAID", "Payment Already Done", "checkmark-done-outline"],
      ["NOT_TAKEN_LOAN", "Not Taken Loan", "close-circle-outline"],
      ["LOAN_BY_RELATIVE", "Loan Taken by Relative", "people-outline"],
      ["LUMPSUM", "Will Pay Lump Sum", "calendar-outline"],
      ["OTHERS", "Others", "ellipsis-horizontal"],
    ].map(([key, label, icon]) => (
      <TouchableOpacity
        key={key}
        style={styles.optionRowAligned}
onPress={async () => {
  await logVisitAction({
    actionCode: "NOT_READY_REASON_SELECTED",
    actionLabel: "Not Ready to Pay – Reason Selected",
    reasonCode: key,
  });

  pushStep();                 // keep navigation
  setNotReadyReason(key);

  if (["LOAN_BY_RELATIVE", "ALREADY_PAID", "OTHERS"].includes(key)) {
    setNotReadyStage("CAPTURE");
  } else {
    setNotReadyStage("END");
  }
}}
      >
        {/* Left side: icon + text */}
        <View style={styles.optionLeft}>
          <Ionicons name={icon} size={20} color="#1e4fa1" />
          <Text style={styles.optionText}>{label}</Text>
        </View>

        {/* Right chevron */}
        <Ionicons
          name="chevron-forward"
          size={18}
          color="#94a3b8"
          style={styles.optionChevron}
        />
      </TouchableOpacity>
    ))}

  </View>
)}
{notReadyStage === "CAPTURE" &&
 notReadyReason === "LOAN_BY_RELATIVE" && (

  <View style={styles.sectionCard}>

    <TextInput
      style={styles.inputField}
      placeholder="Please specify name"
      value={relativeName}
      onChangeText={setRelativeName}
    />

    <TextInput
      style={styles.inputField}
      placeholder="Please specify contact"
      keyboardType="phone-pad"
      value={relativeContact}
      onChangeText={setRelativeContact}
    />

<TouchableOpacity
  style={styles.primaryBtnFull}
onPress={async () => {
  await logVisitAction({
    actionCode: "NOT_READY_LOAN_BY_RELATIVE_DETAILS",
    actionLabel: "Loan Taken by Relative – Details Captured",
    metadata: {
      relativeName,
      relativeContact,
    },
  });

  pushStep();               // keep navigation
  setNotReadyStage("END");
}}
>
        <Text style={styles.primaryBtnText}>Proceed</Text>
    </TouchableOpacity>

  </View>
)}
{notReadyStage === "CAPTURE" &&
 notReadyReason === "OTHERS" && (

  <ReasonSubmitBlock
    reason={notReadyTextReason}
    setReason={setNotReadyTextReason}
onSubmit={async () => {
  await logVisitAction({
    actionCode: "NOT_READY_OTHER_REASON",
    actionLabel: "Not Ready – Other Reason Submitted",
    noteText: notReadyTextReason,
  });

  setNotReadyStage("END");
}}
  />
)}

{notReadyStage === "CAPTURE" &&
 notReadyReason === "ALREADY_PAID" && (

  <View style={styles.sectionCard}>

    <TouchableOpacity
      style={styles.optionRow}
      onPress={() =>
        Alert.alert("Upload", "Receipt upload will be added later")
      }
    >
      <Ionicons name="cloud-upload-outline" size={20} color="#1e4fa1" />
      <Text style={styles.optionText}>Upload Receipt</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.optionRow}
onPress={async () => {
  await logVisitAction({
    actionCode: "NOT_READY_ALREADY_PAID_CONFIRMED",
    actionLabel: "Customer Confirmed Payment Already Made",
  });

  pushStep();
  setNotReadyStage("END");
}}

    >
      <Ionicons name="arrow-forward-outline" size={20} color="#1e4fa1" />
      <Text style={styles.optionText}>Skip & Proceed</Text>
    </TouchableOpacity>

  </View>
)}
{notReadyStage === "END" && (
  <EndActionBlock
    onBack={() => {
      // ✅ Important: Clear visitExitStage so BackOptions won't show twice
      setVisitExitStage("NONE");

      // ✅ go to back options
      resetNotReadyFlow();
      setVisitAction("BACK_OPTIONS");
    }}

    onComplete={async () => {
      try {
        // ✅ 1) Summary log
        await logVisitAction({
          actionCode: "NOT_READY_VISIT_SUMMARY",
          actionLabel: "Visit Closed – Customer Not Ready to Pay",
          reasonCode: notReadyReason,
        });

        // ✅ 2) Completion log (THIS sets CompleteFlag)
        await logVisitAction({
          actionCode: "VISIT_COMPLETED",
          actionLabel: "Unscheduled Visit Completed",
          metadata: {
            notReadyReason: notReadyReason,
          },
        });

        // ✅ 3) End visit session
        await endVisitSession();

        // ✅ 4) FIX: Clear visitExitStage so BackOptions won't show twice
        setVisitExitStage("NONE");

        // ✅ 5) Show BackOptions (do not go Home)
        resetNotReadyFlow();
        setVisitAction("BACK_OPTIONS");
      } catch (err) {
        console.log("NOT READY complete error:", err?.message || err);
        Alert.alert("Error", "Failed to complete visit");
      }
    }}
  />
)}
{notReadyStage === "BACK_OPTIONS" && (
  <BackOptionsBlock navigation={navigation} />
)}
{/* 📅 VISIT / CALL LATER CALENDAR */}
{visitStage === "OUTCOME" &&
  visitMeetStatus === "MET" &&
  (visitAction === "VISIT_LATER" || visitAction === "CALL_LATER") &&
  calendarMode && (
    <View style={styles.scheduleCard}>
      <Calendar
        onDayPress={(day) => setSelectedDate(day.dateString)}
        markedDates={{
          [selectedDate]: {
            selected: true,
            selectedColor: "#1e88e5",
          },
        }}
      />

      <View style={styles.timeRow}>
        <TextInput
          style={styles.timeInput}
          value={hour}
          onChangeText={setHour}
        />
        <Text style={styles.colon}>:</Text>
        <TextInput
          style={styles.timeInput}
          value={minute}
          onChangeText={setMinute}
        />
        <TouchableOpacity
          style={styles.ampmBtn}
          onPress={() => setAmpm(ampm === "AM" ? "PM" : "AM")}
        >
          <Text style={styles.ampmText}>{ampm}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.updateBtn}
        onPress={async () => {
          try {
            // ✅ LOG schedule action (InProcess + Schedule Pending)
            await logVisitAction({
              actionCode: "VISIT_FOLLOWUP_SCHEDULED",
              actionLabel:
                visitAction === "VISIT_LATER"
                  ? "Visit Follow-up Scheduled"
                  : "Call Follow-up Scheduled",
              metadata: {
                type: visitAction === "VISIT_LATER" ? "VISIT" : "CALL",
                date: selectedDate,
                time: `${hour}:${minute} ${ampm}`,
              },
            });

            Alert.alert(
              "Scheduled",
              `${visitAction === "VISIT_LATER" ? "Visit" : "Call"} scheduled`
            );

            // ✅ close calendar state
            setCalendarMode(null);

            // ✅ IMPORTANT: prevent duplicate BackOptions
            setVisitExitStage("NONE");

            // ✅ DIRECTLY open BackOptionsBlock (NO EndActionBlock)
            setVisitAction("BACK_OPTIONS");
          } catch (err) {
            console.log("Schedule update error:", err?.message || err);
            Alert.alert("Error", "Failed to schedule follow-up");
          }
        }}
      >
        <Text style={styles.updateText}>UPDATE SCHEDULE</Text>
      </TouchableOpacity>
    </View>
  )}


{/* ✍️ OTHERS REASON */}
{visitStage === "OUTCOME" &&
  visitMeetStatus === "MET" &&
  visitAction === "OTHERS" && (
    <ReasonSubmitBlock
      reason={visitReason}
      setReason={setVisitReason}
      onSubmit={async () => {
        await logVisitAction({
          actionCode: "VISIT_OTHERS_REASON",
          actionLabel: "Other Visit Reason Submitted",
          noteText: visitReason,
        });

        // ✅ Go to EndActionBlock
        setVisitAction("END_ACTION");
      }}
    />
  )}


{/* ✅ END ACTION ONLY FOR OTHERS (or flows where you want EndActionBlock) */}
{visitAction === "END_ACTION" && (
  <EndActionBlock
    onBack={() => {
      // ✅ IMPORTANT: prevent duplicate BackOptions
      setVisitExitStage("NONE");

      // ✅ Back to List -> show BackOptions
      setVisitAction("BACK_OPTIONS");
    }}

    onComplete={async () => {
      try {
        // ✅ completion log (this sets CompleteFlag)
        await logVisitAction({
          actionCode: "VISIT_COMPLETED",
          actionLabel: "Unscheduled Visit Completed",
        });

        // ✅ end session
        await endVisitSession();
        // ✅ IMPORTANT: prevent duplicate BackOptions
        setVisitExitStage("NONE");

        // ✅ show BackOptions (DO NOT reset full flow here)
        setVisitAction("BACK_OPTIONS");
      } catch (err) {
        console.log("END_ACTION complete error:", err?.message || err);
        Alert.alert("Error", "Failed to complete visit");
      }
    }}
  />
)}


{/* ✅ BACK OPTIONS SCREEN */}
{visitAction === "BACK_OPTIONS" && (
  <BackOptionsBlock navigation={navigation} />
)}
{visitMeetStatus === "NOT_MET" && notMetStage === "SELECT" && (
  <View style={styles.sectionCard}>

    <Text style={styles.sectionTitle}>Did Not Meet Customer</Text>
    <Text style={styles.sectionSubText}>
      Select the reason for unsuccessful visit
    </Text>

    {[
      ["NOT_AVAILABLE", "Customer Not Available", "person-outline"],
      ["LATE", "Late for Visit", "time-outline"],
      ["CLOSE_VISIT", "Need to Close Visit", "lock-closed-outline"],
      ["OTHERS", "Others", "ellipsis-horizontal"],
    ].map(([key, label, icon]) => (
      <TouchableOpacity
        key={key}
        style={styles.optionRowAligned}
        onPress={async () => {
          await logVisitAction({
            actionCode: "VISIT_NOT_MET_REASON",
            actionLabel: "Not Met Reason Selected",
            reasonCode: key,
          });

          setNotMetReason(key);

          if (key === "NOT_AVAILABLE") {
            pushStep();
            setNotMetStage("END");
          } else if (key === "LATE" || key === "OTHERS") {
            pushStep();
            setNotMetStage("CAPTURE");
          } else {
            // CLOSE_VISIT
            pushStep();
            setNotMetStage("CLOSE_OPTIONS");
          }
        }}
      >
        <View style={styles.optionLeft}>
          <Ionicons name={icon} size={20} color="#1e4fa1" />
          <Text style={styles.optionText}>{label}</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </TouchableOpacity>
    ))}

  </View>
)}
{visitMeetStatus === "NOT_MET" && notMetStage === "CLOSE_OPTIONS" && (
  <View style={styles.sectionCard}>

    <Text style={styles.sectionTitle}>Close Visit Reason</Text>

    {[
      ["NO_DUES", "No Outstanding Balance", "checkmark-circle-outline"],
      ["RELOCATED", "Customer Relocated", "location-outline"],
      ["PAID", "Payment Already Made", "card-outline"],
      ["OTHERS", "Others", "ellipsis-horizontal"],
    ].map(([key, label, icon]) => (
      <TouchableOpacity
        key={key}
        style={styles.optionRowAligned}
        onPress={async () => {

          // ✅ Log close reason selected
          await logVisitAction({
            actionCode: "VISIT_CLOSE_REASON_SELECTED",
            actionLabel: "Close Visit Reason Selected",
            reasonCode: key,
          });

          setNotMetReason(key);

          if (key === "PAID") {
            pushStep();
            setNotMetStage("PAID");
          } else if (key === "OTHERS") {
            pushStep();
            setNotMetStage("CAPTURE");
          } else {
            // ✅ NO_DUES / RELOCATED -> open modal
            pushStep();
setCloseAccountSource("VISIT");
setShowCloseAccountModal(true);
          }
        }}
      >
        <View style={styles.optionLeft}>
          <Ionicons name={icon} size={20} color="#1e4fa1" />
          <Text style={styles.optionText}>{label}</Text>
        </View>

        <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
      </TouchableOpacity>
    ))}

  </View>
)}
{visitMeetStatus === "NOT_MET" && notMetStage === "CAPTURE" && (
  <ReasonSubmitBlock
    reason={notMetTextReason}
    setReason={setNotMetTextReason}
    onSubmit={async () => {
      await logVisitAction({
        actionCode: "VISIT_NOT_MET_REASON_TEXT",
        actionLabel: "Not Met Reason Captured",
        noteText: notMetTextReason,
      });

      pushStep();
      setNotMetStage("END");
    }}
  />
)}
{visitMeetStatus === "NOT_MET" && notMetStage === "PAID" && (
  <View style={styles.sectionCard}>

    <Text style={styles.sectionTitle}>Payment Already Made</Text>
    <Text style={styles.sectionSubText}>Choose how to proceed</Text>

    <TouchableOpacity
      style={styles.optionRow}
      onPress={async () => {
        await logVisitAction({
          actionCode: "VISIT_PAID_UPLOAD_CLICKED",
          actionLabel: "Upload Receipt Clicked (Visit Not Met)",
        });

        Alert.alert("Upload", "Receipt upload will be added later");
      }}
    >
      <Ionicons name="cloud-upload-outline" size={20} color="#1e4fa1" />
      <Text style={styles.optionText}>Upload Receipt</Text>
    </TouchableOpacity>

    <TouchableOpacity
      style={styles.optionRow}
      onPress={async () => {
        await logVisitAction({
          actionCode: "VISIT_PAID_CONFIRMED",
          actionLabel: "Payment Already Made Confirmed",
        });

        pushStep();
        setNotMetStage("END");
      }}
    >
      <Ionicons name="arrow-forward-outline" size={20} color="#1e4fa1" />
      <Text style={styles.optionText}>Skip & Proceed</Text>
    </TouchableOpacity>

  </View>
)}
{visitMeetStatus === "NOT_MET" && notMetStage === "END" && (
  <EndActionBlock
    onBack={() => {
      // ✅ prevent duplicates
      setVisitExitStage("NONE");

      // ✅ go to back options
      setNotMetStage("BACK_OPTIONS");
    }}

    onComplete={async () => {
      try {
        // ✅ Completion log = sets CompleteFlag
        await logVisitAction({
          actionCode: "VISIT_COMPLETED",
          actionLabel: "Unscheduled Visit Completed",
          metadata: {
            notMetReason,
          },
        });

        // ✅ end visit session
        await endVisitSession();

        // ✅ prevent duplicate backoptions
        setVisitExitStage("NONE");

        // ✅ show back options (NOT home)
        setNotMetStage("BACK_OPTIONS");
      } catch (err) {
        console.log("NOT_MET complete error:", err?.message || err);
        Alert.alert("Error", "Failed to complete visit");
      }
    }}
  />
)}
{visitMeetStatus === "NOT_MET" && notMetStage === "BACK_OPTIONS" && (
  <BackOptionsBlock navigation={navigation} />
)}


</View>
    </TouchableOpacity>
</View>
</Modal>

      {/* ===== CALL MODAL ===== */}
      <Modal visible={showCallModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.callModal}>

            <Text style={styles.callTitle}>Call Customer</Text>
            <Text style={styles.callSub}>Select a number</Text>

            <TouchableOpacity
              style={styles.callOption}
onPress={async () => {
  try {
    const phone = String(account?.mobileNumber || "").trim();

    if (!phone) {
      Alert.alert("No Number", "Primary number not available");
      return;
    }

    // ✅ very important: set flag BEFORE opening dial pad
    setOpenCallModalAfterDial(true);

    // ✅ log dialed
    await logDialedNumber(phone);

    // ✅ open dial pad
    Linking.openURL(`tel:${phone}`);

    // ✅ close selection modal only
    setShowCallModal(false);

  } catch (e) {
    console.log("Primary dial error:", e);
    Alert.alert("Error", "Unable to dial");
  }
}}



            >
              <Ionicons name="call" size={18} color="#1e4fa1" />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.callLabel}>Primary</Text>
                <Text style={styles.callNumber}>{account.mobileNumber}</Text>
              </View>
            </TouchableOpacity>

            {altNumber ? (
              <TouchableOpacity
                style={styles.callOption}
onPress={async () => {
  try {
    const phone = String(altNumber || "").trim();

    if (!phone) {
      Alert.alert("No Number", "Alternate number not available");
      return;
    }

    // ✅ set flag so modal opens after coming back
    setOpenCallModalAfterDial(true);

    // ✅ log dialed
    await logDialedNumber(phone);

    // ✅ open dial pad
    Linking.openURL(`tel:${phone}`);

    // ✅ close selection modal
    setShowCallModal(false);

  } catch (e) {
    console.log("Alternate dial error:", e);
    Alert.alert("Error", "Unable to dial");
  }
}}


              >
                <Ionicons name="call" size={18} color="#27ae60" />
                <View style={{ marginLeft: 10 }}>
                  <Text style={styles.callLabel}>Alternate</Text>
                  <Text style={styles.callNumber}>{altNumber}</Text>
                </View>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setShowCallModal(false)}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}
const DetailRow = ({ label, value, multiline }) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text
      style={[
        styles.value,
        multiline && { textAlign: "right", flex: 1 },
      ]}
    >
      {value}
    </Text>
  </View>
);
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:"#eef2f6"},
  center:{flex:1,justifyContent:"center",alignItems:"center"},
  header:{height:70,backgroundColor:"#1e4fa1",flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:12,paddingTop:20},
  headerTitle:{color:"#fff",fontSize:14,fontWeight:"600"},
  body:{padding:12},
  card:{backgroundColor:"#fff",borderRadius:6,padding:10,marginBottom:12,elevation:2},
  row:{flexDirection:"row",justifyContent:"space-between",paddingVertical:6,borderBottomWidth:0.5,borderBottomColor:"#eee"},
  label:{fontSize:13,color:"#333",width:"40%"},
  value:{fontSize:13,color:"#555",textAlign:"right"},
  captureBtn:{flexDirection:"row",backgroundColor:"#c0392b",paddingHorizontal:10,paddingVertical:4,borderRadius:4,alignItems:"center"},
  captureText:{color:"#fff",fontSize:12,marginRight:5},
googleBtn: {
  width: "100%",              // ✅ full width
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",    // ✅ text center
  paddingVertical: 12,         // ✅ good height
  borderRadius: 10,            // ✅ smooth rounded
  elevation: 3,                // ✅ Android shadow
  shadowColor: "#000",         // ✅ iOS shadow
  shadowOpacity: 0.15,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 2 },
},

googleText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "600",
},
mapMiniBtn: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#16a34a",
  paddingHorizontal: 10,
  paddingVertical: 6,
  borderRadius: 8,
},

mapMiniText: {
  color: "#fff",
  fontSize: 12,
  fontWeight: "600",
},

  altInput:{borderBottomWidth:1,borderColor:"#ccc",minWidth:120,textAlign:"right",padding:2},
  callBtn:{backgroundColor:"#1e4fa1",padding:14,borderRadius:4,alignItems:"center",flexDirection:"row",justifyContent:"center",marginTop:10},
  visitBtn:{backgroundColor:"#1e4fa1",padding:14,borderRadius:4,alignItems:"center",flexDirection:"row",justifyContent:"center"},
  btnText:{color:"#fff",fontWeight:"600",marginLeft:6},
  modalOverlay:{flex:1,backgroundColor:"rgba(0,0,0,0.4)",justifyContent:"center",alignItems:"center"},
  callModal:{width:"85%",backgroundColor:"#fff",borderRadius:10,padding:16},
  callTitle:{fontSize:16,fontWeight:"700",marginBottom:4,color:"#1e4fa1"},
  callSub:{fontSize:13,color:"#666",marginBottom:12},
  callOption:{flexDirection:"row",alignItems:"center",paddingVertical:12,borderBottomWidth:1,borderBottomColor:"#eee"},
  callLabel:{fontSize:12,color:"#666"},
  callNumber:{fontSize:15,fontWeight:"600",color:"#000"},
  cancelBtn:{marginTop:12,alignItems:"center"},
  cancelText:{color:"#c0392b",fontWeight:"600"},
  lumpSumBtn:{backgroundColor:"#18a287ff"},
alreadyPaidBtn:{backgroundColor:"#d373daff"},
foNotVisitedBtn:{backgroundColor:"#106caaff"},
notTakenLoanBtn:{backgroundColor:"#bcaf21ff"},
relativeLoanBtn:{backgroundColor:"#d35400"},
othersBtn:{backgroundColor:"#7f8c8d"},

  choiceContainer:{marginTop:20,paddingHorizontal:16},
choiceBtn:{width:"100%",paddingVertical:16,borderRadius:12,marginBottom:12,alignItems:"center",elevation:3},
  choiceText:{color:"#fff",fontSize:16,fontWeight:"700",textAlign:"center",width:"100%"},

  ready:{backgroundColor:"#2ecc71"},
  notReady:{backgroundColor:"#e74c3c"},
  callLater:{backgroundColor:"#f1c40f"},
  others:{backgroundColor:"#7f8c8d"},

  scheduleCard:{backgroundColor:"#fff",padding:15,borderRadius:10,marginTop:15},
  updateBtn:{backgroundColor:"#27ae60",padding:14,borderRadius:6,alignItems:"center",marginTop:10},
  updateText:{color:"#fff",fontWeight:"600"},

  timeRow:{flexDirection:"row",alignItems:"center",justifyContent:"center",marginTop:15},
  timeInput:{borderBottomWidth:1,borderColor:"#999",width:50,textAlign:"center",fontSize:18,marginHorizontal:5},
  colon:{fontSize:20,marginHorizontal:5},
  ampmBtn:{marginLeft:10,paddingHorizontal:12,paddingVertical:6,borderRadius:6,backgroundColor:"#1e88e5"},
  ampmText:{color:"#fff",fontWeight:"600"},

  subChoiceContainer:{marginTop:20,paddingHorizontal:10},
  submitBtn:{backgroundColor:"#27ae60"},
  scheduleCallBtn:{backgroundColor:"#2980b9"},
  scheduleVisitBtn:{backgroundColor:"#f39c12"},

  uploadBtn:{backgroundColor:"#16a085",borderRadius:12,paddingVertical:16,elevation:4},
  skipBtn:{backgroundColor:"#c0392b",borderRadius:12,paddingVertical:16,elevation:4},

  closeModalCard:{width:"85%",backgroundColor:"#fff",borderRadius:10,overflow:"hidden"},
  closeModalHeader:{backgroundColor:"#1e88e5",paddingVertical:12,paddingHorizontal:16,alignItems:"center"},
  closeModalTitle:{color:"#fff",fontWeight:"700",fontSize:15},
  closeModalMsg:{textAlign:"center",paddingVertical:20,paddingHorizontal:16,fontSize:15,color:"#333",lineHeight:22},
  closeModalBtnRow:{flexDirection:"row",justifyContent:"space-around",paddingBottom:20},
  yesBtn:{backgroundColor:"#2e7d32",paddingHorizontal:30,paddingVertical:10,borderRadius:6},
  noBtn:{backgroundColor:"#c62828",paddingHorizontal:30,paddingVertical:10,borderRadius:6},
  yesText:{color:"#fff",fontWeight:"bold"},
  noText:{color:"#fff",fontWeight:"bold"},

  underlineInput:{borderBottomWidth:1,borderColor:"#999",paddingVertical:10,marginBottom:16},
  underlineTextInput:{borderBottomWidth:1,borderColor:"#999",paddingVertical:8,fontSize:15,color:"#333",marginBottom:20},

  foCaptureBtn:{width:"100%",backgroundColor:"#1e88e5",paddingVertical:16,borderRadius:12,alignItems:"center",marginBottom:12,elevation:3},
  foSkipBtn:{width:"100%",backgroundColor:"#c0392b",paddingVertical:16,borderRadius:12,alignItems:"center",marginBottom:12,elevation:3},

  reasonContainer:{marginTop:20,padding:15,backgroundColor:"#f9f9f9",borderRadius:10},
  reasonInput:{borderBottomWidth:1,borderBottomColor:"#999",fontSize:16,paddingVertical:8,marginBottom:20},

  busyBtn:{backgroundColor:"#f39c12"},
  notReachableBtn:{backgroundColor:"#7f8c8d"},
  invalidBtn:{backgroundColor:"#c0392b"},
  physicalVisitBtn:{backgroundColor:"#8e44ad"},
  scheduleBlue:{backgroundColor:"#2980b9"},
  scheduleOrange:{backgroundColor:"#e67e22"},
callFlowModal: {
  marginTop: 64,     // 👈 VERY IMPORTANT
  backgroundColor: "#fff",
  borderRadius: 16,
  maxHeight: "88%",
  paddingBottom: 16,
},
visitDialog: {
  width: "90%",
  backgroundColor: "#fff",
  borderRadius: 14,
  padding: 16,
  elevation: 10,
},

visitDialogHeader: {
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "center",
  borderBottomWidth: 1,
  borderBottomColor: "#eee",
  paddingBottom: 8,
  marginBottom: 12,
},

visitDialogTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1e4fa1",
},

visitDialogClose: {
  fontSize: 20,
  fontWeight: "600",
  color: "#333",
},

visitDialogBody: {
  minHeight: 120,
  paddingHorizontal: 16,   // ✅ space from left & right
  justifyContent: "center",
},

stopCircle: {
  width: 140,
  height: 140,
  borderRadius: 70,
  backgroundColor: "#c0392b", // SOS red
  justifyContent: "center",
  alignItems: "center",
  elevation: 8,
  shadowColor: "#000",
  shadowOpacity: 0.25,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 4 },
},

stopCircleMainText: {
  color: "#fff",
  fontSize: 22,
  fontWeight: "800",
  letterSpacing: 1,
},

stopCircleSubText: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "600",
  marginTop: 2,
  letterSpacing: 1,
},
stopConfirmBox: {
  width: "100%",
  backgroundColor: "#fff",
  borderRadius: 12,
  overflow: "hidden",
  elevation: 6,
},

stopConfirmHeader: {
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: "#2464bfff", // danger red
  paddingVertical: 10,
  paddingHorizontal: 12,
},

stopConfirmHeaderText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "700",
  marginLeft: 8,
},

stopConfirmText: {
  textAlign: "center",
  fontSize: 15,
  color: "#333",
  fontWeight: "600",
  lineHeight: 22,
  paddingVertical: 18,
  paddingHorizontal: 12,
},

stopConfirmBtnRow: {
  flexDirection: "row",
  borderTopWidth: 1,
  borderTopColor: "#e0e0e0",
},

stopYesBtn: {
  flex: 1,
  backgroundColor: "#12bb1aff",
  paddingVertical: 14,
  alignItems: "center",
  borderBottomLeftRadius: 10,
  borderTopLeftRadius: 10, 
  borderBottomRightRadius: 10, 
  borderTopRightRadius: 10, 
},

stopNoBtn: {
  flex: 1,
  backgroundColor: "#db4747ff",
  paddingVertical: 14,
  alignItems: "center",
 borderBottomLeftRadius: 10,
  borderTopLeftRadius: 10, 
  borderBottomRightRadius: 10, 
  borderTopRightRadius: 10, 
},

stopYesText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
},

stopNoText: {
  color: "#fff",
  fontWeight: "700",
  fontSize: 15,
},
stopDivider: {
  width: 2,
  backgroundColor: "#ffffffcc", // visible on green & red
},
visitOutcomeContainer: {
  width: "100%",
},

visitOutcomeBtn: {
  width: "100%",
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 16,
  borderRadius: 12,
  marginBottom: 12,
  elevation: 3,
},

visitMetBtn: {
  backgroundColor: "#2e7d32", // green
},

visitNotMetBtn: {
  backgroundColor: "#c62828", // red
},

visitOutcomeText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "700",
  marginLeft: 8,
},
visitOptionsContainer: {
  width: "100%",
},
visitOptionBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  padding: 16,
  borderRadius: 14,
  backgroundColor: "#f8fafc",
  borderWidth: 1,
  borderColor: "#e2e8f0",
  marginTop: 12,
},
optionRowAligned: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingVertical: 14,
  paddingHorizontal: 14,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 12,
  marginTop: 12,
  backgroundColor: "#f9fafb",
},

optionLeft: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
  flex: 1, 
},

optionText: {
  fontSize: 15,
  fontWeight: "600",
  color: "#1f2937",
},

optionChevron: {
  marginLeft: 12,
},

visitOptionText: {
  marginLeft: 12,
  fontSize: 15,
  fontWeight: "600",
  color: "#0f172a",
},

visitOptionsHeader: {
  marginBottom: 12,
},

visitOptionsTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1e293b",
  marginBottom: 4,
},

visitOptionsSubText: {
  fontSize: 13,
  color: "#64748b",
  lineHeight: 18,
},
readyPayContainer: {
  width: "100%",
},

readyPayHeader: {
  marginBottom: 12,
},

readyPayTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1e293b",
  marginBottom: 4,
},

readyPaySubText: {
  fontSize: 13,
  color: "#64748b",
  lineHeight: 18,
},

readyPayOption: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  backgroundColor: "#f8fafc",
  borderRadius: 12,
  paddingVertical: 14,
  paddingHorizontal: 16,   // 🔥 THIS fixes edge hugging
  marginBottom: 12,
  borderWidth: 1,
  borderColor: "#e2e8f0",
},
optionRight: {
  paddingLeft: 8,          // 🔥 pulls chevron slightly inward
},

readyPayTextWrap: {
  marginLeft: 12,
  flex: 1,
},

readyPayOptionTitle: {
  fontSize: 15,
  fontWeight: "600",
  color: "#1e293b",
},
optionTitle: {
  fontSize: 15,
  fontWeight: "600",
  color: "#0f172a",
},
readyPayOptionSub: {
  fontSize: 12,
  color: "#64748b",
  marginTop: 2,
},
paymentModeContainer: {
  width: "100%",
},

paymentHeader: {
  marginBottom: 12,
},

paymentTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1e293b",
  marginBottom: 4,
},

paymentSubText: {
  fontSize: 13,
  color: "#64748b",
  lineHeight: 18,
},

paymentOption: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 10,
  backgroundColor: "#f8fafc",
  borderWidth: 1,
  borderColor: "#e2e8f0",
  marginBottom: 10,
},

paymentOptionText: {
  marginLeft: 12,
  fontSize: 15,
  fontWeight: "600",
  color: "#1e293b",
},
cashEntryContainer: {
  width: "100%",
},

cashInputWrap: {
  flexDirection: "row",
  alignItems: "center",
  borderWidth: 1,
  borderColor: "#e2e8f0",
  borderRadius: 10,
  paddingHorizontal: 12,
  backgroundColor: "#fff",
  marginBottom: 14,
},

cashCurrency: {
  fontSize: 18,
  fontWeight: "600",
  color: "#334155",
  marginRight: 6,
},

cashInput: {
  flex: 1,
  height: 44,
  fontSize: 16,
  color: "#1e293b",
},

confirmCashBtn: {
  backgroundColor: "#1e4fa1",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
},

confirmCashText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "700",
},
chequeEntryContainer: {
  width: "100%",
},

inputField: {
  height: 44,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  borderRadius: 10,
  paddingHorizontal: 12,
  fontSize: 15,
  color: "#1e293b",
  backgroundColor: "#fff",
  marginBottom: 10,
},
addAnotherBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: 14,
  borderRadius: 10,
  borderWidth: 1.5,
  borderColor: "#1e4fa1",
  backgroundColor: "#f8fafc",
  marginTop: 14,
},

addAnotherText: {
  marginLeft: 8,
  fontSize: 15,
  fontWeight: "600",
  color: "#1e4fa1",
},

finishPaymentBtn: {
  backgroundColor: "#1e4fa1",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
  marginTop: 10,
  elevation: 3,
},

finishPaymentText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "700",
},
finalizeContainer: {
  width: "100%",
},

finalizeHeader: {
  marginBottom: 12,
},

finalizeTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1e293b",
  marginBottom: 4,
},

finalizeSubText: {
  fontSize: 13,
  color: "#64748b",
},

finalizeSummaryBox: {
  backgroundColor: "#f8fafc",
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  padding: 12,
  marginBottom: 14,
},

finalizeSummaryTitle: {
  fontSize: 14,
  fontWeight: "700",
  color: "#1e293b",
  marginBottom: 6,
},

finalizeSummaryText: {
  fontSize: 14,
  color: "#334155",
  marginBottom: 4,
},

finalizeConfirmBtn: {
  backgroundColor: "#1e4fa1",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
},

finalizeConfirmText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "700",
},
notReadyContainer: {
  width: "100%",
},

sectionHeader: {
  marginBottom: 12,
},

sectionTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1e293b",
  marginBottom: 4,
},

sectionSubText: {
  fontSize: 13,
  color: "#64748b",
},

actionCard: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 14,
  paddingHorizontal: 16,
  borderRadius: 10,
  backgroundColor: "#f8fafc",
  borderWidth: 1,
  borderColor: "#e2e8f0",
  marginBottom: 10,
},

actionText: {
  marginLeft: 12,
  fontSize: 15,
  fontWeight: "600",
  color: "#1e293b",
},
reasonContainer: {
  width: "100%",
},

reasonInput: {
  minHeight: 80,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  borderRadius: 10,
  padding: 12,
  fontSize: 14,
  color: "#1e293b",
  backgroundColor: "#fff",
  marginBottom: 14,
  textAlignVertical: "top",
},
sectionCard: {
  width: "100%",
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 16,
  marginTop: 12,
  borderWidth: 1,
  borderColor: "#e2e8f0",
},

sectionTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#1e293b",
  marginBottom: 4,
},

sectionSubText: {
  fontSize: 13,
  color: "#64748b",
  marginBottom: 12,
},

optionRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 14,
  paddingHorizontal: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  marginBottom: 10,
  backgroundColor: "#f8fafc",
},

optionText: {
  marginLeft: 12,
  fontSize: 15,
  fontWeight: "600",
  color: "#1e293b",
},

footerBar: {
  flexDirection: "row",
  gap: 10,
  marginTop: 16,
},

primaryBtn: {
  flex: 1,
  backgroundColor: "#1e4fa1",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
},

primaryBtnText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "700",
},

secondaryBtn: {
  flex: 1,
  borderWidth: 1,
  borderColor: "#1e4fa1",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
  backgroundColor: "#fff",
},

secondaryBtnText: {
  color: "#1e4fa1",
  fontSize: 15,
  fontWeight: "700",
},

textArea: {
  minHeight: 90,
  borderWidth: 1,
  borderColor: "#e2e8f0",
  borderRadius: 10,
  padding: 12,
  fontSize: 14,
  marginBottom: 14,
},

secondaryBtnFull: {
  width: "100%",         
  backgroundColor: "#f8fafc",
  borderWidth: 1,
  borderColor: "#1e4fa1",
  paddingVertical: 16,  
  borderRadius: 10,
  alignItems: "center",
  marginBottom: 12,
},

secondaryBtnText: {
  color: "#1e4fa1",
  fontSize: 15,
  fontWeight: "600",
},

primaryBtnFull: {
  width: "100%",          
  backgroundColor: "#1e4fa1",
  paddingVertical: 16,   
  borderRadius: 10,
  alignItems: "center",
  marginBottom: 12,
},

primaryBtnText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "700",
},

backOptionsBox: {
  marginTop: 12,
  borderTopWidth: 1,
  borderTopColor: "#e2e8f0",
  paddingTop: 12,
},
sectionHeaderRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
},

dangerBtnFull: {
  backgroundColor: "#c62828",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
  marginTop: 16,
  flexDirection: "row",
  justifyContent: "center",
  gap: 8,
},

dangerBtnText: {
  color: "#fff",
  fontWeight: "600",
  fontSize: 16,
},

confirmCard: {
  backgroundColor: "#fff",
  borderRadius: 12,
  padding: 16,
  elevation: 3,
},

confirmHeader: {
  flexDirection: "row",
  alignItems: "center",
  gap: 8,
  marginBottom: 12,
},

confirmTitle: {
  fontSize: 18,
  fontWeight: "600",
  color: "#c62828",
},

confirmText: {
  fontSize: 14,
  color: "#334155",
  marginBottom: 20,
  lineHeight: 20,
  fontWeight: 500,
},
stopSimpleBtn: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  borderWidth: 1,
  borderColor: "#c62828",
  borderRadius: 10,
  paddingVertical: 14,
  marginTop: 12,
},

stopSimpleText: {
  color: "#c62828",
  fontSize: 16,
  fontWeight: "800",
  
},
stopCircleBtn: {
  width: 90,
  height: 90,
  borderRadius: 60,
  backgroundColor: "#c62828",
  alignItems: "center",
  justifyContent: "center",
  alignSelf: "center",
  marginTop: 1,
  elevation: 1,
  shadowColor: "#000",
  shadowOpacity: 0.15,
  shadowRadius: 8,
  shadowOffset: { width: 0, height: 4 },
},


stopCircleText: {
  color: "#fff",
  fontSize: 16,
  fontWeight: "900",
  marginTop: 1,
  letterSpacing: 1,
},
statusHeaderRow: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 12,
},

statusIconWrap: {
  width: 40,
  height: 40,
  borderRadius: 20,
  backgroundColor: "#e8f0fe",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},

statusTitle: {
  fontSize: 16,
  fontWeight: "700",
  color: "#0f172a",
},

statusSubtitle: {
  fontSize: 13,
  color: "#618991ff",
  marginTop: 2,
},
visitDialogBody: {
  paddingTop: 1,
  paddingBottom: 10,
},
outcomeCard: {
  flexDirection: "row",
  alignItems: "center",
  padding: 14,
  borderRadius: 12,
  backgroundColor: "#f8fafc",
  borderWidth: 1,
  borderColor: "#e2e8f0",
  marginTop: 10,
},

outcomeIconWrap: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "#e8f0fe",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 12,
},

outcomeTitle: {
  fontSize: 15,
  fontWeight: "700",
  color: "#000000ff",
},

outcomeSubText: {
  fontSize: 12,
  color: "#64748b",
  marginTop: 2,
},
outcomeCardEnhanced: {
  flexDirection: "row",
  alignItems: "center",
  padding: 16,
  borderRadius: 14,
  backgroundColor: "#ffffff",
  borderWidth: 1,
  borderColor: "#e2e8f0",
  marginTop: 14,

  // subtle elevation
  shadowColor: "#000",
  shadowOpacity: 0.06,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 3,
},

outcomeIconCircle: {
  width: 46,
  height: 46,
  borderRadius: 23,
  backgroundColor: "#eef4ff",
  alignItems: "center",
  justifyContent: "center",
  marginRight: 14,
},

outcomeTitle: {
  fontSize: 15,
  fontWeight: "700",
  color: "#0f172a",
},

outcomeSubText: {
  fontSize: 12.5,
  color: "#64748b",
  marginTop: 3,
  lineHeight: 16,
},
optionSubText: {
  fontSize: 12,
  color: "#6b7280",
  marginTop: 2,
},
inputBlock: {
  marginTop: 16,
},

inputLabel: {
  fontSize: 14,
  color: "#060709ff",
  marginBottom: 6,
  fontWeight: 500,
},

textInput: {
  borderWidth: 1,
  borderColor: "#e2e8f0",
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 10,
  fontSize: 14,
  backgroundColor: "#fff",
},
simpleInput: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderWidth: 1,
  borderColor: "#e2e8f0",
  borderRadius: 10,
  paddingHorizontal: 12,
  paddingVertical: 12,
  backgroundColor: "#fff",
},

simpleInputText: {
  fontSize: 14,
  color: "#0f172a",
},
enhancedHeaderRow: {
  flexDirection: "row",
  alignItems: "center",
  gap: 12,
},

iconBadge: {
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: "#eff6ff",
  alignItems: "center",
  justifyContent: "center",
},

softDivider: {
  height: 1,
  backgroundColor: "#e5e7eb",
  marginVertical: 16,
},

helperText: {
  fontSize: 12,
  color: "#64748b",
  marginTop: 4,
  marginBottom: 16,
},

primaryActionBtn: {
  backgroundColor: "#2563eb",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
  marginTop: 8,
},

primaryActionText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "600",
},
textAreaEnhanced: {
  borderWidth: 1,
  borderColor: "#e5e7eb",
  borderRadius: 10,
  padding: 12,
  minHeight: 100,
  fontSize: 14,
  color: "#111827",
  backgroundColor: "#fff",
},

helperText: {
  fontSize: 12,
  color: "#64748b",
  marginTop: 6,
  marginBottom: 16,
},

primaryActionBtn: {
  backgroundColor: "#2563eb",
  paddingVertical: 14,
  borderRadius: 10,
  alignItems: "center",
},

primaryActionText: {
  color: "#fff",
  fontSize: 15,
  fontWeight: "600",
},
radioRow: {
  flexDirection: "row",
  alignItems: "center",
  paddingVertical: 14,
  gap: 12,
},

radioText: {
  fontSize: 15,
  color: "#0f172a",
},
modalBack: {
  position: "absolute",
  top: 16,
  left: 16,
  zIndex: 10,
},

modalClose: {
  position: "absolute",
  top: 16,
  right: 16,
  zIndex: 10,
},
modalHeaderRow: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: 16,
  paddingTop: 16,
  paddingBottom: 12,
  borderBottomWidth: 1,
  borderBottomColor: "#e5e7eb",
},

callFlowModal: {
  backgroundColor: "#fff",
  borderRadius: 16,
  paddingBottom: 16,

  width: "92%",          // ✅ THIS fixes narrow modals
  alignSelf: "center",

  // optional polish
  maxWidth: 420,         // prevents tablet overstretch
},
activeVisitBanner: {
  backgroundColor: "#1e4fa1",
  margin: 10,
  padding: 12,
  borderRadius: 12,
  flexDirection: "row",
  alignItems: "center",
  elevation: 3,
},
activeVisitTitle: {
  color: "#fff",
  fontSize: 14,
  fontWeight: "800",
},
activeVisitSub: {
  color: "#fff",
  fontSize: 12,
  marginTop: 2,
  opacity: 0.9,
},
fullScreenVisitDialog: {
  width: "100%",
  height: "100%",
  borderRadius: 0,
},

});