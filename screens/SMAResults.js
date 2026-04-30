import React, { useEffect, useState } from "react";
import {
View,
Text,
FlatList,
StyleSheet,
ScrollView,
TouchableOpacity,
StatusBar,
TextInput,
Modal,
Linking,
BackHandler,
AppState,
Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import BASE_URL from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {Calendar} from "react-native-calendars";
import RNPickerSelect from "react-native-picker-select";
export default function SMAResults({route, navigation}){
  console.log("📱 SMAResults screen loaded", route?.params);

const [modalStack,setModalStack] = useState([]);  
const { cluster, branchCode, branchName, irac, mode } = route.params || {};
const [loading, setLoading] = useState(true);
const [loggedUser, setLoggedUser] = useState(null);
const [data, setData] = useState([]);
const [searchText,setSearchText] = useState("");
const [sortOption,setSortOption] = useState("");
const [showSortModal,setShowSortModal] = useState(false);

const [visibleData,setVisibleData] = useState([]);
const [itemsToShow,setItemsToShow] = useState(20);

const [showCallModal, setShowCallModal] = useState(false);
const [showBranchContacts, setShowBranchContacts] = useState(false);
const [branchContacts, setBranchContacts] = useState([]);

const [showCustomerNumbers,setShowCustomerNumbers] = useState(false);
const [customerNumbers,setCustomerNumbers] = useState([]);
const [alternateNumber,setAlternateNumber] = useState("");

const [showCallFlowModal,setShowCallFlowModal] = useState(false);
const [callStage,setCallStage] = useState("IDLE");
const [spokeChoice,setSpokeChoice] = useState(null);
const [readyPayChoice,setReadyPayChoice] = useState(null);
const [notReadyChoice,setNotReadyChoice] = useState(null);

const [callSessionId,setCallSessionId] = useState(null);
const [openCallModalAfterDial,setOpenCallModalAfterDial] = useState(false);
const [dialedNumber,setDialedNumber] = useState(null);

const [parentLogId,setParentLogId] = useState(null);

const [callType,setCallType] = useState(null); 
// "CUSTOMER" or "BRANCH"

const [calendarMode,setCalendarMode] = useState(null);
const [selectedDate,setSelectedDate] = useState(null);
const [visitNotes,setVisitNotes] = useState("");

const [hour,setHour] = useState("10");
const [minute,setMinute] = useState("00");
const [ampm,setAmpm] = useState("AM");

const [otherReason,setOtherReason] = useState("");
const [showOtherInput,setShowOtherInput] = useState(false);

const [didNotSpeakChoice,setDidNotSpeakChoice] = useState(null);

const [showBranchOutcome,setShowBranchOutcome] = useState(false);
const [branchOutcome,setBranchOutcome] = useState(null);
const [branchReason,setBranchReason] = useState("");

const [searchQuery,setSearchQuery] = useState("");

const [showHistoryModal,setShowHistoryModal] = useState(false);
const [historyData,setHistoryData] = useState([]);
const [historyLoading,setHistoryLoading] = useState(false);

const fetchAccountHistory = async (accountNumber) => {
  console.log("📥 Fetch history", accountNumber);

try{

setHistoryLoading(true);

const res = await fetch(
`${BASE_URL}/api/sma/history?accountNumber=${accountNumber}`
);
const result = await res.json();

console.log("📦 History fetched", {
  userId: loggedUser?.UserId,
  userName: loggedUser?.UserName,
  accountNumber,
  count: result?.length,
  data: result
});

const grouped = {};

result.forEach(row => {

if(!grouped[row.SessionId]){
grouped[row.SessionId] = {
sessionTime: row.StartedAt,
logs:[]
};
}

let meta = null;

try{
meta = row.MetadataJson ? JSON.parse(row.MetadataJson) : null;
}catch(e){
meta = null;
}

grouped[row.SessionId].logs.push({
...row,
meta
});

});

setHistoryData(Object.values(grouped).sort(
(a,b)=>new Date(b.sessionTime)-new Date(a.sessionTime)
));
setShowHistoryModal(true);

}catch(err){

console.log("❌ History fetch error:",err);

}

setHistoryLoading(false);

};

const ThreeActionButtons = ({
  onSubmit,
  onScheduleCall,
  onScheduleVisit,
  logAction
}) => {

  const safeLog = async (code,label)=>{
    try{
      if(logAction){
        await logAction(code,label);
      }
    }catch(e){
      console.log("SMA log error:",e);
    }
  }

 return (

<View style={{width:"100%"}}>

<Text style={styles.sectionTitle}>
Next Action
</Text>


{/* SUBMIT */}
<TouchableOpacity
style={styles.optionRowAligned}
onPress={async()=>{
await safeLog("CALL_COMPLETED","Call Completed");
onSubmit && onSubmit();
}}
>

<View style={styles.optionLeft}>

<Ionicons name="checkmark-circle-outline" size={22} color="#2563eb"/>

<View style={styles.optionTextWrap}>

<Text style={styles.optionTitle}>
Submit
</Text>

<Text style={styles.optionSubText}>
Record this response and close the flow
</Text>

</View>
</View>

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>



{/* SCHEDULE CALL */}
<TouchableOpacity
style={styles.optionRowAligned}
onPress={async()=>{
await safeLog("SCHEDULE_CALL","Schedule Call");
onScheduleCall && onScheduleCall();
}}
>

<View style={styles.optionLeft}>

<Ionicons name="call-outline" size={22} color="#2563eb"/>

<View style={styles.optionTextWrap}>

<Text style={styles.optionTitle}>
Schedule a Call
</Text>

<Text style={styles.optionSubText}>
Follow up with the customer later
</Text>

</View>
</View>

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>



{/* SCHEDULE VISIT */}
<TouchableOpacity
style={styles.optionRowAligned}
onPress={async()=>{
await safeLog("SCHEDULE_VISIT","Schedule Visit");
onScheduleVisit && onScheduleVisit();
}}
>

<View style={styles.optionLeft}>

<Ionicons name="calendar-outline" size={22} color="#2563eb"/>

<View style={styles.optionTextWrap}>

<Text style={styles.optionTitle}>
Schedule a Visit
</Text>

<Text style={styles.optionSubText}>
Plan a physical visit to verify details
</Text>

</View>
</View>

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>

</View>

)
}

const getLoggedUser = async () => {

try{

const u = await AsyncStorage.getItem("LOGGED_USER");
return u ? JSON.parse(u) : null;

}catch(e){
return null;
}

};

const startSMASession = async (accountNumber) => {
  console.log("📥 Start SMA session", accountNumber);

try{

if(callSessionId) return;

const user = await getLoggedUser();
if(!user) return;
const res = await fetch(`${BASE_URL}/api/sma/session/start`,{

method:"POST",
headers:{"Content-Type":"application/json"},

body:JSON.stringify({
loanAccountNumber:accountNumber,
userId:user.UserId,
userName:user.UserName,
sourceType:"SMA",
sourceId:accountNumber
})

});

const data = await res.json();

console.log("📦 SMA session response", {
  userId: user?.UserId,
  userName: user?.UserName,
  response: data
});

setCallSessionId(data.sessionId);

}catch(err){
console.log("❌ SMA session start error:",err);
}

};

const logSMAAction = async (actionCode,actionLabel,metadata=null)=>{
  console.log("📤 SMA log", {
actionCode,
actionLabel,
metadata
});

try{

const user = await getLoggedUser();

const res = await fetch(`${BASE_URL}/api/sma/log`,{

method:"POST",
headers:{"Content-Type":"application/json"},

body:JSON.stringify({

sessionId:callSessionId || null,
parentLogId:parentLogId,   // ⭐ added
actionCode,
actionLabel,
metadata,

userId:user.UserId,
userName:user.UserName,

sourceType:"SMA",
sourceId:selectedAccount?.["Account No."]

})

});

const result = await res.json();

console.log("📦 SMA log response", {
  userId: user?.UserId,
  userName: user?.UserName,
  response: result
});

if(actionCode === "CALL_DIALED_CUSTOMER" || actionCode === "CALL_DIALED_BRANCH"){
setParentLogId(result.logId);
}

}catch(err){
console.log("❌ SMA log error:",err);
}

};


const pushModal = (modalName) => {
  setModalStack(prev => [...prev, modalName]);
};

const popModal = () => {
  setModalStack(prev => prev.slice(0,-1));
};

const handleModalBack = () => {

  if(modalStack.length === 0){
    setShowCallModal(false);
    setShowBranchContacts(false);
    setShowCustomerNumbers(false);
    return;
  }

  const last = modalStack[modalStack.length - 1];

  setShowCallModal(false);
  setShowBranchContacts(false);
  setShowCustomerNumbers(false);

  if(last === "CALL_OPTION"){
    setShowCallModal(true);
  }

  if(last === "BRANCH_CONTACTS"){
    setShowBranchContacts(true);
  }

  if(last === "CUSTOMER_NUMBERS"){
    setShowCustomerNumbers(true);
  }

  popModal();
};

useEffect(() => {

const subscription = AppState.addEventListener("change",(state)=>{

if(state === "active" && dialedNumber){

// Only show call outcome for CUSTOMER calls
if(callType === "CUSTOMER"){
setCallStage("AFTER_CALL");
setShowCallFlowModal(true);
}

if(callType === "BRANCH"){
setShowBranchOutcome(true);
}

// reset
setDialedNumber(null);
setCallType(null);

}

});

return () => subscription.remove();

},[dialedNumber]);

useEffect(() => {
  const loadUser = async () => {
    const saved = await AsyncStorage.getItem("LOGGED_USER");
    const user = saved ? JSON.parse(saved) : null;
    setLoggedUser(user);

    console.log("👤 SMAResults user loaded", {
      userId: user?.UserId,
      userName: user?.UserName
    });
  };

  loadUser();
}, []);

useEffect(()=>{

const backAction = () => {

if(showCustomerNumbers || showBranchContacts || showCallModal){
handleModalBack();
return true;
}

if(selectedAccount){
setSelectedAccount(null);
return true;
}

return false;

};

const backHandler = BackHandler.addEventListener(
"hardwareBackPress",
backAction
);

return () => backHandler.remove();

},[modalStack,showCallModal,showBranchContacts,showCustomerNumbers,selectedAccount]);

useEffect(() => {
console.log("📊 Fetch SMA results", {
userId: loggedUser?.UserId,
userName: loggedUser?.UserName,
cluster,
branchCode,
branchName,
irac,
mode
});

const fetchData = async () => {

try {
console.log("📥 SMA report request started");

const params = new URLSearchParams({
cluster: cluster || "",
branchCode: branchCode || "",
branchName: branchName || "",
irac: irac || ""
});

const response = await fetch(
`${BASE_URL}/api/sma-report?${params}`
);

const result = await response.json();

console.log("📦 SMA results fetched", {
  userId: loggedUser?.UserId,
  userName: loggedUser?.UserName,
  count: result?.length,
  data: result
});

console.log("✅ SMA report success", result?.length);

setData(result);
console.log("📤 SMA report response processed");
setLoading(false);

} catch (error) {
console.log("❌ SMA API error:", error);
}

};

fetchData();

}, [cluster, branchCode, branchName, irac]);

const [selectedAccount, setSelectedAccount] = useState(null);

useEffect(() => {
  const unsubscribe = navigation.addListener("beforeRemove", (e) => {

    if (selectedAccount) {
      e.preventDefault();
      setSelectedAccount(null);
    }

  });

  return unsubscribe;
}, [navigation, selectedAccount]);

useEffect(() => {
  if (!selectedAccount) return;

  fetchCustomerNumbers();

}, [selectedAccount]);

const filteredData = data.filter(item => {

const iracValue = parseInt(item["NEW IRAC"]);
const text = (searchQuery || "").toLowerCase();

let iracMatch = true;

if(irac){
  iracMatch = iracValue === parseInt(irac);
}
else if(mode === "SMA"){
  iracMatch = iracValue <= 4;
}
else if(mode === "NPA"){
  iracMatch = iracValue >= 5;
}

if(!text) return iracMatch;

// If user typed single digit → treat as IRAC search only
if(text.length === 1 && !isNaN(text)){
return iracMatch && item["NEW IRAC"] === text;
}

// Otherwise normal search
return iracMatch && (
item["Account No."]?.toLowerCase().includes(text) ||
item["Account Name"]?.toLowerCase().includes(text) ||
item["NEW IRAC"]?.toLowerCase().includes(text)
);

});
const sortedData = React.useMemo(()=>{

let arr = [...filteredData];

if(sortOption === "OUT_BAL_DESC"){
arr.sort((a,b)=>{
const balA = Math.abs(parseFloat((a["Outstanding Balance"]||"0").toString().replace(/,/g,"")));
const balB = Math.abs(parseFloat((b["Outstanding Balance"]||"0").toString().replace(/,/g,"")));
return balB - balA;
});
}

if(sortOption === "EMI_DESC"){
arr.sort((a,b)=>{
const emiA = Number(String(a["EMIs Due"]||"0"));
const emiB = Number(String(b["EMIs Due"]||"0"));
return emiB - emiA;
});
}

return arr;

},[filteredData,sortOption]);


useEffect(()=>{
  setItemsToShow(20);
},[searchQuery,sortOption]);

useEffect(()=>{

setVisibleData(sortedData.slice(0,itemsToShow));

},[itemsToShow,searchQuery,sortOption,data]);

const loadMoreData = () => {

if(itemsToShow >= sortedData.length) return;

setItemsToShow(prev => prev + 20);

};

const renderRow = (label, value) => (
  <View style={styles.row}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);
const renderCard = ({item}) => (

<View>

<TouchableOpacity
style={styles.callButton}
onPress={() => {
pushModal("CALL_OPTION");
setShowCallModal(true);
}}
>
<Text style={styles.callText}>CALL NOW</Text>
</TouchableOpacity>

<View style={styles.card}>

{renderRow("Cluster Code",item["Cluster Code"])}
{renderRow("SNo",item["SNo."])}
{renderRow("Branch Code",item["Br Code"])}
{renderRow("Branch Name",item["Branch Name"])}
{renderRow("Account No",item["Account No."])}
{renderRow("Account Name",item["Account Name"])}
{renderRow("Account Type",item["Account Type Description"])}
{renderRow("Limit",item["Limit"])}
{renderRow("Drawing Power",item["Drawing Power"])}
{renderRow("Interest Rate",item["Int Rate"])}
{renderRow("Theo Balance",item["Theo Balance"])}
{renderRow("Cleared Balance",item["Cleared Balance"])}
{renderRow("Uncleared Balance",item["Uncleared Balance"])}
{renderRow("Outstanding Balance",item["Outstanding Balance"])}
{renderRow("Overdue",item["Overdue"])}
{renderRow("Sanction Date",item["Sanction Date"])}
{renderRow("Expiry Date",item["Expiry Date"])}
{renderRow("EMIs Due",item["EMIs Due"])}
{renderRow("EMIs Paid",item["EMIs Paid"])}
{renderRow("EMIs OD",item["EMIs OD"])}
{renderRow("NEW IRAC",item["NEW IRAC"])}
{renderRow("OLD IRAC",item["OLD IRAC"])}
{renderRow("NPA Date",item["NPA Date"])}
{renderRow("Arrear Condition",item["Arrear Condition"])}
{renderRow("Arrear Description",item["Arrear Description"])}
{renderRow("Loan Type",item["Loan Type"])}
{renderRow("Product Group",item["Product Group"])}

</View>

</View>

);
const isValidIndianMobile = (num) => {
  return /^[6-9]\d{9}$/.test(num);
};

const formatAmount = (val) => {

if(val === null || val === undefined || val === "") return "";

const num = parseFloat(String(val).replace(/,/g,""));

if(isNaN(num)) return val;

return num.toFixed(2);

};

const renderTable = () => (
<View style={{flex:1}}>
  <ScrollView
  horizontal
  showsHorizontalScrollIndicator
  contentContainerStyle={{flexGrow:1}}
>

    <View>

      <View style={styles.tableHeader}>
        <Text style={styles.th}>SNo</Text>
        <Text style={styles.th}>Br Code</Text>
        <Text style={styles.th}>Branch Name</Text>
        <Text style={styles.th}>Cluster Code</Text>
        <Text style={styles.th}>Account No</Text>
        <Text style={styles.th}>Account Name</Text>
        <Text style={styles.th}>Account Type</Text>
        <Text style={styles.th}>Limit</Text>
        <Text style={styles.th}>Drawing Power</Text>
        <Text style={styles.th}>Int Rate</Text>
        <Text style={styles.th}>Theo Balance</Text>
        <Text style={styles.th}>Cleared Balance</Text>
        <Text style={styles.th}>Uncleared Balance</Text>
        <Text style={styles.th}>Outstanding Balance</Text>
        <Text style={styles.th}>Overdue</Text>
        <Text style={styles.th}>Sanction Date</Text>
        <Text style={styles.th}>Expiry Date</Text>
        <Text style={styles.th}>EMIs Due</Text>
        <Text style={styles.th}>EMIs Paid</Text>
        <Text style={styles.th}>EMIs OD</Text>
        <Text style={styles.th}>NEW IRAC</Text>
        <Text style={styles.th}>OLD IRAC</Text>
        <Text style={styles.th}>NPA Date</Text>
        <Text style={styles.th}>Arrear Condition</Text>
        <Text style={styles.th}>Arrear Description</Text>
        <Text style={styles.th}>Loan Type</Text>
        <Text style={styles.th}>Product Group</Text>
      </View>

<FlatList
data={visibleData}
scrollEnabled={false}
style={{flexGrow:0}}
  keyExtractor={(item,index)=>index.toString()}
        renderItem={({item, index}) => (
          <TouchableOpacity
  style={styles.tableRow}
 onPress={() => {

setCalendarMode(null);
setSelectedDate(null);

setSelectedAccount(item);

}}
>
            <Text style={styles.tdCenter}>{index + 1}</Text>
            <Text style={styles.tdCenter}>{item["Br Code"]}</Text>
            <Text style={styles.td}>{item["Branch Name"]}</Text>
            <Text style={styles.tdCenter}>{item["Cluster Code"]}</Text>
            <Text style={styles.tdRight}>{item["Account No."]}</Text>
            <Text style={styles.tdCenter}>{item["Account Name"]}</Text>
            <Text style={styles.tdCenter}>{item["Account Type Description"]}</Text>
<Text style={styles.tdRight}>{formatAmount(item["Limit"])}</Text>
<Text style={styles.tdRight}>{formatAmount(item["Drawing Power"])}</Text>
            <Text style={styles.tdRight}>{item["Int Rate"]}</Text>
<Text style={styles.tdRight}>{formatAmount(item["Theo Balance"])}</Text>
<Text style={styles.tdRight}>{formatAmount(item["Cleared Balance"])}</Text>
<Text style={styles.tdRight}>{formatAmount(item["Uncleared Balance"])}</Text>
<Text style={styles.tdRight}>{formatAmount(item["Outstanding Balance"])}</Text>
<Text style={styles.tdRight}>{formatAmount(item["Overdue"])}</Text>
            <Text style={styles.tdCenter}>{item["Sanction Date"]}</Text>
            <Text style={styles.tdCenter}>{item["Expiry Date"]}</Text>
            <Text style={styles.tdCenter}>{item["EMIs Due"]}</Text>
            <Text style={styles.tdCenter}>{item["EMIs Paid"]}</Text>
            <Text style={styles.tdCenter}>{item["EMIs OD"]}</Text>
            <Text style={styles.tdCenter}>{item["NEW IRAC"]}</Text>
            <Text style={styles.tdCenter}>{item["OLD IRAC"]}</Text>
            <Text style={styles.tdCenter}>{item["NPA Date"]}</Text>
            <Text style={styles.tdRight}>{item["Arrear Condition"]}</Text>
            <Text style={styles.tdCenter}>{item["Arrear Description"]}</Text>
            <Text style={styles.tdCenter}>{item["Loan Type"]}</Text>
            <Text style={styles.tdCenter}>{item["Product Group"]}</Text>
          </TouchableOpacity>
        )}
      />

    </View>

</ScrollView>
</View>
);

if (loading) {
  return (
    <View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
      <Text>Loading data...</Text>
    </View>
  );
}

if(!loading && data.length === 0){
return (
<View style={{flex:1,justifyContent:"center",alignItems:"center"}}>
<Text>No records found</Text>
</View>
)
} 

const deleteSMAAlternate = async (number) => {

console.log("⚠️ Delete alternate clicked", number);

  try {

    const savedUser = await AsyncStorage.getItem("LOGGED_USER");
    const user = savedUser ? JSON.parse(savedUser) : null;
console.log("📥 Delete alternate request", {
account:selectedAccount["Account No."],
number
});
  const res = await fetch(`${BASE_URL}/api/account/delete-alternate`,{
      method:"POST",
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        loanAccountNumber:selectedAccount["Account No."],
        alternateNumber:number,
        deletedBy: user?.UserName   // ⭐ send username
      })
    });
console.log("✅ Alternate deleted", number);
    setCustomerNumbers(prev =>
      prev.filter(n => n.AlternateNumber !== number)
    );

    // optional log in SMA timeline
    await logSMAAction(
      "ALTERNATE_NUMBER_DELETED",
      "Alternate Number Deleted",
      { phoneNumber:number }
    );
const result = await res.json();

console.log("📦 Alternate delete response", {
  userId: user?.UserId,
  userName: user?.UserName,
  response: result
});
  } catch(err){
    console.log("❌ Delete alternate number error:",err);
  }
};

