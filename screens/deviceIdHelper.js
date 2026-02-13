// deviceIdHelper.js
import AsyncStorage from "@react-native-async-storage/async-storage";
import DeviceInfo from "react-native-device-info";

const DEVICE_KEY = "SMARTREC_DEVICE_ID";

export const getPersistentDeviceId = async () => {
  // 1️⃣ if already stored → use same forever
  let savedId = await AsyncStorage.getItem(DEVICE_KEY);

  if (savedId) {
    return savedId;
  }

  // 2️⃣ generate once
  const newId = await DeviceInfo.getUniqueId();

  // 3️⃣ store permanently
  await AsyncStorage.setItem(DEVICE_KEY, String(newId));

  return String(newId);
};
