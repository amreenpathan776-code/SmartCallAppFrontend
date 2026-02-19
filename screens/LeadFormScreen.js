import React, { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, TouchableOpacity
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Calendar } from "react-native-calendars";
import BASE_URL from "./config";  
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";

export default function LeadFormScreen({ navigation, route }) {
  const nav = useNavigation();

  const { type } = route.params;

  const [leadName, setLeadName] = useState("");
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [dob, setDob] = useState("");

  const [productCategory, setProductCategory] = useState("");
  const [product, setProduct] = useState("");
  const [leadType, setLeadType] = useState("");

  const [showCalendar, setShowCalendar] = useState(false);
  const [showCategoryOptions, setShowCategoryOptions] = useState(false);
  const [showProductOptions, setShowProductOptions] = useState(false);
  const [showLeadTypeOptions, setShowLeadTypeOptions] = useState(false);
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);

  const [tempSelectedDate, setTempSelectedDate] = useState("");
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 80 }, (_, i) => currentYear - i);

  const months = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December"
  ];

  /* ⭐ PRODUCT DATA (DEPENDENT DROPDOWN) */
  const PRODUCT_DATA = {
    Deposits: [
      "Savings Account",
      "Current Account",
      "Recurring Deposit",
      "Fixed Deposit",
      "Others"
    ],
    Loans: [
      "Gold Loan",
      "Housing Loan",
      "Business Loan",
      "Agricultural Loan",
      "Unsecured Loan",
      "Others"
    ]
  };

  const closeAllDropdowns = () => {
    setShowCategoryOptions(false);
    setShowProductOptions(false);
    setShowLeadTypeOptions(false);
    setShowYearDropdown(false);
    setShowMonthDropdown(false);
  };
// 📱 Allow only Indian mobile typing
const handleMobileChange = (text) => {
  // remove all non digits
  let cleaned = text.replace(/[^0-9]/g, "");

  // allow only first digit 6-9
  if (cleaned.length === 1 && !/[6-9]/.test(cleaned)) {
    return;
  }

  // allow max 10 digits
  if (cleaned.length <= 10) {
    setMobile(cleaned);
  }
};

// 📮 Allow only 6 digit pincode typing
const handlePincodeChange = (text) => {
  let cleaned = text.replace(/[^0-9]/g, "");

  if (cleaned.length <= 6) {
    setPincode(cleaned);
  }
};

