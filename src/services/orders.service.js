// Orders service layer
import { db, collection, doc, Timestamp, runTransaction, collectionGroup, getDocs, query, orderBy, getDoc, updateDoc } from '../repositories/firestore';
import { addInventoryHistory } from './inventory.service';

export async function createWithdrawal(payload) {
  try {
    const method = (payload.deliveryMethod || 'shipping');
    const withdrawDoc = {
      items: (payload.items || []).map(it => ({
        productId: it.productId,
        productName: it.productName || null,
        price: parseFloat(it.price || 0),
        quantity: parseInt(it.quantity || 0),
        subtotal: parseFloat(it.subtotal || 0),
      })),
      requestedBy: payload.requestedBy || null,
      requestedAddress: payload.requestedAddress || '',
      receivedBy: payload.receivedBy || null,
      receivedAddress: payload.receivedAddress || '',
      withdrawDate: Timestamp.fromDate(new Date(payload.withdrawDate || new Date())),
      total: parseFloat(payload.total || 0),
      shippingCarrier: payload.shippingCarrier || null,
      trackingNumber: payload.trackingNumber || '',
      shippingStatus: method === 'pickup' ? 'ส่งสำเร็จ' : (payload.shippingStatus || 'รอดำเนินการ'),
      deliveryMethod: method,
      createdAt: Timestamp.now(),
      createdByUid: payload.createdByUid || null,
      createdByEmail: payload.createdByEmail || null,
      createdSource: payload.createdSource || null,
    };

    if (!withdrawDoc.createdByUid) throw new Error('ไม่พบ UID ของผู้สร้างคำสั่ง');
    const userOrdersCol = collection(db, 'users', withdrawDoc.createdByUid, 'orders');
    const newWithdrawRef = doc(userOrdersCol);

    await runTransaction(db, async (tx) => {
      const productStates = [];
      for (const it of withdrawDoc.items) {
        const pRef = doc(db, 'products', it.productId);
        const pSnap = await tx.get(pRef);
        if (!pSnap.exists()) throw new Error('ไม่พบสินค้า');
        const data = pSnap.data();
        const qty = parseInt(data.quantity || 0);
        const reserved = parseInt(data.reserved || 0);
        const cost = parseFloat(data.costPrice || 0);
        const req = parseInt(it.quantity || 0);
        const available = qty - reserved;
        if (req <= 0) throw new Error('จำนวนที่สั่งไม่ถูกต้อง');
        if (available < req && method !== 'pickup') throw new Error('สต๊อกไม่พอสำหรับบางรายการ');
        productStates.push({ pRef, qty, reserved, req, costPrice: cost });
      }

      for (const s of productStates) {
        if (method === 'pickup') {
          const nextQty = Math.max(0, s.qty - s.req);
          tx.update(s.pRef, { quantity: nextQty, updatedAt: Timestamp.now() });
          const productHistoryCol = collection(s.pRef, 'inventory_history');
          const histRef = doc(productHistoryCol);
          const outSource = withdrawDoc.createdSource === 'customer' ? 'order_customer_pickup' : 'order_staff_pickup';
          tx.set(histRef, {
            date: Timestamp.now(),
            costPrice: s.costPrice ?? null,
            quantity: s.req,
            type: 'out',
            source: outSource,
            orderId: newWithdrawRef.id,
            actorUid: withdrawDoc.createdByUid,
            createdAt: Timestamp.now(),
          });
        } else {
          tx.update(s.pRef, { reserved: s.reserved + s.req, updatedAt: Timestamp.now() });
        }
      }
      tx.set(newWithdrawRef, withdrawDoc);
    });

    return newWithdrawRef.id;
  } catch (error) {
    console.error('Error creating withdrawal:', error);
    throw error;
  }
}

export async function getAllWithdrawals() {
  try {
    const q = query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting withdrawals:', error);
    throw error;
  }
}

export async function getWithdrawalsByUser(uid) {
  try {
    const userOrdersRef = collection(db, 'users', uid, 'orders');
    const qUser = query(userOrdersRef, orderBy('createdAt', 'desc'));
    const subSnap = await getDocs(qUser);
    return subSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting user withdrawals:', error);
    throw error;
  }
}

export async function updateWithdrawalShipping(withdrawalId, updates, createdByUid) {
  try {
    if (!createdByUid) throw new Error('ต้องระบุ UID ของเจ้าของคำสั่งซื้อ');
    const ref = doc(db, 'users', createdByUid, 'orders', withdrawalId);
    const curr = await getDoc(ref);
    if (!curr.exists()) throw new Error('ไม่พบคำสั่งซื้อ');
    const currentData = curr.data();

    if (updates.shippingStatus === 'ส่งสำเร็จ' && currentData.shippingStatus !== 'ส่งสำเร็จ') {
      await runTransaction(db, async (tx) => {
        const items = currentData.items || [];
        const states = [];
        for (const it of items) {
          const pRef = doc(db, 'products', it.productId);
          const pSnap = await tx.get(pRef);
          if (!pSnap.exists()) continue;
          const pData = pSnap.data();
          states.push({
            pRef,
            qty: parseInt(pData.quantity || 0),
            reserved: parseInt(pData.reserved || 0),
            used: parseInt(it.quantity || 0),
            costPrice: parseFloat(pData.costPrice || 0),
          });
        }

        for (const s of states) {
          const nextReserved = Math.max(0, s.reserved - s.used);
          const nextQty = Math.max(0, s.qty - s.used);
          tx.update(s.pRef, { reserved: nextReserved, quantity: nextQty, updatedAt: Timestamp.now() });
          const productHistoryCol = collection(s.pRef, 'inventory_history');
          const histRef = doc(productHistoryCol);
          const outSource = currentData.createdSource === 'customer' ? 'order_customer_ship_success' : 'order_staff_ship_success';
          tx.set(histRef, {
            date: Timestamp.now(),
            costPrice: s.costPrice ?? null,
            quantity: s.used,
            type: 'out',
            source: outSource,
            orderId: withdrawalId,
            actorUid: createdByUid,
            createdAt: Timestamp.now(),
          });
        }
        tx.update(ref, {
          ...(updates.shippingCarrier !== undefined ? { shippingCarrier: updates.shippingCarrier } : {}),
          ...(updates.trackingNumber !== undefined ? { trackingNumber: updates.trackingNumber } : {}),
          shippingStatus: 'ส่งสำเร็จ',
          updatedAt: Timestamp.now(),
        });
      });
      return;
    }

    await updateDoc(ref, {
      ...(updates.shippingCarrier !== undefined ? { shippingCarrier: updates.shippingCarrier } : {}),
      ...(updates.trackingNumber !== undefined ? { trackingNumber: updates.trackingNumber } : {}),
      ...(updates.shippingStatus !== undefined ? { shippingStatus: updates.shippingStatus } : {}),
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error updating withdrawal shipping:', error);
    throw error;
  }
}
