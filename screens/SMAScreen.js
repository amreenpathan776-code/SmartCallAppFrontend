import React, { useState, useEffect } from "react";
import {
View,
Text,
TextInput,
TouchableOpacity,
StyleSheet,
} from "react-native";

import RNPickerSelect from "react-native-picker-select";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SMAScreen = ({ navigation }) => {

const [cluster,setCluster] = useState("");
const [branchCode,setBranchCode] = useState("");
const [branchName,setBranchName] = useState("");
const [irac,setIrac] = useState("");

const [mode,setMode] = useState(""); 
const [selectedIRAC,setSelectedIRAC] = useState("");

const [step,setStep] = useState("IRAC");

useEffect(()=>{

const unsubscribe = navigation.addListener("beforeRemove", e=>{

if(step === "FILTER"){
e.preventDefault();
setStep("CLUSTER");
return;
}

if(step === "CLUSTER"){
e.preventDefault();
setStep("IRAC");

setCluster("");
setMode("");
setSelectedIRAC("");
setBranchCode("");
setBranchName("");
setIrac("");

return;
}

});

return unsubscribe;

},[step]);

const clusterOptions = [

{label:"Krishna",value:"Krishna"},
{label:"Guntur",value:"Guntur"},
{label:"West Godavari",value:"West Godavari"},
{label:"Visakhapatnam",value:"Visakhapatnam"}

];
let iracOptions = [];

if(selectedIRAC){

iracOptions = [
{label:selectedIRAC,value:selectedIRAC}
];

}

else if(mode === "SMA"){

iracOptions = [

{label:"0",value:"0"},
{label:"1",value:"1"},
{label:"2",value:"2"},
{label:"3",value:"3"},
{label:"4",value:"4"}

];

}

else if(mode === "NPA"){

iracOptions = [
{label:"5",value:"5"},
{label:"6",value:"6"},
{label:"7",value:"7"}

];

}

const handleApplyFilters = () => {

navigation.navigate("SMAResults",{

cluster,
branchCode,
branchName,
irac:selectedIRAC || irac,
mode

});

};

const handleClearFilters = () => {

setBranchCode("");
setBranchName("");
setIrac("");

};

const handleAllBranches = () => {

navigation.navigate("SMAResults",{

cluster,
branchCode:"",
branchName:"",
irac:selectedIRAC || "",
mode

});

};
return (
<View style={styles.container}>

{/* HEADER */}
<View style={styles.header}>

<TouchableOpacity
style={styles.headerIcon}
onPress={() => {

if(step === "FILTER"){
setStep("CLUSTER");
return;
}

if(step === "CLUSTER"){
setStep("IRAC");
return;
}

navigation.goBack();

}}
>
<Ionicons name="arrow-back" size={24} color="#fff"/>
</TouchableOpacity>

<Text style={styles.headerTitle}>
NPA & SMA
</Text>

<TouchableOpacity
style={styles.headerIconRight}
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
<Ionicons name="home" size={24} color="#fff"/>
</TouchableOpacity>

</View>

<View style={styles.centerBox}>


{/* STEP 1 : IRAC */}

{step === "IRAC" && (

<>

<Text style={styles.title}>
NPA & SMA Follow-Up
</Text>

<View style={styles.dropdownBox}>

<RNPickerSelect
value={selectedIRAC}
onValueChange={(value)=>{
setSelectedIRAC(value);
setStep("CLUSTER");
}}

items={[
{label:"0",value:"0"},
{label:"1",value:"1"},
{label:"2",value:"2"},
{label:"3",value:"3"},
{label:"4",value:"4"},
{label:"5",value:"5"},
{label:"6",value:"6"},
{label:"7",value:"7"}
]}

placeholder={{label:"Select New IRAC",value:""}}

useNativeAndroidPickerStyle={false}

style={{
inputAndroid:{
color:"#000",
fontSize:16,
paddingVertical:10,
paddingHorizontal:10
},
inputIOS:{
color:"#000",
fontSize:16,
paddingVertical:10,
paddingHorizontal:10
}
}}

Icon={() => (
<Ionicons
name="chevron-down"
size={20}
color="#555"
/>
)}

 />

</View>


<TouchableOpacity
style={styles.button}
onPress={()=>{

setMode("SMA");
setStep("CLUSTER");

}}
>
<Text style={styles.buttonText}>SMA</Text>
</TouchableOpacity>


<TouchableOpacity
style={styles.button}
onPress={()=>{

setMode("NPA");
setStep("CLUSTER");

}}
>
<Text style={styles.buttonText}>NPA</Text>
</TouchableOpacity>

</>

)}



{/* STEP 2 : CLUSTER */}

{step === "CLUSTER" && (

<>

<Text style={styles.sectionHeader}>
Select Cluster
</Text>

<View style={styles.dropdownBox}>

<RNPickerSelect
onValueChange={(value)=>{

if(!value) return;

setCluster(value);
setStep("FILTER");

}}

items={clusterOptions}

placeholder={{label:"Select Cluster",value:""}}

useNativeAndroidPickerStyle={false}

style={{
inputAndroid:{
color:"#000",
fontSize:16,
paddingVertical:10,
paddingHorizontal:10
},
inputIOS:{
color:"#000",
fontSize:16,
paddingVertical:10,
paddingHorizontal:10
}
}}

Icon={()=>(

<Ionicons
name="chevron-down"
size={20}
color="#555"
style={{marginRight:10}}
/>

)}

 />

</View>

</>

)}



{/* STEP 3 : FILTER */}

{step === "FILTER" && (

<>

<Text style={styles.sectionHeader}>
Apply Filters
</Text>

<Text style={styles.clusterLabel}>
Cluster: {cluster}
</Text>


<TextInput
style={styles.input}
placeholder="Branch Code"
placeholderTextColor="#64748B"
keyboardType="numeric"
value={branchCode}
onChangeText={setBranchCode}
/>


<TextInput
style={styles.input}
placeholder="Branch Name"
placeholderTextColor="#64748B"
value={branchName}
onChangeText={setBranchName}
/>
<View style={styles.dropdownBox}>

<RNPickerSelect

value={selectedIRAC || irac}

onValueChange={(value)=>setIrac(value)}

items={iracOptions}

disabled={selectedIRAC ? true : false}

placeholder={{label:"Select New IRAC",value:""}}

useNativeAndroidPickerStyle={false}

style={{
inputAndroid:{
color:"#000",
fontSize:16,
paddingVertical:12,
paddingHorizontal:10
},
inputIOS:{
color:"#000",
fontSize:16,
paddingVertical:12,
paddingHorizontal:10
},
iconContainer:{
top:12,
right:10
}
}}

Icon={()=>(

<Ionicons
name="chevron-down"
size={20}
color="#555"
style={{marginRight:10}}
/>

)}

 />

</View>


<TouchableOpacity
style={styles.button}
onPress={handleApplyFilters}
>
<Text style={styles.buttonText}>
Apply Filters
</Text>
</TouchableOpacity>


<TouchableOpacity
style={[styles.button,styles.clearButton]}
onPress={handleClearFilters}
>
<Text style={styles.clearButtonText}>
Clear Filters
</Text>
</TouchableOpacity>


<TouchableOpacity
style={[styles.button,styles.allButton]}
onPress={handleAllBranches}
>
<Text style={styles.buttonText}>
All Branches
</Text>
</TouchableOpacity>

</>

)}

</View>

</View>

);

};

