// Firestore repository wrapper
// Centralize Firestore primitives and db access

import { db } from '../firebase';
import {
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  runTransaction,
  collectionGroup,
  Timestamp
} from 'firebase/firestore';

export {
  db,
  collection,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  runTransaction,
  collectionGroup,
  Timestamp,
};
