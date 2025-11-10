// Users service layer
import { db, collection, getDocs, orderBy, query, updateDoc, doc, getDoc as getDocRef } from '../repositories/firestore';

export async function getAllUsers() {
  try {
    const q = query(collection(db, 'users'), orderBy('email'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting users:', error);
    throw error;
  }
}

export async function updateUserRole(userId, role) {
  try {
    await updateDoc(doc(db, 'users', userId), { role });
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

export async function getUserById(userId) {
  try {
    const docRef = doc(db, 'users', userId);
    const snap = await getDocRef(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    throw new Error('User not found');
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
}
