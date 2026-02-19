import React, { useState, useEffect } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import BASE_URL from "./config";

export default function MarketingLeadsScreen({ navigation }) {
  const nav = useNavigation();

  const [leads, setLeads] = useState([]);
  const [leadTypeModal, setLeadTypeModal] = useState(false);

  // ⭐ FETCH LEADS WHEN SCREEN OPENS
  useFocusEffect(
    React.useCallback(() => {
      fetchLeads();
    }, [])
  );

  const fetchLeads = async () => {
    try {
      const saved = await AsyncStorage.getItem("LOGGED_USER");
      const user = JSON.parse(saved);

      const res = await fetch(`${BASE_URL}/api/getMyLeads/${user.UserId}`);
      const data = await res.json();

      if (data.success) setLeads(data.leads);
    } catch (err) {
      console.log(err);
      alert("Failed to load leads");
    }
  };

  // ⭐ CARD UI
  const renderLead = ({ item }) => (
    <View style={styles.card}>

      <View style={styles.topRow}>
        <Text style={styles.name}>{item.FullName}</Text>
        <Text style={styles.distance}>0.0 km 📍</Text>
      </View>

      <Text style={styles.status}>Status : {item.SelectLeadType}</Text>

      <View style={styles.middleRow}>
        <View>
          <Text style={styles.info}>Mobile No. {item.MobileNumber}</Text>
          <Text style={styles.info}>Queue : Marketing</Text>
        </View>

        <View style={{alignItems:"flex-end"}}>
          <Text style={styles.info}>Attempt No : --</Text>
          <Text style={styles.info}>Pincode {item.PinCode}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.actions}>
        <View style={styles.iconBtn}>
          <Ionicons name="call" size={18} color="#0a3d62"/>
          <Text style={styles.iconText}>Call</Text>
        </View>

        <View style={styles.iconBtn}>
          <Ionicons name="location" size={18} color="#27ae60"/>
          <Text style={styles.iconText}>Visit</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff"/>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>LIST OF LEADS</Text>

        <TouchableOpacity
          onPress={async () => {
            const saved = await AsyncStorage.getItem("LOGGED_USER");
            const user = JSON.parse(saved);
            nav.reset({ index:0, routes:[{name:"Home", params:{user}}] });
          }}>
          <Ionicons name="home" size={24} color="#fff"/>
        </TouchableOpacity>
      </View>

      {/* LIST */}
      <FlatList
        data={leads}
        keyExtractor={(item,index)=>index.toString()}
        renderItem={renderLead}
        contentContainerStyle={{padding:12}}
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={()=>setLeadTypeModal(true)}>
        <Ionicons name="add" size={30} color="#fff"/>
      </TouchableOpacity>

      {/* LEAD TYPE MODAL */}
      <Modal visible={leadTypeModal} transparent animationType="fade">
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>

            <Text style={styles.modalTitle}>Select Lead Type</Text>

            <TouchableOpacity style={styles.modalBtn}
              onPress={()=>{
                setLeadTypeModal(false);
                navigation.navigate("LeadForm", { type: "Known Lead" });

              }}>
              <Text style={styles.modalText}>KNOWN LEAD</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalBtn}
              onPress={()=>{
                setLeadTypeModal(false);
                navigation.navigate("LeadForm", { type: "Unknown Lead" });

              }}>
              <Text style={styles.modalText}>UNKNOWN LEAD</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
container:{flex:1,backgroundColor:"#f4f6f9"},
header:{height:70,backgroundColor:"#0a3d62",flexDirection:"row",alignItems:"center",justifyContent:"space-between",paddingHorizontal:15,paddingTop:20},
headerTitle:{color:"#fff",fontWeight:"700",fontSize:16},

card:{backgroundColor:"#fff",borderRadius:12,padding:15,marginBottom:12,elevation:3},
topRow:{flexDirection:"row",justifyContent:"space-between"},
name:{fontSize:16,fontWeight:"700",color:"#0a3d62"},
distance:{fontSize:13,color:"#333"},
status:{color:"red",fontWeight:"700",marginVertical:6},
middleRow:{flexDirection:"row",justifyContent:"space-between"},
info:{fontSize:13,color:"#444"},
divider:{height:1,backgroundColor:"#dfe6e9",marginVertical:10},

actions:{flexDirection:"row",justifyContent:"space-around"},
iconBtn:{alignItems:"center"},
iconText:{fontSize:11},

fab:{position:"absolute",bottom:25,right:25,backgroundColor:"#2f54eb",width:60,height:60,borderRadius:30,alignItems:"center",justifyContent:"center",elevation:6},

modalBg:{flex:1,backgroundColor:"rgba(0,0,0,0.5)",justifyContent:"center",alignItems:"center"},
modalCard:{backgroundColor:"#fff",width:"80%",padding:20,borderRadius:12,alignItems:"center"},
modalTitle:{fontSize:18,fontWeight:"700",marginBottom:15},
modalBtn:{backgroundColor:"#2f54eb",padding:12,width:"100%",borderRadius:8,marginVertical:6,alignItems:"center"},
modalText:{color:"#fff",fontWeight:"700"},
});
