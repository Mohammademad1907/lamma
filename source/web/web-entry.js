// Bundled for the Google sign-in page on GitHub Pages (runs in a normal browser, not the app).
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
window.FBW = { initializeApp, getAuth, GoogleAuthProvider, signInWithPopup };
