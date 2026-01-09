import { ref, set, update, push, remove, get } from 'firebase/database';
import { db } from '../config/firebase';
import { nanoid } from 'nanoid';
import { PRODUCTS } from './constants';

/**
 * 建立新團購（自動產生團主 Token）
 * @param {Object} leaderInfo - 團主資訊 { name, phone, location, date }
 * @returns {Promise<{groupId: string, leaderToken: string}>} groupId 和 leaderToken
 */
export const createGroup = async (leaderInfo) => {
  const groupId = nanoid(10); // 產生短網址 ID
  const leaderToken = nanoid(32); // 產生 32 位隨機 Token
  const groupRef = ref(db, `groups/${groupId}`);
  
  await set(groupRef, {
    info: {
      ...leaderInfo,
      leaderToken: leaderToken, // 存儲團主 Token
      leaderNotes: '', // 團主給廠商的備註
      createdAt: Date.now(),
      status: 'active',
      orderStatus: 'draft' // draft: 草稿, submitted: 已送單, confirmed: 已確認
    },
    orders: {},
    vendorNotes: {
      shippingStatus: 'pending',
      notes: '',
      priceAdjustments: {}
    }
  });
  
  return { groupId, leaderToken };
};

/**
 * 更新團購資訊
 * @param {string} groupId - 團購 ID
 * @param {Object} updates - 要更新的資訊
 */
export const updateGroupInfo = async (groupId, updates) => {
  const infoRef = ref(db, `groups/${groupId}/info`);
  await update(infoRef, updates);
};

/**
 * 新增或更新訂單
 * @param {string} groupId - 團購 ID
 * @param {string} orderId - 訂單 ID (如果是新增則傳入 null)
 * @param {Object} orderData - 訂單資料 { memberName, items, total }
 * @returns {Promise<string>} orderId - 訂單 ID
 */
export const saveOrder = async (groupId, orderId, orderData) => {
  const ordersRef = ref(db, `groups/${groupId}/orders`);
  
  const data = {
    ...orderData,
    updatedAt: Date.now()
  };
  
  if (orderId) {
    // 更新現有訂單
    const orderRef = ref(db, `groups/${groupId}/orders/${orderId}`);
    await update(orderRef, data);
    return orderId;
  } else {
    // 新增訂單
    const newOrderRef = push(ordersRef);
    await set(newOrderRef, data);
    return newOrderRef.key;
  }
};

/**
 * 刪除訂單
 * @param {string} groupId - 團購 ID
 * @param {string} orderId - 訂單 ID
 */
export const deleteOrder = async (groupId, orderId) => {
  const orderRef = ref(db, `groups/${groupId}/orders/${orderId}`);
  await remove(orderRef);
};

/**
 * 關閉團購
 * @param {string} groupId - 團購 ID
 */
export const closeGroup = async (groupId) => {
  const infoRef = ref(db, `groups/${groupId}/info`);
  await update(infoRef, { status: 'closed' });
};

/**
 * 完成團購
 * @param {string} groupId - 團購 ID
 */
export const completeGroup = async (groupId) => {
  const infoRef = ref(db, `groups/${groupId}/info`);
  await update(infoRef, { status: 'completed' });
};

/**
 * 調整產品價格（廠商功能）
 * @param {string} groupId - 團購 ID
 * @param {string} productId - 產品 ID
 * @param {number} newPrice - 新價格
 */
export const adjustPrice = async (groupId, productId, newPrice) => {
  const priceRef = ref(db, `groups/${groupId}/vendorNotes/priceAdjustments/${productId}`);
  await set(priceRef, newPrice);
};

/**
 * 更新出貨狀態（廠商功能）
 * @param {string} groupId - 團購 ID
 * @param {string} status - 狀態
 */
export const updateShippingStatus = async (groupId, status) => {
  const statusRef = ref(db, `groups/${groupId}/vendorNotes/shippingStatus`);
  await set(statusRef, status);
};

/**
 * 更新廠商備註
 * @param {string} groupId - 團購 ID
 * @param {string} notes - 備註內容
 */
export const updateVendorNotes = async (groupId, notes) => {
  const notesRef = ref(db, `groups/${groupId}/vendorNotes/notes`);
  await set(notesRef, notes);
};

/**
 * 更新團主備註
 * @param {string} groupId - 團購 ID
 * @param {string} notes - 備註內容
 */
export const updateLeaderNotes = async (groupId, notes) => {
  const notesRef = ref(db, `groups/${groupId}/info/leaderNotes`);
  await set(notesRef, notes);
};

/**
 * 取得團購資訊
 * @param {string} groupId - 團購 ID
 * @returns {Promise<Object|null>} 團購資料
 */
export const getGroup = async (groupId) => {
  const groupRef = ref(db, `groups/${groupId}`);
  const snapshot = await get(groupRef);
  return snapshot.exists() ? snapshot.val() : null;
};

/**
 * 送單給廠商（團主功能）
 * @param {string} groupId - 團購 ID
 */
export const submitToVendor = async (groupId) => {
  const infoRef = ref(db, `groups/${groupId}/info`);
  await update(infoRef, { 
    orderStatus: 'submitted',
    submittedAt: Date.now()
  });
};

/**
 * 廠商確認收單
 * @param {string} groupId - 團購 ID
 */
export const confirmOrder = async (groupId) => {
  const infoRef = ref(db, `groups/${groupId}/info`);
  await update(infoRef, { 
    orderStatus: 'confirmed',
    confirmedAt: Date.now()
  });
};

/**
 * 廠商取消確認（改回已送單狀態，開放修改）
 * @param {string} groupId - 團購 ID
 */
export const cancelConfirmation = async (groupId) => {
  const infoRef = ref(db, `groups/${groupId}/info`);
  await update(infoRef, { 
    orderStatus: 'submitted',
    confirmedAt: null // 清除確認時間
  });
};

/**
 * 取消送單（退回草稿狀態）
 * @param {string} groupId - 團購 ID
 */
export const cancelSubmission = async (groupId) => {
  const infoRef = ref(db, `groups/${groupId}/info`);
  await update(infoRef, { 
    orderStatus: 'draft',
    submittedAt: null,
    confirmedAt: null
  });
};

/**
 * 計算產品實際價格（考慮廠商調整）
 * @param {number} productId - 產品 ID
 * @param {Object} priceAdjustments - 價格調整物件
 * @returns {number} 實際價格
 */
export const getActualPrice = (productId, priceAdjustments = {}) => {
  if (priceAdjustments[productId]) {
    return priceAdjustments[productId];
  }
  const product = PRODUCTS.find(p => p.id === productId);
  return product ? product.price : 0;
};

/**
 * 驗證團主 Token
 * @param {string} groupId - 團購 ID
 * @param {string} token - 要驗證的 Token
 * @returns {Promise<boolean>} 是否驗證通過
 */
export const verifyLeaderToken = async (groupId, token) => {
  if (!groupId || !token) return false;
  
  try {
    const tokenRef = ref(db, `groups/${groupId}/info/leaderToken`);
    const snapshot = await get(tokenRef);
    return snapshot.val() === token;
  } catch (error) {
    console.error('驗證 Token 失敗:', error);
    return false;
  }
};

