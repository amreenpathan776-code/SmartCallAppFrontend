import SendIntentAndroid from "react-native-send-intent";
import { Alert } from "react-native";

export const openVonageDialer = async (phoneNumber) => {
  try {
    // 1️⃣ Check Vonage app installed
    const isInstalled = await SendIntentAndroid.isAppInstalled(
      "com.vonage.business"
    );

    if (!isInstalled) {
      Alert.alert(
        "Vonage Not Installed",
        "Please install Vonage Business app to make calls."
      );
      return;
    }

    // 2️⃣ Open Vonage app
    await SendIntentAndroid.openApp("com.vonage.business");

    // 3️⃣ Copy number to clipboard (so agent pastes instantly)
    await SendIntentAndroid.copyToClipboard(phoneNumber);

  } catch (error) {
    console.log("Vonage open error:", error);
    Alert.alert("Error", "Unable to open Vonage app");
  }
};