export default SMAScreen;
const styles = StyleSheet.create({

container:{
flex:1,
backgroundColor:"#F8FAFC"
},

centerBox:{
flex:1,
justifyContent:"center",
width:"85%",
alignSelf:"center",
marginTop:-90
},

title:{
fontSize:24,
fontWeight:"bold",
marginBottom:30,
textAlign:"center",
alignSelf:"center"
},

input:{
borderWidth:1,
borderColor:"#CBD5E1",
padding:10,
borderRadius:8,
marginBottom:20,
backgroundColor:"#fff"
},

button:{
backgroundColor:"#2563EB",
paddingVertical:15,
borderRadius:10,
alignItems:"center",
marginBottom:20
},

buttonText:{
color:"#fff",
fontSize:16,
fontWeight:"bold"
},

clearButton:{
backgroundColor:"#E2E8F0"
},

clearButtonText:{
color:"#1E293B",
fontSize:16,
fontWeight:"bold"
},

allButton:{
backgroundColor:"#16A34A"
},

clusterLabel:{
fontSize:16,
fontWeight:"bold",
marginBottom:15
},
sectionHeader:{
fontSize:20,
fontWeight:"bold",
marginBottom:15,
color:"#0a3d62",
textAlign:"center"
},
dropdownBox:{
borderWidth:1,
borderColor:"#ccc",
borderRadius:8,
backgroundColor:"#fff",
paddingHorizontal:10,
paddingVertical:6,
marginBottom:20,
justifyContent:"center"
},
header:{
flexDirection:"row",
alignItems:"center",
justifyContent:"space-between",
backgroundColor:"#0a3d62",
paddingVertical:10,
paddingHorizontal:10
},

headerTitle:{
color:"#fff",
fontSize:20,
fontWeight:"bold",
textAlign:"center",
flex:1,
paddingTop:20
},

headerIcon:{
width:40,
paddingTop:25
},

headerIconRight:{
width:40,
alignItems:"flex-end"
},
});
