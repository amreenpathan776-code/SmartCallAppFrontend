import BASE_URL from "./config";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const logFailure = async (type, message, extra = {}) => {
  try {
    const saved = await AsyncStorage.getItem("LOGGED_USER");
    const user = saved ? JSON.parse(saved) : null;

    await fetch(`${BASE_URL}/api/log/client-failure`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        message,
        userId: user?.UserId,
        userName: user?.UserName,
        extra
      })
    });

  } catch (e) {
    console.log("Failure log send error", e);
  }
};