import Geolocation from 'react-native-geolocation-service';
import { Alert, Linking } from 'react-native';

export const getUserLocation = () => {
  return new Promise((resolve, reject) => {

    Geolocation.getCurrentPosition(
      position => {
        console.log("LOCATION SUCCESS:", position);
        resolve(position);
      },
      error => {
        console.log("LOCATION ERROR:", error);

        // GPS OFF case (this is your crash)
        if (error.code === 2) {
          Alert.alert(
            "Location Disabled",
            "Please turn ON Location/GPS to continue visit.",
            [
              { text: "Open Settings", onPress: () => Linking.openSettings() }
            ]
          );
        }

        reject(error);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
        forceRequestLocation: true,
        showLocationDialog: true,
      }
    );
  });
};
