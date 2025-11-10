// Products service layer
import {
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
  Timestamp,
} from '../repositories/firestore';
import { addInventoryHistory } from './inventory.service';

export async function addProduct(productData) {
  try {
    const costPrice = parseFloat(productData.costPrice);
    const data = {
      productName: productData.productName,
      description: productData.description,
      price: costPrice,
      costPrice: costPrice,
      image: productData.image,
      purchaseLocation: productData.purchaseLocation || '',
      addDate: Timestamp.fromDate(new Date(productData.addDate)),
      quantity: parseInt(productData.quantity),
      initialQuantity: parseInt(productData.quantity),
      reserved: 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
    const docRef = await addDoc(collection(db, 'products'), data);
    const productId = docRef.id;
    if (productData.costPrice && productData.quantity) {
      await addInventoryHistory(productId, {
        date: productData.addDate,
        costPrice: productData.costPrice,
        quantity: productData.quantity,
        type: 'in',
        source: 'admin_add',
      });
    }
    return productId;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
}

export async function getAllProducts() {
  try {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting products:', error);
    throw error;
  }
}

export async function getProductById(productId) {
  try {
    const docRef = doc(db, 'products', productId);
    const snap = await getDoc(docRef);
    if (snap.exists()) return { id: snap.id, ...snap.data() };
    throw new Error('Product not found');
  } catch (error) {
    console.error('Error getting product:', error);
    throw error;
  }
}

export async function updateProduct(productId, productData) {
  try {
    // read current to preserve initialQuantity
    const currentSnap = await getDoc(doc(db, 'products', productId));
    const current = currentSnap.exists() ? currentSnap.data() : {};
    let addDateValue;
    if (typeof productData.addDate === 'string') {
      addDateValue = Timestamp.fromDate(new Date(productData.addDate));
    } else if (productData.addDate instanceof Date) {
      addDateValue = Timestamp.fromDate(productData.addDate);
    } else {
      addDateValue = productData.addDate;
    }
    const costPrice = parseFloat(productData.costPrice || productData.price || 0);
    const data = {
      productName: productData.productName,
      description: productData.description,
      price: costPrice,
      costPrice: costPrice,
      image: productData.image,
      purchaseLocation: productData.purchaseLocation ?? current?.purchaseLocation ?? '',
      addDate: addDateValue,
      quantity: parseInt(productData.quantity),
      initialQuantity: current?.initialQuantity ?? parseInt(productData.quantity),
      updatedAt: Timestamp.now(),
    };
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, data);
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
}

export async function deleteProduct(productId) {
  try {
    const docRef = doc(db, 'products', productId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
}

export async function updateProductQuantity(productId, quantity, isAdd = true) {
  try {
    const product = await getProductById(productId);
    const currentQuantity = product.quantity || 0;
    const change = parseInt(quantity);
    const newQuantity = isAdd ? currentQuantity + change : Math.max(0, currentQuantity - change);
    const docRef = doc(db, 'products', productId);
    await updateDoc(docRef, { quantity: newQuantity, updatedAt: Timestamp.now() });

    if (isAdd) {
      await addInventoryHistory(productId, {
        date: new Date(),
        costPrice: product.costPrice || 0,
        quantity: change,
        type: 'in',
        source: 'admin_adjust_inc',
      });
    } else {
      await addInventoryHistory(productId, {
        date: new Date(),
        costPrice: null,
        quantity: change,
        type: 'out',
        source: 'admin_adjust_dec',
      });
    }
  } catch (error) {
    console.error('Error updating product quantity:', error);
    throw error;
  }
}

export function isLowStock(p) {
  const initial = parseInt(p.initialQuantity ?? p.quantity ?? 0);
  const available = Math.max(0, parseInt(p.quantity || 0) - parseInt(p.reserved || 0));
  if (!initial) return false;
  return available / initial < 0.2;
}

export function getLowStockProducts(list) {
  return (list || []).filter(isLowStock);
}