const saveLead = async () => {
  try {
// ================= VALIDATION =================

// Required fields
if (!leadName || !mobile || !productCategory || !product || !leadType) {
  alert("Please fill all mandatory fields");
  return;
}

// 🇮🇳 Mobile validation
const mobileRegex = /^[6-9]\d{9}$/;
if (!mobileRegex.test(mobile)) {
  alert("Enter valid Indian mobile number (10 digits starting with 6-9)");
  return;
}

// 📮 Pincode validation (only if entered)
if (pincode && !/^\d{6}$/.test(pincode)) {
  alert("Pincode must be exactly 6 digits");
  return;
}

    // ⭐ get logged user from AsyncStorage (same as visit screen)
    const userStr = await AsyncStorage.getItem("LOGGED_USER");
    const user = JSON.parse(userStr);

    const payload = {
      BranchCode: user?.BranchCode || "001",
      BranchName: user?.BranchName || "Main Branch",
      UserID: user?.UserId,
      UserName: user?.UserName,

      LeadCategory: type, // KNOWN / UNKNOWN
      FullName: leadName,
      MobileNumber: mobile,
      Address: address,
      PinCode: pincode,
      DOB: dob,

      ProductCategory: productCategory,
      SelectProduct: product,
      SelectLeadType: leadType
    };

    console.log("Sending Lead →", payload);

    const res = await fetch(`${BASE_URL}/api/saveLead`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (data.success) {
      alert("Lead Saved Successfully 🎉");
      navigation.goBack();
    } else {
      alert("Failed to save lead");
    }

  } catch (error) {
    console.log(error);
    alert("Server error while saving lead");
  }
};


  const DropdownField = ({ value, placeholder, onPress, onReset }) => (
    <TouchableOpacity style={styles.dropdownField} onPress={onPress}>
      <Text style={{color:value ? "#000" : "#94a3b8"}}>
        {value || placeholder}
      </Text>
      <View style={styles.rightIcons}>
        {value !== "" && (
          <Ionicons name="close-circle" size={20} color="#94a3b8" onPress={onReset}/>
        )}
        <Ionicons name="chevron-down" size={20} color="#64748b"/>
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
          {type === "KNOWN" ? "KNOWN LEAD" : "UNKNOWN LEAD"}
        </Text>
<TouchableOpacity
  onPress={async () => {
    const saved = await AsyncStorage.getItem("LOGGED_USER");
    const user = saved ? JSON.parse(saved) : null;

    nav.reset({
      index: 0,
      routes: [{ name: "Home", params: { user } }],
    });
  }}
>
  <Ionicons name="home" size={22} color="#fff" />
</TouchableOpacity>
      </View>

      {/* FORM */}
      <ScrollView contentContainerStyle={{ padding: 15 }}>
        <View style={styles.card}>

          <Input label="Enter Lead Name *" value={leadName} onChangeText={setLeadName}/>
<Input
  label="Enter Lead Mobile Number *"
  keyboard="phone-pad"
  value={mobile}
  onChangeText={handleMobileChange}
/>
          <Input label="Enter Lead Address" multiline value={address} onChangeText={setAddress}/>
<Input
  label="Enter Lead Pincode"
  keyboard="number-pad"
  value={pincode}
  onChangeText={handlePincodeChange}
/>


          <Text style={styles.inputLabel}>Date of Birth</Text>
          <DropdownField
            value={dob}
            placeholder="Select Date of Birth"
            onPress={()=>{ setTempSelectedDate(""); setShowCalendar(true); }}
            onReset={()=>setDob("")}
          />

          {/* PRODUCT CATEGORY */}
          <Text style={styles.inputLabel}>Product Category</Text>
          <DropdownField
            value={productCategory}
            placeholder="Select Product Category"
            onPress={()=>{ closeAllDropdowns(); setShowCategoryOptions(!showCategoryOptions); }}
            onReset={()=>setProductCategory("")}
          />

   {showCategoryOptions && (
  <ScrollView
    style={styles.dropdown}
    nestedScrollEnabled={true}
    keyboardShouldPersistTaps="handled"
  >

              {["Deposits","Loans"].map(item=>(
                <TouchableOpacity key={item} style={styles.dropdownItem}
                  onPress={()=>{
                    setProductCategory(item);
                    setProduct(""); // reset product
                    setShowCategoryOptions(false);
                  }}>
                  <Text>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* PRODUCT */}
          <Text style={styles.inputLabel}>Product</Text>
          <DropdownField
            value={product}
            placeholder="Select Product"
            onPress={()=>{
              if(productCategory===""){
                alert("Please select Product Category first");
                return;
              }
              closeAllDropdowns();
              setShowProductOptions(!showProductOptions);
            }}
            onReset={()=>setProduct("")}
          />
{showProductOptions && (
  <ScrollView
    style={styles.dropdown}
    nestedScrollEnabled={true}
    keyboardShouldPersistTaps="handled"
  >
              {PRODUCT_DATA[productCategory].map(item => (
                <TouchableOpacity key={item} style={styles.dropdownItem}
                  onPress={()=>{ setProduct(item); setShowProductOptions(false); }}>
                  <Text>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* LEAD TYPE */}
          <Text style={styles.inputLabel}>Lead Type</Text>
          <DropdownField
            value={leadType}
            placeholder="Select Lead Type"
            onPress={()=>{ closeAllDropdowns(); setShowLeadTypeOptions(!showLeadTypeOptions); }}
            onReset={()=>setLeadType("")}
          />
{showLeadTypeOptions && (
  <ScrollView
    style={styles.dropdown}
    nestedScrollEnabled={true}
    keyboardShouldPersistTaps="handled"
  >
              {["Hot Lead","Warm Lead","Cold Lead"].map(item=>(
                <TouchableOpacity key={item} style={styles.dropdownItem}
                  onPress={()=>{ setLeadType(item); setShowLeadTypeOptions(false); }}>
                  <Text style={{fontWeight:"600"}}>{item}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

        </View>

        <TouchableOpacity style={styles.submitBtn} onPress={saveLead}>
          <Text style={styles.submitText}>SAVE LEAD</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* DOB MODAL */}
      {showCalendar && (
        <View style={styles.calendarModal}>
          <View style={styles.calendarBox}>

            <View style={styles.calendarHeaderRow}>
              <TouchableOpacity onPress={()=>setShowCalendar(false)}>
                <Ionicons name="arrow-back" size={24} color="#0a3d62"/>
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>Select Date of Birth</Text>
              <View style={{width:24}} />
            </View>

            {/* YEAR + MONTH */}
            <View style={styles.yearMonthRow}>
              <View style={{flex:1}}>
                <DropdownField
                  value={selectedYear}
                  placeholder="Year"
                  onPress={()=>setShowYearDropdown(!showYearDropdown)}
                  onReset={()=>setSelectedYear("")}
                />
              </View>
              <View style={{width:12}} />
              <View style={{flex:1}}>
                <DropdownField
                  value={selectedMonth !== "" ? months[selectedMonth] : ""}
                  placeholder="Month"
                  onPress={()=>setShowMonthDropdown(!showMonthDropdown)}
                  onReset={()=>setSelectedMonth("")}
                />
              </View>
            </View>

            {showYearDropdown && (
              <ScrollView style={styles.dropdownList}>
                {years.map(y=>(
                  <TouchableOpacity key={y} style={styles.dropdownItem}
                    onPress={()=>{ setSelectedYear(y); setShowYearDropdown(false); }}>
                    <Text>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {showMonthDropdown && (
              <ScrollView style={styles.dropdownList}>
                {months.map((m,i)=>(
                  <TouchableOpacity key={m} style={styles.dropdownItem}
                    onPress={()=>{ setSelectedMonth(i); setShowMonthDropdown(false); }}>
                    <Text>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <Calendar
              current={`${selectedYear || currentYear}-${String((selectedMonth!==""?selectedMonth+1:new Date().getMonth()+1)).padStart(2,'0')}-01`}
              onDayPress={(day)=> setTempSelectedDate(day.dateString)}
              markedDates={{
                [tempSelectedDate]: { selected:true, selectedColor:"#2f54eb", selectedTextColor:"#fff" }
              }}
              theme={{ todayTextColor:"#2f54eb", arrowColor:"#2f54eb" }}
            />

            <TouchableOpacity
              style={styles.confirmCenteredBtn}
              onPress={()=>{
                if(tempSelectedDate===""){ alert("Please select date"); return; }
                setDob(tempSelectedDate);
                setShowCalendar(false);
              }}>
              <Text style={styles.confirmCenteredText}>Confirm Date</Text>
            </TouchableOpacity>

          </View>
        </View>
      )}

    </View>
  );
}

/* INPUT COMPONENT */
const Input = ({ label, value, onChangeText, multiline, keyboard }) => (
  <View style={{marginBottom:16}}>
    <Text style={styles.inputLabel}>{label}</Text>
    <TextInput
      style={[styles.input, multiline && {height:80,textAlignVertical:"top"}]}
      value={value}
      onChangeText={onChangeText}
      multiline={multiline}
      keyboardType={keyboard || "default"}
      placeholder={label}
    />
  </View>
);
const styles = StyleSheet.create({
container:{flex:1,backgroundColor:"#f4f6f9"},
header:{height:70,backgroundColor:"#0a3d62",flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:15,paddingTop:20},
headerTitle:{color:"#fff",fontWeight:"700",fontSize:16},
card:{backgroundColor:"#fff",borderRadius:12,padding:18,elevation:3},
inputLabel:{fontWeight:"600",color:"#0a3d62",marginBottom:6},
input:{borderWidth:1,borderColor:"#e2e8f0",borderRadius:10,padding:12,backgroundColor:"#f8fafc"},
submitBtn:{margin:20,backgroundColor:"#2f54eb",padding:16,borderRadius:10,alignItems:"center"},
submitText:{color:"#fff",fontWeight:"700",fontSize:16},

dropdown:{
  backgroundColor:"#fff",
  borderWidth:1,
  borderColor:"#e2e8f0",
  borderRadius:10,
  maxHeight:180,
  elevation:5,
  zIndex:999
},
dropdownItem:{padding:12,borderBottomWidth:1,borderColor:"#eee"},

dropdownField:{borderWidth:1,borderColor:"#e2e8f0",borderRadius:10,backgroundColor:"#f8fafc",paddingHorizontal:12,height:48,flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:10},
rightIcons:{flexDirection:"row",alignItems:"center",gap:6},

calendarModal:{position:"absolute",top:0,bottom:0,left:0,right:0,backgroundColor:"rgba(0,0,0,0.4)",justifyContent:"center",alignItems:"center"},
calendarBox:{backgroundColor:"#fff",width:"90%",borderRadius:12,padding:15},
calendarTitle:{fontSize:16,fontWeight:"700",color:"#0a3d62"},
calendarHeaderRow:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",marginBottom:10},

yearMonthRow:{flexDirection:"row",alignItems:"center",marginBottom:10},
dropdownList:{maxHeight:150,borderWidth:1,borderColor:"#eee",borderRadius:8,marginBottom:10},

confirmCenteredBtn:{marginTop:20,backgroundColor:"#2f54eb",paddingVertical:14,borderRadius:10,alignItems:"center"},
confirmCenteredText:{color:"#fff",fontWeight:"700",fontSize:16}
});
