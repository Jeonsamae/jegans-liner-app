import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const firebaseConfig = {
  apiKey: "AIzaSyDJ1T09s8K3Q0EBhWQ2W87_teVBUwGQc0k",
  authDomain: "jegans-liner-app-e1e86.firebaseapp.com",
  projectId: "jegans-liner-app-e1e86",
  storageBucket: "jegans-liner-app-e1e86.firebasestorage.app",
  messagingSenderId: "14516934945",
  appId: "1:14516934945:web:eaee1a3283bf70439cc660"
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