const fetchCustomerNumbers = async () => {
console.log("📥 Fetch customer numbers", {
  userId: loggedUser?.UserId,
  userName: loggedUser?.UserName,
  accountNumber: selectedAccount?.["Account No."]
});
  try {
    const res = await fetch(
      `${BASE_URL}/api/customer-numbers?accountNumber=${selectedAccount["Account No."]}`
    );

    const data = await res.json();
console.log("📦 Customer numbers fetched", {
  userId: loggedUser?.UserId,
  userName: loggedUser?.UserName,
  accountNumber: selectedAccount?.["Account No."],
  count: data?.length,
  data
});
console.log("✅ Customer numbers loaded", data?.length);
    if (Array.isArray(data)) {
      // keep full list
      setCustomerNumbers(data);

      // extract alternates only
      const alternates = data
        .map(x => x.AlternateNumber)
        .filter(Boolean);

      // show last added in input
      if (alternates.length > 0) {
        setAlternateNumber(alternates[alternates.length - 1]);
      }
    }

  } catch (err) {
   console.log("❌ Fetch customer numbers error:", err);
  }
};

return(

<View style={styles.container}>

<View style={styles.header}>

<TouchableOpacity
style={{marginTop:15}}
onPress={() => {

if(selectedAccount){
setSelectedAccount(null);   // go back to multiple cards
}
else{
navigation.goBack();        // go back to filters
}

}}
>
<Ionicons name="arrow-back" size={24} color="#fff" />
</TouchableOpacity>

<Text style={styles.headerTitle}>RESULTS</Text>

<TouchableOpacity
style={{marginTop:15}}
onPress={async () => {

const saved = await AsyncStorage.getItem("LOGGED_USER");
const user = saved ? JSON.parse(saved) : null;

if(!user){
alert("User session expired. Please login again.");
return;
}

navigation.reset({
  index: 0,
  routes: [{ name: "Home", params: { user } }],
});

}}
>
<Ionicons name="home" size={24} color="#fff" />
</TouchableOpacity>

</View>

<View style={styles.branchHeader}>
<Text style={styles.branchIcon}>🏦</Text>
<Text style={styles.branchTitle}>
{branchName ? branchName : cluster + " Cluster"}
</Text>
</View>

{selectedAccount ?

<View style={{flex:1}}>

<ScrollView
  style={{flex:1, paddingHorizontal:10}}
  contentContainerStyle={{paddingBottom:40}}
  showsVerticalScrollIndicator
>

{renderCard({item:selectedAccount})}

</ScrollView>

</View>

:

<View style={{flex:1, paddingHorizontal:10}}>

<View style={{
borderWidth:1,
borderColor:"#ccc",
borderRadius:8,
marginBottom:6,
backgroundColor:"#fff",
height:40,
flexDirection:"row",
alignItems:"center",
paddingHorizontal:8
}}>

<TextInput
placeholder="Search Account No / Name / IRAC"
placeholderTextColor="#888"
value={searchText}
onChangeText={(text)=>{
console.log("🔎 Search typing", text);
setSearchText(text);
}}
style={{
  flex:1,
  fontSize:14,
  color:"#000"
}}
/>

{searchText.length > 0 && (

<TouchableOpacity
onPress={()=>{
setSearchQuery(searchText);
}}
style={{marginRight:8}}
>
<Ionicons name="search" size={20} color="#0a3d62"/>
</TouchableOpacity>

)}

{searchText.length > 0 && (

<TouchableOpacity
onPress={()=>{
setSearchText("");
setSearchQuery("");
}}
>
<Ionicons name="close-circle" size={20} color="#999"/>
</TouchableOpacity>

)}

</View>

<View style={{
borderWidth:1,
borderColor:"#ccc",
borderRadius:8,
marginBottom:6,
backgroundColor:"#fff",
height:40,
justifyContent:"center",
position:"relative"
}}>

<RNPickerSelect
value={sortOption}
onValueChange={(value)=>{

console.log("↕️ Sort selected", value);

setSortOption(value);
}}
items={[
{label:"Outstanding Balance (High → Low)", value:"OUT_BAL_DESC"},
{label:"EMIs Due (High → Low)", value:"EMI_DESC"}
]}
placeholder={{label:"Sort By", value:""}}
useNativeAndroidPickerStyle={false}
style={{
inputIOS:{
fontSize:14,
paddingHorizontal:10,
height:40
},
inputAndroid:{
fontSize:14,
paddingHorizontal:10,
height:40
}
}}

/>
<Ionicons
name="chevron-down"
size={18}
color="#666"
style={{
position:"absolute",
right:10,
top:10
}}
/>
</View>


<Text style={{marginBottom:4,fontWeight:"bold"}}>
Total Records: {sortedData.length}
</Text>

<FlatList
data={visibleData}

initialNumToRender={20}
maxToRenderPerBatch={20}
windowSize={10}
removeClippedSubviews={true}

keyExtractor={(item,index)=>index.toString()}
contentContainerStyle={{paddingBottom:40}}
onEndReached={loadMoreData}
onEndReachedThreshold={0.5}
renderItem={({item})=>(

    <TouchableOpacity
  style={styles.smaCard}
onPress={() => {

console.log("🔘 Account selected", {
  userId: loggedUser?.UserId,
  userName: loggedUser?.UserName,
  accountNumber: item["Account No."]
});

setSelectedAccount(item)

}}
>

<View style={styles.cardHeader}>
<View style={{flex:1}}>

<View style={{flexDirection:"row", alignItems:"center"}}>
<Ionicons name="person-circle" size={18} color="#0a3d62" style={{marginRight:5}} />

<Text style={styles.name}>
{item["Account Name"]}
</Text>
</View>

<Text style={styles.acc}>
Loan A/c : {item["Account No."]}
</Text>

</View>

<View style={{alignItems:"center"}}>

<TouchableOpacity
onPress={()=>fetchAccountHistory(item["Account No."])}
>
<Ionicons name="time-outline" size={22} color="#0a3d62"/>
</TouchableOpacity>

<Text style={styles.iracSmall}>
NEW IRAC : {item["NEW IRAC"]}
</Text>
</View>

</View>


{/* Branch + EMI */}
<View style={styles.doubleRow}>
<Text style={styles.smallText}>
Branch Code: {item["Br Code"]}
</Text>

<Text style={styles.smallText}>
EMIs Due : {item["EMIs Due"]}
</Text>
</View>


{/* Mobile + Outstanding */}
<View style={styles.doubleRow}>

<Text style={styles.smallText}>
📞 {item["MobileNumber"] || item["AlternateNumber"] || "N/A"}
</Text>

<Text style={styles.amount}>
₹ {formatAmount(item["Outstanding Balance"])}
</Text>

</View>

</TouchableOpacity>
)}
/>

</View>
}

<Modal
visible={showCallModal}
transparent
animationType="fade"
>

<View style={styles.modalOverlay}>

<View style={styles.modalBox}>
  <View style={{flexDirection:"row",justifyContent:"space-between",width:"100%",marginBottom:10}}>
<TouchableOpacity onPress={handleModalBack}>
<Ionicons name="arrow-back" size={22}/>
</TouchableOpacity>

<TouchableOpacity onPress={()=>{
setShowCallModal(false);
setModalStack([]);
}}>
<Ionicons name="close" size={22}/>
</TouchableOpacity>
</View>

<Text style={styles.modalTitle}>Choose Call Option</Text>

<TouchableOpacity
style={styles.modalButton}
onPress={async () => {
console.log("🔘 CALL NOW clicked");
pushModal("CALL_OPTION");
setShowCallModal(false);

try{

console.log("📥 Fetch branch contacts", {
  userId: loggedUser?.UserId,
  userName: loggedUser?.UserName,
  branchCode: selectedAccount["Br Code"]
});
const response = await fetch(
`${BASE_URL}/api/branch-contacts?branchCode=${selectedAccount["Br Code"]}`
);

const result = await response.json();

console.log("📦 Branch contacts fetched", {
  userId: loggedUser?.UserId,
  userName: loggedUser?.UserName,
  branchCode: selectedAccount["Br Code"],
  count: result?.length,
  data: result
});

setBranchContacts(result);

setShowBranchContacts(true);

}catch(err){
console.log("❌ Branch contacts error:",err);
}

}}
>
<Text style={styles.modalButtonText}>Call Branch</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.modalButton}
onPress={() => {

pushModal("CALL_OPTION");
setShowCallModal(false);

// DO NOT FETCH AGAIN — already fetched in useEffect
setShowCustomerNumbers(true);

}}
>
<Text style={styles.modalButtonText}>Call Customer</Text>
</TouchableOpacity>

