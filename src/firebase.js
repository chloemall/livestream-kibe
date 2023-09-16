import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA4A4s3sokSKTzI_oVynns34GQbn4pTdVg",
  authDomain: "live-808d2.firebaseapp.com",
  projectId: "live-808d2",
  storageBucket: "live-808d2.appspot.com",
  messagingSenderId: "601133884967",
  appId: "1:601133884967:web:58ec0dfd9903ec3a93d002"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };