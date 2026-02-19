import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import WelcomeScreen from "./WelcomeScreen";
import LoginScreen from "./LoginScreen";
import RegisterScreen from "./RegisterScreen";
import HomeScreen from "./HomeScreen";
import NPAScreen from "./NPAScreen";
import DPDListScreen from "./DPDListScreen";
import AccountDetailsScreen from "./AccountDetailsScreen";
import TodayScheduleList from "./TodayScheduleList";
import MarketingLeadsScreen from "./MarketingLeadsScreen";
import LeadFormScreen from "./LeadFormScreen";

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="NPA" component={NPAScreen} />
        <Stack.Screen name="DPDList" component={DPDListScreen} />
        <Stack.Screen name="AccountDetails" component={AccountDetailsScreen} />
<Stack.Screen name="TodayScheduleList" component={TodayScheduleList}/>
<Stack.Screen 
  name="Marketing" 
  component={MarketingLeadsScreen}
/>
<Stack.Screen name="LeadForm" component={LeadFormScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
