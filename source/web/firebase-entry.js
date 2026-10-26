// Bundled with esbuild into app/assets/lib/firebase.js; exposes the pieces Lamma uses as window.FB.
import { initializeApp } from 'firebase/app';
import {
  initializeAuth, browserLocalPersistence, connectAuthEmulator, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile,
  GoogleAuthProvider, signInWithCredential, signInWithPopup, browserPopupRedirectResolver,
} from 'firebase/auth';
import {
  initializeFirestore, connectFirestoreEmulator, doc, collection, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, writeBatch, deleteField, limit, arrayUnion, arrayRemove,
} from 'firebase/firestore';

window.FB = {
  initializeApp, initializeAuth, browserLocalPersistence, connectAuthEmulator, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile,
  GoogleAuthProvider, signInWithCredential, signInWithPopup, browserPopupRedirectResolver,
  initializeFirestore, connectFirestoreEmulator, doc, collection, getDoc, getDocs, setDoc, updateDoc,
  deleteDoc, onSnapshot, query, where, orderBy, serverTimestamp, writeBatch, deleteField, limit, arrayUnion, arrayRemove,
};
