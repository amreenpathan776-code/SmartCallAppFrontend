import { Platform } from "react-native";
import Geolocation from "react-native-geolocation-service";
import {
  check,
  request,
  PERMISSIONS,
  RESULTS,
  openSettings,
} from "react-native-permissions";

// ⭐⭐⭐ VERY IMPORTANT ⭐⭐⭐
Geolocation.setRNConfiguration({
  skipPermissionRequests: true,
  authorizationLevel: "whenInUse",
});


// ⭐ GOOGLE API KEY (single place only)
const GOOGLE_API_KEY = "AIzaSyC9Km_CstWYCOPoY1fFZaKLonjsurrqWBA"

// ===============================
// LOCATION PERMISSION
// ===============================
export const requestLocationPermission = async () => {
  try {
    const permission =
      Platform.OS === "android"
        ? PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
        : PERMISSIONS.IOS.LOCATION_WHEN_IN_USE;

    let status = await check(permission);

    if (status === RESULTS.DENIED) {
      status = await request(permission);
    }

    if (status === RESULTS.GRANTED) return true;

    if (status === RESULTS.BLOCKED) {
      openSettings();
      return false;
    }

    return false;
  } catch (error) {
    console.log("Permission error:", error);
    return false;
  }
};

export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (position) => resolve(position),
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000,
        forceRequestLocation: true,
        showLocationDialog: true,
      }
    );
  });
};


// ===============================
// GOOGLE REVERSE GEOCODING
// ===============================
export const getAddressFromCoordsGoogle = async (lat, lng) => {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      return data.results[0].formatted_address;
    }

    return "Address not found";
  } catch (error) {
    console.log("Google Geocoding Error:", error);
    return "Unable to fetch address";
  }
};

// ===============================
// GOOGLE DISTANCE MATRIX
// ===============================
export const getDistanceKmGoogle = async (origin, destination) => {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.rows.length > 0) {
      const meters = data.rows[0].elements[0].distance.value;
      return meters / 1000;
    }

    return null;
  } catch (error) {
    console.log("Distance API Error:", error);
    return null;
  }
};
// ===============================
// ADDRESS → LAT/LNG (FORWARD GEOCODING)
// ===============================
export const getCoordsFromAddressGoogle = async (address) => {
  try {
    const url =
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

    if (data.status === "OK" && data.results.length > 0) {
      const location = data.results[0].geometry.location;

      return {
        latitude: location.lat,
        longitude: location.lng,
        formattedAddress: data.results[0].formatted_address,
      };
    }

    return null;
  } catch (error) {
    console.log("Address → LatLng error:", error);
    return null;
  }
};