<TouchableOpacity
onPress={()=>{
setShowCallModal(false);
setModalStack([]);
}}
>
<Text style={styles.modalCancel}>Cancel</Text>
</TouchableOpacity>

</View>

</View>

</Modal>
<Modal
visible={showBranchContacts}
transparent
animationType="slide"
>
<View style={styles.modalOverlay}>

<View style={styles.modalBox}>
<View style={{flexDirection:"row",justifyContent:"space-between",width:"100%",marginBottom:10}}>
<TouchableOpacity onPress={handleModalBack}>
<Ionicons name="arrow-back" size={22}/>
</TouchableOpacity>

<TouchableOpacity onPress={()=>{
setShowBranchContacts(false);
setModalStack([]);
}}>
<Ionicons name="close" size={22}/>
</TouchableOpacity>
</View>
<Text style={styles.modalTitle}>Branch Contacts</Text>

<View style={{maxHeight:350, width:"100%"}}>

<FlatList
data={branchContacts}
keyExtractor={(item,index)=>index.toString()}
showsVerticalScrollIndicator
renderItem={({item}) => (

<TouchableOpacity
style={styles.modalButton}
onPress={async ()=>{

const phone = item["Mobile number"];

await startSMASession(selectedAccount["Account No."]);

await logSMAAction(
"CALL_DIALED_BRANCH",
"Branch Call Dialed",
{phoneNumber:phone}
);

setCallType("BRANCH");
setDialedNumber(phone);
Linking.openURL(`tel:${phone}`);

}}
>

<Text style={styles.modalButtonText}>
{item["Employee Name"]} ({item["Designation"]})
</Text>

<Text style={{color:"#fff"}}>
{item["Mobile number"]}
</Text>

</TouchableOpacity>

)}
/>

