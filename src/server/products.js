import { collection, addDoc, Timestamp, getDocs, query, orderBy, doc, getDoc, updateDoc, deleteDoc, runTransaction, collectionGroup } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * เพิ่มสินค้าใหม่ลง Firestore
 * @param {Object} productData - ข้อมูลสินค้า
 * @param {string} productData.productName - ชื่อสินค้า
 * @param {string} productData.description - คำอธิบายสินค้า
 * @param {number} productData.price - ราคา
 * @param {string} productData.image - URL รูปภาพ
 * @param {Date} productData.addDate - วันที่เพิ่ม
 * @param {number} productData.quantity - จำนวนสินค้า
 * @returns {Promise<string>} - Document ID ของสินค้าที่เพิ่ม
 */
export async function addProduct(productData) {
  try {
    // ใช้ราคาทุนเป็นราคาขายด้วย (ราคาเดียว)
    const costPrice = parseFloat(productData.costPrice);     
    
    // แปลงข้อมูลให้เหมาะสมกับ Firestore
    const data = {
      productName: productData.productName,
      description: productData.description,
      price: costPrice, // ใช้ราคาทุนเป็นราคาขาย
      costPrice: costPrice,
      image: productData.image,
      addDate: Timestamp.fromDate(new Date(productData.addDate)),
      quantity: parseInt(productData.quantity),
      reserved: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    // บันทึกข้อมูลสินค้าลง Firestore collection "products"
    const docRef = await addDoc(collection(db, 'products'), data);
    const productId = docRef.id;

    // บันทึกประวัติการเข้าคลังครั้งแรก
    if (productData.costPrice && productData.quantity) {
      await addInventoryHistory(productId, {
        date: productData.addDate,
        costPrice: productData.costPrice,
        quantity: productData.quantity
      });
    }

    return productId;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

/**
 * ดึงข้อมูลสินค้าทั้งหมด
 * @returns {Promise<Array>} - Array ของสินค้าทั้งหมด
 */
export async function getAllProducts() {
  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

/**
 * ดึงข้อมูลสินค้าตาม ID
 * @param {string} productId - ID ของสินค้า
 * @returns {Promise<Object>} - ข้อมูลสินค้า
 */
export async function getProductById(productId) {
  try {
    const docRef = doc(db, 'products', productId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() };
    }
    throw new Error('Product not found');
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
}

/**
 * อัพเดตข้อมูลสินค้า
 * @param {string} productId - ID ของสินค้า
 * @param {Object} productData - ข้อมูลสินค้าที่จะอัพเดต
 * @returns {Promise<void>}
 */
export async function updateProduct(productId, productData) {
  try {
    // จัดการ addDate - ถ้าเป็น string ให้แปลงเป็น Timestamp
    let addDateValue;
    if (typeof productData.addDate === 'string') {
      addDateValue = Timestamp.fromDate(new Date(productData.addDate));
    } else if (productData.addDate instanceof Date) {
      addDateValue = Timestamp.fromDate(productData.addDate);
    } else {
      // ถ้าเป็น Timestamp อยู่แล้ว ให้ใช้ตามเดิม
      addDateValue = productData.addDate;
    }

    // ใช้ราคาทุนเป็นราคาขายด้วย (ราคาเดียว)
    const costPrice = parseFloat(productData.costPrice || productData.price || 0);

    const data = {
      productName: productData.productName,
      description: productData.description,
      price: costPrice, // ใช้ราคาทุนเป็นราคาขาย
      costPrice: costPrice,
      image: productData.image,
      addDate: addDateValue,
      quantity: parseInt(productData.quantity),
      updatedAt: Timestamp.now()
    };

    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

/**
 * อัพเดตจำนวนสินค้า
 * @param {string} productId - ID ของสินค้า
 * @param {number} quantity - จำนวนสินค้าที่จะเพิ่ม/ลด
 * @param {boolean} isAdd - true = เพิ่ม, false = ลบ
 * @returns {Promise<void>}
 */
export async function updateProductQuantity(productId, quantity, isAdd = true) {
  try {
    const product = await getProductById(productId);
    const currentQuantity = product.quantity || 0;
    const newQuantity = isAdd 
      ? currentQuantity + parseInt(quantity)
      : Math.max(0, currentQuantity - parseInt(quantity));

    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, {
      quantity: newQuantity,
      updatedAt: Timestamp.now()
    });

    // บันทึกประวัติการเข้าคลัง (เฉพาะเมื่อเพิ่มสินค้า) - ใช้ราคาทุนจากสินค้า
    if (isAdd && product.costPrice) {
      await addInventoryHistory(productId, {
        date: new Date(),
        costPrice: product.costPrice,
        quantity: parseInt(quantity)
      });
    }
  } catch (error) {
    console.error('Error updating product quantity:', error);
    throw error;
  }
}

/**
 * สร้างเอกสารการเบิกสินค้า และหักสต็อกตามจำนวนที่เบิก
 * @param {Object} payload - ข้อมูลการเบิก
 * @param {Array} payload.items - รายการที่เบิก [{ productId, productName, price, quantity, subtotal }]
 * @param {string} payload.requestedBy - ชื่อผู้เบิก
 * @param {string} payload.receivedBy - ชื่อผู้รับ
 * @param {Date|string} payload.withdrawDate - วันที่เบิก
 * @param {number} payload.total - ราคารวม
 * @returns {Promise<string>} - Document ID ของการเบิก
 */
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
      // shipping fields
      shippingCarrier: payload.shippingCarrier || null,
      trackingNumber: payload.trackingNumber || '',
      shippingStatus: method === 'pickup' ? 'ส่งสำเร็จ' : (payload.shippingStatus || 'รอดำเนินการ'),
      deliveryMethod: method,
      createdAt: Timestamp.now(),
      createdByUid: payload.createdByUid || null,
      createdByEmail: payload.createdByEmail || null,
      createdSource: payload.createdSource || null
    };

    if (!withdrawDoc.createdByUid) {
      throw new Error('ไม่พบ UID ของผู้สร้างคำสั่ง');
    }
    const userOrdersCol = collection(db, 'users', withdrawDoc.createdByUid, 'orders');
    const newWithdrawRef = doc(userOrdersCol);

    // ใช้ธุรกรรมเพื่อ "จองสต๊อก" (เพิ่ม reserved) ตามจำนวนที่สั่ง หากสต๊อกพร้อมขายไม่พอจะ throw
    await runTransaction(db, async (tx) => {
      // PASS 1: อ่านข้อมูลสินค้าทั้งหมดก่อน แล้วตรวจสอบความถูกต้อง
      const productStates = [];
      for (const it of withdrawDoc.items) {
        const pRef = doc(db, 'products', it.productId);
        const pSnap = await tx.get(pRef);
        if (!pSnap.exists()) throw new Error('ไม่พบสินค้า');
        const data = pSnap.data();
        const qty = parseInt(data.quantity || 0);
        const reserved = parseInt(data.reserved || 0);
        const req = parseInt(it.quantity || 0);
        const available = qty - reserved;
        if (req <= 0) throw new Error('จำนวนที่สั่งไม่ถูกต้อง');
        if (available < req) throw new Error('สต๊อกไม่พอสำหรับบางรายการ');
        productStates.push({ pRef, qty, reserved, req });
      }

      // PASS 2: เขียนอัปเดตสต๊อก และเอกสารคำสั่งซื้อ (เฉพาะใน users/{uid}/orders)
      for (const s of productStates) {
        if (method === 'pickup') {
          const nextQty = Math.max(0, s.qty - s.req);
          tx.update(s.pRef, { quantity: nextQty, updatedAt: Timestamp.now() });
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

/**
 * ดึงรายการคำสั่งเบิกทั้งหมดสำหรับแอดมิน (ใช้เป็นออเดอร์)
 */
export async function getAllWithdrawals() {
  try {
    // list all orders across users via collection group
    const q = query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting withdrawals:', error);
    throw error;
  }
}

/**
 * ดึงรายการคำสั่งเบิกของผู้ใช้ตาม UID
 * @param {string} uid
 */
export async function getWithdrawalsByUser(uid) {
  try {
    const userOrdersRef = collection(db, 'users', uid, 'orders');
    const qUser = query(userOrdersRef, orderBy('createdAt', 'desc'));
    const subSnap = await getDocs(qUser);
    return subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting user withdrawals:', error);
    throw error;
  }
}

/**
 * อัปเดตข้อมูลการจัดส่งของคำสั่งเบิก
 * @param {string} withdrawalId
 * @param {{shippingCarrier?: string, trackingNumber?: string, shippingStatus?: string}} updates
 */
export async function updateWithdrawalShipping(withdrawalId, updates, createdByUid) {
  try {
    if (!createdByUid) throw new Error('ต้องระบุ UID ของเจ้าของคำสั่งซื้อ');
    const ref = doc(db, 'users', createdByUid, 'orders', withdrawalId);
    const curr = await getDoc(ref);
    if (!curr.exists()) throw new Error('ไม่พบคำสั่งซื้อ');
    const currentData = curr.data();

    // หากอัปเดตเป็น "ส่งสำเร็จ" และยังไม่เคยสำเร็จมาก่อน ให้ตัดสต๊อกจริง (โอนจาก reserved -> quantity)
    if (updates.shippingStatus === 'ส่งสำเร็จ' && currentData.shippingStatus !== 'ส่งสำเร็จ') {
      await runTransaction(db, async (tx) => {
        // PASS 1: อ่านข้อมูลสินค้าทั้งหมดก่อน
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
          });
        }

        // PASS 2: เขียนอัปเดตสต๊อก และสถานะคำสั่งซื้อ
        for (const s of states) {
          const nextReserved = Math.max(0, s.reserved - s.used);
          const nextQty = Math.max(0, s.qty - s.used);
          tx.update(s.pRef, { reserved: nextReserved, quantity: nextQty, updatedAt: Timestamp.now() });
        }
        tx.update(ref, {
          ...(updates.shippingCarrier !== undefined ? { shippingCarrier: updates.shippingCarrier } : {}),
          ...(updates.trackingNumber !== undefined ? { trackingNumber: updates.trackingNumber } : {}),
          shippingStatus: 'ส่งสำเร็จ',
          updatedAt: Timestamp.now()
        });
      });
      return;
    }

    // กรณีอัปเดตฟิลด์ทั่วไป หรือเปลี่ยนสถานะอื่นที่ไม่ใช่ "ส่งสำเร็จ"
    await updateDoc(ref, {
      ...(updates.shippingCarrier !== undefined ? { shippingCarrier: updates.shippingCarrier } : {}),
      ...(updates.trackingNumber !== undefined ? { trackingNumber: updates.trackingNumber } : {}),
      ...(updates.shippingStatus !== undefined ? { shippingStatus: updates.shippingStatus } : {}),
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating withdrawal shipping:', error);
    throw error;
  }
}

/**
 * ลบสินค้า
 * @param {string} productId - ID ของสินค้า
 * @returns {Promise<void>}
 */
export async function deleteProduct(productId) {
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

/**
 * บันทึกประวัติการเข้าคลังสินค้า
 * @param {string} productId - ID ของสินค้า
 * @param {Object} historyData - ข้อมูลประวัติ
 * @param {Date|string} historyData.date - วันที่เข้า
 * @param {number} historyData.costPrice - ราคาทุน
 * @param {number} historyData.quantity - จำนวนสินค้า
 * @returns {Promise<string>} - Document ID ของประวัติ
 */
export async function addInventoryHistory(productId, historyData) {
  try {
    const productRef = doc(db, 'products', productId);
    const historyCollection = collection(productRef, 'inventory_history');
    const historyDoc = {
      date: typeof historyData.date === 'string' 
        ? Timestamp.fromDate(new Date(historyData.date))
        : Timestamp.fromDate(historyData.date),
      costPrice: parseFloat(historyData.costPrice),
      quantity: parseInt(historyData.quantity),
      createdAt: Timestamp.now()
    };
    const docRef = await addDoc(historyCollection, historyDoc);
    return docRef.id;
  } catch (error) {
    console.error('Error adding inventory history:', error);
    throw error;
  }
}

/**
 * ดึงประวัติการเข้าคลังสินค้าทั้งหมด
 * @param {string} productId - ID ของสินค้า
 * @returns {Promise<Array>} - Array ของประวัติการเข้าคลัง
 */
export async function getInventoryHistory(productId) {
  try {
    const productRef = doc(db, 'products', productId);
    const historyCollection = collection(productRef, 'inventory_history');
    const q = query(historyCollection, orderBy('date', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting inventory history:', error);
    throw error;
  }
}

