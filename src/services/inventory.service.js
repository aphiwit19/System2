// Inventory service layer
import { db, collection, addDoc, getDocs, doc, query, orderBy, Timestamp } from '../repositories/firestore';

export async function addInventoryHistory(productId, historyData) {
  try {
    const productRef = doc(db, 'products', productId);
    const historyCollection = collection(productRef, 'inventory_history');
    const historyDoc = {
      date: (historyData.date && historyData.date.toDate)
        ? historyData.date
        : (typeof historyData.date === 'string'
            ? Timestamp.fromDate(new Date(historyData.date))
            : Timestamp.fromDate(historyData.date || new Date())),
      costPrice: historyData.costPrice === null || historyData.costPrice === undefined ? null : parseFloat(historyData.costPrice),
      quantity: parseInt(historyData.quantity || 0),
      type: historyData.type || 'in',
      source: historyData.source || null,
      orderId: historyData.orderId || null,
      actorUid: historyData.actorUid || null,
      createdAt: Timestamp.now(),
    };
    const docRef = await addDoc(historyCollection, historyDoc);
    return docRef.id;
  } catch (error) {
    console.error('Error adding inventory history:', error);
    throw error;
  }
}

export async function getInventoryHistory(productId) {
  try {
    const productRef = doc(db, 'products', productId);
    const historyCollection = collection(productRef, 'inventory_history');
    const q = query(historyCollection, orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting inventory history:', error);
    throw error;
  }
}