</View>

<TouchableOpacity
onPress={handleModalBack}
>
<Text style={styles.modalCancel}>Close</Text>
</TouchableOpacity>

</View>

</View>

</Modal>
<Modal
visible={showCustomerNumbers}
transparent
animationType="slide"
>

<View style={styles.modalOverlay}>

<View style={styles.modalBox}>
<View style={{flexDirection:"row",justifyContent:"space-between",width:"100%",marginBottom:10}}>
<TouchableOpacity onPress={handleModalBack}>
<Ionicons name="arrow-back" size={22}/>
</TouchableOpacity>

<TouchableOpacity onPress={()=>{
setShowCustomerNumbers(false);
setModalStack([]);
}}>
<Ionicons name="close" size={22}/>
</TouchableOpacity>
</View>

<Text style={styles.modalTitle}>Customer Numbers</Text>

{/* Primary Number */}

{customerNumbers.length > 0 && customerNumbers?.[0]?.mobileNumber && (

<TouchableOpacity
style={styles.modalButton}
onPress={async ()=>{

const phone = customerNumbers?.[0]?.mobileNumber;

await startSMASession(selectedAccount["Account No."]);

await logSMAAction(
"CALL_DIALED_CUSTOMER",
"Customer Call Dialed",
{phoneNumber:phone}
);

setCallType("CUSTOMER");
setDialedNumber(phone);
Linking.openURL(`tel:${phone}`);

}}
>

<Text style={styles.modalButtonText}>
Customer Number
</Text>

<Text style={{color:"#fff"}}>
{customerNumbers?.[0]?.mobileNumber}
</Text>

</TouchableOpacity>

)}

