import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, collection, getDocs, query, orderBy, serverTimestamp, arrayUnion } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIza" + "SyAH22AT6fP9cuDAFq8sXBLi9GFu9cvWgE4",
    authDomain: "jee-bb.firebaseapp.com",
    projectId: "jee-bb",
    storageBucket: "jee-bb.firebasestorage.app",
    messagingSenderId: "341400606572",
    appId: "1:341400606572:web:6b992fd542d29e9da68549",
    measurementId: "G-3CMSTEF4CR"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

const provider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (err: any) {
    console.error("Auth Error:", err);
    throw err;
  }
};

export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (err: any) {
    console.error("Sign Out Error:", err);
    throw err;
  }
};

export { auth, db };