{/* Alternate Numbers */}

{customerNumbers
?.filter(item => item.AlternateNumber)
.map((item,index)=>(
<View
key={index}
style={[styles.modalButton,{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}]}
>

<View>
<Text style={styles.modalButtonText}>
Alternate Number {index+1}
</Text>

<Text style={{color:"#fff"}}>
{item.AlternateNumber}
</Text>
</View>

<View style={{flexDirection:"row"}}>

{/* CALL ICON */}
<TouchableOpacity
onPress={async ()=>{

const phone = item.AlternateNumber;

await startSMASession(selectedAccount["Account No."]);

await logSMAAction(
"CALL_DIALED_CUSTOMER",
"Customer Call Dialed",
{phoneNumber:phone}
);

setCallType("CUSTOMER");
setDialedNumber(phone);
Linking.openURL(`tel:${phone}`);

}}
>
<Ionicons name="call" size={20} color="#fff" style={{marginRight:15}}/>
</TouchableOpacity>

{/* DELETE ICON */}
<TouchableOpacity
onPress={()=>deleteSMAAlternate(item.AlternateNumber)}
>
<Ionicons name="trash" size={20} color="#ffcccc"/>
</TouchableOpacity>

</View>

</View>
))}

{/* Add Alternate */}

<TextInput
placeholder="Add Alternate Number"
placeholderTextColor="#888"
keyboardType="numeric"
maxLength={10}
value={alternateNumber}
onChangeText={(text)=>{
  const digits = text.replace(/[^0-9]/g,"");
  setAlternateNumber(digits);
}}

style={{
borderWidth:1,
borderColor:"#ccc",
padding:10,
borderRadius:8,
marginTop:10,
width:"100%"
}}
/>

{isValidIndianMobile(alternateNumber) && (

<TouchableOpacity
style={styles.modalButton}

onPress={async ()=>{

const altCount = customerNumbers.filter(n => n.AlternateNumber).length;

if(altCount >= 5){
Alert.alert(
  "Limit Reached",
  "Maximum 5 alternate numbers allowed. Delete any existing number and add new."
);
return;
}

// continue save logic

// ⭐ VALIDATION
if(!isValidIndianMobile(alternateNumber)){
  alert("Enter valid Indian mobile number (must start with 6,7,8,9 and be 10 digits)");
  return;
}

try{

const user = await AsyncStorage.getItem("LOGGED_USER");
const parsedUser = user ? JSON.parse(user) : null;
console.log("📥 Save alternate request", {
account:selectedAccount["Account No."],
alternateNumber
});
const res = await fetch(`${BASE_URL}/api/account/save-alternate`,{
  method:"POST",
  headers:{'Content-Type':'application/json'},
  body:JSON.stringify({
    loanAccountNumber:selectedAccount["Account No."],
    alternateNumber,
    addedBy: parsedUser?.UserName || "UNKNOWN"
  })
});

const responseData = await res.json();

console.log("📦 Alternate save response", {
  userId: parsedUser?.UserId,
  userName: parsedUser?.UserName,
  response: responseData
});

if(res.ok){

await fetchCustomerNumbers();

// ⭐ LOG THE NEW NUMBER IN HISTORY
await logSMAAction(
"ALTERNATE_NUMBER_ADDED",
"Alternate Number Added",
{phoneNumber: alternateNumber}
);

setAlternateNumber("");

alert("Alternate number saved");
console.log("✅ Alternate saved", alternateNumber);
}
}catch(err){
console.log("❌ Save alternate error:", err);
}

}}
>

<Text style={styles.modalButtonText}>Save Alternate</Text>

</TouchableOpacity>

)}

<TouchableOpacity
onPress={handleModalBack}
>
<Text style={styles.modalCancel}>Close</Text>
</TouchableOpacity>

</View>

</View>

</Modal>
<Modal
visible={showCallFlowModal}
transparent
animationType="fade"
>

<View style={styles.modalOverlay}>

<View style={styles.modalBox}>

<View style={styles.modalHeaderRow}>

<TouchableOpacity
style={{padding:5}}
onPress={() => {

// ⭐ If calendar is open go back to previous step
if(calendarMode){
setCalendarMode(null);
setSelectedDate(null);
return;
}

if(showOtherInput){
setShowOtherInput(false);

// handle SPOKE → Others flow
if(callStage === "SPOKE_OTHER"){
setCallStage("SPOKE");
return;
}

// handle NOT_READY → Others flow
setNotReadyChoice(null);
return;
}

if(callStage === "SPOKE_OTHER_ACTION"){
setShowOtherInput(true);   // go back to reason page
return;
}

if(callStage === "SPOKE" || callStage === "NOT_SPOKE"){
setCallStage("AFTER_CALL");
return;
}

if(callStage === "READY_TO_PAY"){
setCallStage("SPOKE");
return;
}

if(callStage === "NOT_READY"){

// if user is inside "Others → Enter reason"
if(showOtherInput){
setShowOtherInput(false);
return;
}

// if user selected one of the 6 options → go back to 6 options
if(notReadyChoice !== null){
setNotReadyChoice(null);
return;
}

// if already on 6 options → go back to Customer Response
setCallStage("SPOKE");
return;

}

setShowCallFlowModal(false);

}}
>
<Ionicons name="arrow-back" size={22}/>
</TouchableOpacity>

<TouchableOpacity
style={{padding:5}}
onPress={async ()=>{

await logSMAAction(
"CALL_COMPLETED",
callStage === "SPOKE"
? "Call Completed - Spoke"
: "Call Completed - Not Spoke"
);

console.log("📥 End SMA session", callSessionId);

await fetch(`${BASE_URL}/api/sma/session/end`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({sessionId:callSessionId})
});

console.log("✅ SMA session ended", callSessionId);

setCallSessionId(null);
setShowCallFlowModal(false);

setCalendarMode(null);
setSelectedDate(null);

setDidNotSpeakChoice(null);
setNotReadyChoice(null);
setOtherReason("");
setShowOtherInput(false);
}}
>
<Ionicons name="close" size={22}/>
</TouchableOpacity>

</View>
{calendarMode !== null && (
<View style={{width:"100%"}}>

<View style={styles.sectionHeaderRow}>
<Ionicons name="calendar-outline" size={22} color="#2563eb"/>
<Text style={styles.sectionTitle}>
Schedule Collection Visit
</Text>
</View>

<Calendar
  onDayPress={(day)=>{
    setSelectedDate(day.dateString);
  }}
  markedDates={{
    [selectedDate]:{
      selected:true,
      selectedColor:"#0a3d62"
    }
  }}

  // ✅ block past dates
  minDate={new Date().toISOString().split("T")[0]}
  disableAllTouchEventsForDisabledDays={true}

  // ✅ enable swipe
  enableSwipeMonths={true}

  // ✅ arrows
  renderArrow={(direction)=>(
    <Ionicons
      name={direction === "left" ? "chevron-back" : "chevron-forward"}
      size={22}
      color="#0a3d62"
    />
  )}
/>

{/* TIME INPUTS */}

<View style={{flexDirection:"row",marginTop:15,justifyContent:"space-between"}}>

<TextInput
style={{
borderWidth:1,
borderColor:"#e5e7eb",
borderRadius:8,
padding:10,
width:"30%",
textAlign:"center"
}}
value={hour}
onChangeText={setHour}
placeholder="HH"
/>

<TextInput
style={{
borderWidth:1,
borderColor:"#e5e7eb",
borderRadius:8,
padding:10,
width:"30%",
textAlign:"center"
}}
value={minute}
onChangeText={setMinute}
placeholder="MM"
/>

<TouchableOpacity
onPress={()=> setAmpm(ampm === "AM" ? "PM" : "AM")}
style={{
borderWidth:1,
borderColor:"#e5e7eb",
borderRadius:8,
padding:10,
width:"30%",
alignItems:"center",
justifyContent:"center",
backgroundColor:"#f8fafc"
}}
>
<Text style={{fontSize:16,fontWeight:"600"}}>
{ampm}
</Text>
</TouchableOpacity>

</View>

<TouchableOpacity
style={[styles.modalButton,{marginTop:18}]}
onPress={async ()=>{

if(!selectedDate){
alert("Please select visit date");
return;
}

logSMAAction(
"VISIT_SCHEDULED",
"Collection Visit Scheduled",
{
visitDate:selectedDate,
hour,
minute,
ampm
}
);

alert("Visit Scheduled");

const mode = calendarMode;

setCalendarMode(null);
setSelectedDate(null);

setHour("10");
setMinute("00");
setAmpm("AM");

console.log("📥 End SMA session", callSessionId);

await fetch(`${BASE_URL}/api/sma/session/end`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({sessionId:callSessionId})
});

console.log("✅ SMA session ended", callSessionId);

setCallSessionId(null);

setShowCallFlowModal(false);
setCallStage("IDLE");


}}
>

<Text style={styles.modalButtonText}>
Confirm Visit
</Text>

</TouchableOpacity>

</View>

)}

{showOtherInput && (
  <View style={{
    width:"100%",
    minHeight:200
  }}>

<Text style={styles.modalTitle}>
Enter the Response
</Text>

<TextInput
placeholder="Enter reason"
placeholderTextColor="#888"
value={otherReason}
onChangeText={setOtherReason}
multiline
numberOfLines={4}
textAlignVertical="top"
style={{
borderWidth:1,
borderColor:"#cbd5e1",
borderRadius:10,
padding:14,
marginBottom:18,
height:120,
fontSize:15,
color:"#000",
backgroundColor:"#f8fafc"
}}
/>

<TouchableOpacity
style={[styles.modalButton,{marginTop:5}]}
onPress={async ()=>{

if(!otherReason.trim()){
alert("Please enter reason");
return;
}

await logSMAAction(
"OTHER_REASON_CAPTURED",
"Other Reason Entered",
{note:otherReason}
);

setShowOtherInput(false);

if(callStage === "SPOKE_OTHER"){
setCallStage("SPOKE_OTHER_ACTION");
}else{
setNotReadyChoice("OTHERS");
setCallStage("NOT_READY");
}  // go to ThreeActionButtons
}}
>
<Text style={styles.modalButtonText}>
Continue
</Text>
</TouchableOpacity>

</View>

)}

{callStage === "AFTER_CALL" && (

<View style={{
width:"100%",
backgroundColor:"#f9fafb",
padding:15,
borderRadius:10
}}>

<Text style={{
fontSize:18,
fontWeight:"bold",
marginBottom:15,
color:"#0a3d62"
}}>
Call Outcome
</Text>

<TouchableOpacity
style={{
flexDirection:"row",
alignItems:"center",
justifyContent:"space-between",
padding:12,
borderRadius:10,
backgroundColor:"#ffffff",
borderWidth:1,
borderColor:"#e5e7eb",
marginBottom:10
}}
onPress={()=>{

logSMAAction("CALL_SPOKE","Spoke to Customer");

setCallStage("SPOKE");

}}
>

<View style={{flexDirection:"row",alignItems:"center"}}>
<Ionicons name="checkmark-circle" size={22} color="#16a34a"/>
<Text style={{marginLeft:10,fontSize:15}}>
Spoke to Customer
</Text>
</View>

<Ionicons name="chevron-forward" size={20}/>

</TouchableOpacity>


<TouchableOpacity
style={{
flexDirection:"row",
alignItems:"center",
justifyContent:"space-between",
padding:12,
borderRadius:10,
backgroundColor:"#ffffff",
borderWidth:1,
borderColor:"#e5e7eb"
}}
onPress={()=>{

logSMAAction("CALL_NOT_SPOKE","Did Not Speak");

setCallStage("NOT_SPOKE");

}}
>

<View style={{flexDirection:"row",alignItems:"center"}}>
<Ionicons name="close-circle" size={22} color="#dc2626"/>
<Text style={{marginLeft:10,fontSize:15}}>
Did Not Speak
</Text>
</View>

<Ionicons name="chevron-forward" size={20}/>

</TouchableOpacity>

</View>

)}
{callStage === "SPOKE" && !calendarMode && !showOtherInput && (

<View style={{width:"100%"}}>

<Text style={styles.modalTitle}>
Customer Response
</Text>

<TouchableOpacity
style={styles.modalButton}
onPress={()=>{
logSMAAction("READY_TO_PAY","Customer Ready To Pay");
setCallStage("READY_TO_PAY");
}}
>
<Text style={styles.modalButtonText}>
Ready to Pay
</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.modalButton}
onPress={()=>{
logSMAAction("NOT_READY_TO_PAY","Customer Not Ready To Pay");
setCallStage("NOT_READY");
}}
>
<Text style={styles.modalButtonText}>
Not Ready to Pay
</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.modalButton}
onPress={()=>{

logSMAAction("CALL_BACK_LATER","Asked to Call Back Later");

setCalendarMode("CALL_BACK");

}}
>
<Text style={styles.modalButtonText}>
Asked to Call Back Later
</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.modalButton}
onPress={()=>{

logSMAAction("CALL_SPOKE_OTHERS","Other Response");

setOtherReason("");
setCallStage("SPOKE_OTHER");   // ⭐ change stage
setShowOtherInput(true);

}}
>
<Text style={styles.modalButtonText}>
Others
</Text>
</TouchableOpacity>

</View>

)}

{callStage === "NOT_SPOKE" && didNotSpeakChoice === null && !calendarMode && !showOtherInput && (
  
  <View style={{width:"100%"}}>

<Text style={styles.modalTitle}>
Call Not Connected
</Text>

<TouchableOpacity
style={styles.modalButton}
onPress={async ()=>{

await logSMAAction("CALL_BUSY","Customer Busy");

alert("Customer Busy");

console.log("📥 End SMA session", callSessionId);

await fetch(`${BASE_URL}/api/sma/session/end`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({sessionId:callSessionId})
});

console.log("✅ SMA session ended", callSessionId);

setCallSessionId(null);
setShowCallFlowModal(false);

}}
>
<Text style={styles.modalButtonText}>
No Response / Busy
</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.modalButton}
onPress={async ()=>{

await logSMAAction("CALL_NOT_REACHABLE","Customer Not Reachable");

alert("Customer Not Reachable");

console.log("📥 End SMA session", callSessionId);

await fetch(`${BASE_URL}/api/sma/session/end`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({sessionId:callSessionId})
});

console.log("✅ SMA session ended", callSessionId);

setCallSessionId(null);
setShowCallFlowModal(false);

}}
>
<Text style={styles.modalButtonText}>
Not Reachable
</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.modalButton}
onPress={async ()=>{

await logSMAAction("INVALID_NUMBER","Invalid Number");

alert("Invalid Number");

console.log("📥 End SMA session", callSessionId);

await fetch(`${BASE_URL}/api/sma/session/end`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({sessionId:callSessionId})
});

console.log("✅ SMA session ended", callSessionId);

setCallSessionId(null);
setShowCallFlowModal(false);

}}
>
<Text style={styles.modalButtonText}>
Invalid Number
</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.modalButton}
onPress={()=>{
logSMAAction("PHYSICAL_VISIT_REQUIRED","Physical Visit Required");
setDidNotSpeakChoice("VISIT_REQUIRED");
}}
>
<Text style={styles.modalButtonText}>
Physical Visit Required
</Text>
</TouchableOpacity>

</View>

)}

{callStage === "NOT_SPOKE" && didNotSpeakChoice !== null && !calendarMode && !showOtherInput && (

<ThreeActionButtons

logAction={logSMAAction}

onSubmit={async ()=>{

await logSMAAction(
"DID_NOT_SPEAK_SUBMITTED",
"Did Not Speak Submitted",
{reason:didNotSpeakChoice}
);

alert("Response Saved");

setDidNotSpeakChoice(null);
setCallStage("AFTER_CALL");

}}

onScheduleCall={()=>{
setCalendarMode("CALL_BACK");
}}

onScheduleVisit={()=>{
setCalendarMode("NOT_SPOKE_VISIT");
}}

/>

)}
{callStage === "READY_TO_PAY" && readyPayChoice === null && !calendarMode && !showOtherInput && (

<View style={styles.sectionCard}>

<View style={styles.sectionHeaderRow}>
<Ionicons name="cash-outline" size={22} color="#2563eb"/>

<Text style={{
fontSize:18,
fontWeight:"700",
marginLeft:8,
color:"#0a3d62"
}}>
Payment Preference
</Text>

</View>

<Text style={styles.sectionSubText}>
Select how the customer prefers to make payment
</Text>

{/* ONLINE PAYMENT */}
<TouchableOpacity
style={styles.optionRowAligned}
activeOpacity={0.85}
onPress={() => {

logSMAAction(
"SEND_PAYMENT_LINK",
"Send Online Payment Link"
);

alert("Online payment link feature will be added in a future.");

}}>

<View style={styles.optionLeft}>

<Ionicons
name="link-outline"
size={22}
color="#2563eb"
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

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>


{/* OFFLINE COLLECTION */}
<TouchableOpacity
style={styles.optionRowAligned}
activeOpacity={0.85}
onPress={()=>{

logSMAAction(
"SCHEDULE_VISIT",
"Schedule Visit for Collection"
);

setCalendarMode("READY_PAY_VISIT");

}}
>

<View style={styles.optionLeft}>

<Ionicons
name="calendar-outline"
size={22}
color="#2563eb"
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

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>

</View>

)}

{callStage === "NOT_READY" && notReadyChoice === null && !calendarMode && !showOtherInput && (

<View style={styles.sectionCard}>

<View style={styles.sectionHeaderRow}>
<Ionicons name="alert-circle-outline" size={22} color="#2563eb"/>

<Text style={styles.sectionTitle}>
Not Ready to Pay
</Text>

</View>

<Text style={styles.sectionSubText}>
Select the reason provided by the customer
</Text>

{/* WILL PAY LUMPSUM */}
<TouchableOpacity
style={styles.optionRowAligned}
onPress={()=>{

logSMAAction(
"LUMPSUM_PROMISE",
"Customer Will Pay Lump Sum Later"
);

setNotReadyChoice("LUMPSUM");

}}
>

<View style={styles.optionLeft}>

<Ionicons name="calendar-outline" size={20} color="#2563eb"/>

<View style={styles.optionTextWrap}>

<Text style={styles.optionTitle}>
Will Pay Lump Sum
</Text>

<Text style={styles.optionSubText}>
Customer promised to pay full amount later
</Text>

</View>
</View>

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>


{/* ALREADY PAID */}
<TouchableOpacity
style={styles.optionRowAligned}
onPress={()=>{

logSMAAction(
"ALREADY_PAID",
"Customer Claims Already Paid"
);

setNotReadyChoice("ALREADY_PAID");

}}
>

<View style={styles.optionLeft}>

<Ionicons name="checkmark-done-outline" size={20} color="#2563eb"/>

<View style={styles.optionTextWrap}>

<Text style={styles.optionTitle}>
Already Paid
</Text>

<Text style={styles.optionSubText}>
Customer says payment already done
</Text>

</View>
</View>

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>

{/* FO NOT VISITED */}
<TouchableOpacity
style={styles.optionRowAligned}
onPress={()=>{

logSMAAction(
"FO_NOT_VISITED",
"Customer Says FO Not Visited"
);

setNotReadyChoice("FO_NOT_VISITED");

}}
>

<View style={styles.optionLeft}>

<Ionicons name="person-outline" size={20} color="#2563eb"/>

<View style={styles.optionTextWrap}>

<Text style={styles.optionTitle}>
FO Not Visited
</Text>

<Text style={styles.optionSubText}>
Customer says field officer never visited
</Text>

</View>
</View>

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>


{/* NOT TAKEN LOAN */}
<TouchableOpacity
style={styles.optionRowAligned}
onPress={()=>{

logSMAAction(
"NOT_TAKEN_LOAN",
"Customer Says Loan Not Taken"
);

setNotReadyChoice("NOT_TAKEN");

}}
>

<View style={styles.optionLeft}>

<Ionicons name="close-circle-outline" size={20} color="#2563eb"/>

<View style={styles.optionTextWrap}>

<Text style={styles.optionTitle}>
Not Taken Loan
</Text>

<Text style={styles.optionSubText}>
Customer claims they did not take this loan
</Text>

</View>
</View>

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>


{/* LOAN BY RELATIVE */}
<TouchableOpacity
style={styles.optionRowAligned}
onPress={()=>{

logSMAAction(
"LOAN_BY_RELATIVE",
"Loan Taken by Relative"
);

setNotReadyChoice("RELATIVE");

}}
>

<View style={styles.optionLeft}>

<Ionicons name="people-outline" size={20} color="#2563eb"/>

<View style={styles.optionTextWrap}>

<Text style={styles.optionTitle}>
Loan Taken by Relative
</Text>

<Text style={styles.optionSubText}>
Customer says relative took this loan
</Text>

</View>
</View>

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>

{/* OTHERS */}
<TouchableOpacity
style={styles.optionRowAligned}
onPress={()=>{

logSMAAction(
"NOT_READY_OTHER",
"Other Reason"
);

setOtherReason("");
setCallStage("NOT_READY");   // ⭐ ADD THIS LINE
setNotReadyChoice("OTHERS");
setShowOtherInput(true);

}}
>

<View style={styles.optionLeft}>

<Ionicons name="ellipsis-horizontal" size={20} color="#2563eb"/>

<View style={styles.optionTextWrap}>

<Text style={styles.optionTitle}>
Others
</Text>

<Text style={styles.optionSubText}>
Specify a different reason
</Text>

</View>
</View>

<Ionicons name="chevron-forward" size={18} color="#94a3b8"/>

</TouchableOpacity>

</View>

)}

{(
  (callStage === "NOT_READY" && notReadyChoice !== null && !calendarMode && !showOtherInput) ||
  (callStage === "SPOKE_OTHER_ACTION" && !calendarMode && !showOtherInput)
) && (

<ThreeActionButtons
  logAction={logSMAAction}

  onSubmit={async ()=>{

    await logSMAAction(
      "NOT_READY_SUBMITTED",
      "Not Ready Reason Submitted",
      {
        reason:notReadyChoice || "OTHER_RESPONSE",
        note:otherReason
      }
    );

    alert("Response Saved");

 console.log("📥 End SMA session", callSessionId);

await fetch(`${BASE_URL}/api/sma/session/end`,{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({sessionId:callSessionId})
});

console.log("✅ SMA session ended", callSessionId);

    setCallSessionId(null);

    setOtherReason("");
    setShowOtherInput(false);
    setNotReadyChoice(null);

    setShowCallFlowModal(false);

  }}

  onScheduleCall={async ()=>{
    setNotReadyChoice(null);
    setCalendarMode("CALL_BACK");
  }}

  onScheduleVisit={async ()=>{
    setNotReadyChoice(null);
    setCalendarMode("NOT_READY_VISIT");
  }}

/>

)}

</View>
</View>
</Modal>

<Modal
visible={showBranchOutcome}
transparent
animationType="fade"
>

<View style={styles.modalOverlay}>
<View style={styles.modalBox}>

<Text style={styles.modalTitle}>
Branch Call Outcome
</Text>

<TouchableOpacity
style={styles.modalButton}
onPress={()=>{

setBranchOutcome("SPOKE");
pushModal("BRANCH_REASON");   // ⭐ ADD

}}
>
<Text style={styles.modalButtonText}>
Spoke to Branch
</Text>
</TouchableOpacity>

<TouchableOpacity
style={styles.modalButton}
onPress={()=>{

setBranchOutcome("NOT_SPOKE");
pushModal("BRANCH_REASON");   // ⭐ ADD

}}
>
<Text style={styles.modalButtonText}>
Didn't Speak to Branch
</Text>
</TouchableOpacity>

</View>
</View>

</Modal>

<Modal
visible={branchOutcome !== null}
transparent
animationType="fade"
>

<View style={styles.modalOverlay}>
<View style={styles.modalBox}>

<View style={{flexDirection:"row",justifyContent:"space-between",width:"100%",marginBottom:10}}>

<TouchableOpacity onPress={()=>{
setBranchOutcome(null);
}}>
<Ionicons name="arrow-back" size={22}/>
</TouchableOpacity>

<TouchableOpacity onPress={()=>{
setBranchOutcome(null);
setShowBranchOutcome(false);
}}>
<Ionicons name="close" size={22}/>
</TouchableOpacity>

</View>

<Text style={styles.modalTitle}>
Enter Branch Response
</Text>

<TextInput
placeholder="Enter reason"
value={branchReason}
onChangeText={setBranchReason}
style={{
borderWidth:1,
borderColor:"#ccc",
borderRadius:8,
padding:12,
marginBottom:15,
height:120,
textAlignVertical:"top"
}}
multiline
/>

<TouchableOpacity
style={styles.modalButton}
onPress={async ()=>{

await logSMAAction(
branchOutcome === "SPOKE"
? "BRANCH_SPOKE"
: "BRANCH_NOT_SPOKE",

branchOutcome === "SPOKE"
? "Spoke to Branch"
: "Didn't Speak to Branch",

{note:branchReason}
);

alert("Branch call updated");

setBranchOutcome(null);
setBranchReason("");
setShowBranchOutcome(false);

}}
>

<Text style={styles.modalButtonText}>
Continue
</Text>

</TouchableOpacity>

</View>
</View>

</Modal>
<Modal
visible={showHistoryModal}
transparent
animationType="slide"
>

<View style={styles.modalOverlay}>

<View style={[styles.modalBox,{maxHeight:"80%"}]}>

<View style={{flexDirection:"row",justifyContent:"space-between"}}>

<Text style={{fontWeight:"bold",fontSize:16}}>
Account History
</Text>

<TouchableOpacity
onPress={()=>setShowHistoryModal(false)}
>
<Ionicons name="close" size={22}/>
</TouchableOpacity>

</View>

{historyLoading ? (
<Text style={{marginTop:20}}>Loading...</Text>
) : (

<FlatList
data={historyData}
keyExtractor={(item,index)=>index.toString()}
renderItem={({item})=>(

<View style={{marginTop:15}}>

<Text style={{
  fontWeight:"bold",
  fontSize:14,
  marginBottom:6,
  color:"#0a3d62"
}}>
{(() => {
  const raw = item?.logs?.[0]?.CreatedAt;
  if (!raw) return "";

  const clean = raw.replace("Z", "");
  const d = new Date(clean);

  const day = String(d.getDate()).padStart(2,"0");
  const month = String(d.getMonth()+1).padStart(2,"0");
  const year = d.getFullYear();

  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2,"0");

  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12 || 12;

  return `${day}/${month}/${year}, ${hours}:${minutes} ${ampm}`;
})()}
</Text>

{item.logs?.map((log,i)=>(

<View
key={i}
style={{flexDirection:"row",marginBottom:6}}
>

<View style={{
width:10,
height:10,
borderRadius:5,
backgroundColor:"#0a3d62",
marginRight:10,
marginTop:5
}}/>

<View style={{flex:1}}>

<Text style={{fontWeight:"600"}}>
{log.ActionLabel}
</Text>

{/* Scheduled Visit Date */}
{log.meta?.visitDate && (
<Text style={{fontSize:12,color:"#444"}}>
📅 {log.meta.visitDate}  
⏰ {log.meta.hour}:{log.meta.minute} {log.meta.ampm}
</Text>
)}

{/* Dialed / Alternate Phone */}
{log.meta?.phoneNumber && (
<Text style={{fontSize:12,color:"#444"}}>
📞 {log.meta.phoneNumber}
</Text>
)}

{/* Notes */}
{log.NoteText && (
<Text style={{fontSize:12,color:"#444"}}>
📝 {log.NoteText}
</Text>
)}

</View>

</View>

))}

</View>

)}
/>

)}

</View>

</View>

</Modal>
</View>

);

}

const styles=StyleSheet.create({

container:{
flex:1,
backgroundColor:"#f4f6f8"
},
icon:{
color:"#fff",
fontSize:20,
fontWeight:"bold"
},
card:{
backgroundColor:"#ffffff",
padding:18,
marginBottom:16,
borderRadius:16,
borderWidth:1,
borderColor:"#e5e7eb",
shadowColor:"#000",
shadowOpacity:0.1,
shadowRadius:6,
elevation:4,
},
header:{
flexDirection:"row",
alignItems:"center",
justifyContent:"space-between",
backgroundColor:"#0a3d62",
paddingVertical:16,
paddingHorizontal:16,
paddingBottom:10,
},

headerTitle:{
color:"#fff",
fontSize:20,
fontWeight:"bold",
paddingTop:15,
},

branchHeader:{
flexDirection:"row",
alignItems:"center",
justifyContent:"center",
marginVertical:3
},

branchIcon:{
fontSize:26,
marginRight:8
},

branchTitle:{
fontSize:20,
fontWeight:"bold",
color:"#0a3d62"
},
cardTitle:{
fontWeight:"bold",
fontSize:16,
marginBottom:8
},

tableHeader:{
flexDirection:"row",
backgroundColor:"#0a3d62"
},

tableRow:{
flexDirection:"row"
},

th:{
color:"#fff",
padding:8,
width:120,
fontWeight:"bold"
},

td:{
padding:8,
width:120,
borderWidth:0.5,
borderColor:"#ddd"
},

tdCenter:{
padding:8,
width:120,
borderWidth:0.5,
borderColor:"#ddd",
textAlign:"center"
},

tdRight:{
padding:8,
width:120,
borderWidth:0.5,
borderColor:"#ddd",
textAlign:"right"
},
row:{
flexDirection:"row",
justifyContent:"space-between",
paddingVertical:10,
borderBottomWidth:0.5,
borderColor:"#ddd"
},

label:{
color:"#6b7280",
fontSize:14
},

value:{
fontWeight:"600",
fontSize:15,
maxWidth:"55%",
textAlign:"right"
},

cardTitle:{
fontSize:18,
fontWeight:"bold",
marginBottom:12,
color:"#0a3d62"
},

callButton:{
marginVertical:10,
backgroundColor:"#0a3d62",
padding:14,
borderRadius:10,
alignItems:"center"
},

callText:{
color:"#fff",
fontWeight:"bold",
fontSize:16
},
tableTitleContainer:{
alignItems:"center",
marginBottom:10
},

tableTitle:{
fontSize:18,
fontWeight:"bold",
color:"#0a3d62"
},
modalOverlay:{
flex:1,
backgroundColor:"rgba(0,0,0,0.5)",
justifyContent:"center",
alignItems:"center"
},

modalBox:{
backgroundColor:"#fff",
width:"90%",
padding:20,
borderRadius:12
},

modalTitle:{
fontSize:18,
fontWeight:"bold",
marginBottom:15,
color:"#0a3d62"
},
sectionCard:{
width:"100%",
paddingVertical:5
},
modalButton:{
backgroundColor:"#0a3d62",
padding:12,
borderRadius:8,
width:"100%",
alignItems:"center",
marginBottom:10
},

modalButtonText:{
color:"#fff",
fontWeight:"bold"
},

modalHeaderRow:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
width:"100%",
marginBottom:10
},

modalCancel:{
marginTop:5,
color:"red",
fontWeight:"bold"
},
optionRowAligned:{
flexDirection:"row",
alignItems:"center",
justifyContent:"space-between",

backgroundColor:"#f8fafc",
borderRadius:14,

padding:16,
marginTop:12,

borderWidth:1,
borderColor:"#e2e8f0",

shadowColor:"#000",
shadowOpacity:0.05,
shadowRadius:4,
elevation:2
},
sectionHeaderRow:{
flexDirection:"row",
alignItems:"center",
marginBottom:6
},

sectionTitle:{
fontSize:18,
fontWeight:"700",
marginLeft:8,
color:"#0a3d62"
},

sectionSubText:{
fontSize:14,
color:"#475569",
marginTop:2,
marginBottom:8
},

optionLeft:{
flexDirection:"row",
alignItems:"center",
flex:1
},

optionTextWrap:{
marginLeft:10,
flex:1
},
optionTitle:{
fontSize:16,
fontWeight:"600",
color:"#1e293b"
},

optionSubText:{
fontSize:13,
color:"#64748b",
marginTop:2
},
smaCard:{
backgroundColor:"#fff",
padding:14,
borderRadius:12,
marginBottom:12,
borderWidth:1,
borderColor:"#e5e7eb",
elevation:3
},

cardHeader:{
flexDirection:"row",
justifyContent:"space-between",
alignItems:"center",
marginBottom:8
},

name:{
fontSize:14,
fontWeight:"700",
color:"#0a3d62"
},

acc:{
fontSize:12,
color:"#555"
},

cardRow:{
flexDirection:"row",
justifyContent:"space-between",
marginTop:4
},

amount:{
fontWeight:"700",
color:"#c0392b"
},
doubleRow:{
flexDirection:"row",
justifyContent:"space-between",
marginTop:6
},

smallText:{
fontSize:13,
color:"#555"
},

iracSmall:{
fontSize:12,
fontWeight:"700",
color:"#0a3d62",
marginTop:2
},
});