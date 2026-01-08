import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../config/firebase';

/**
 * 監聽團購基本資訊
 * @param {string} groupId - 團購 ID
 * @returns {Object} { groupInfo, loading, error }
 */
export const useGroupInfo = (groupId) => {
  const [groupInfo, setGroupInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const groupRef = ref(db, `groups/${groupId}/info`);

    const unsubscribe = onValue(
      groupRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setGroupInfo(snapshot.val());
          setError(null);
        } else {
          setGroupInfo(null);
          setError('團購不存在');
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => off(groupRef, 'value', unsubscribe);
  }, [groupId]);

  return { groupInfo, loading, error };
};

/**
 * 監聽所有訂單
 * @param {string} groupId - 團購 ID
 * @returns {Object} { orders, loading, error }
 */
export const useOrders = (groupId) => {
  const [orders, setOrders] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const ordersRef = ref(db, `groups/${groupId}/orders`);

    const unsubscribe = onValue(
      ordersRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setOrders(snapshot.val());
        } else {
          setOrders({});
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => off(ordersRef, 'value', unsubscribe);
  }, [groupId]);

  return { orders, loading, error };
};

/**
 * 監聽廠商備註
 * @param {string} groupId - 團購 ID
 * @returns {Object} { vendorNotes, loading, error }
 */
export const useVendorNotes = (groupId) => {
  const [vendorNotes, setVendorNotes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const notesRef = ref(db, `groups/${groupId}/vendorNotes`);

    const unsubscribe = onValue(
      notesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setVendorNotes(snapshot.val());
        } else {
          setVendorNotes({
            shippingStatus: 'pending',
            notes: '',
            priceAdjustments: {}
          });
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => off(notesRef, 'value', unsubscribe);
  }, [groupId]);

  return { vendorNotes, loading, error };
};

/**
 * 監聽整個團購（包含所有資料）
 * @param {string} groupId - 團購 ID
 * @returns {Object} { group, loading, error }
 */
export const useGroup = (groupId) => {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    const groupRef = ref(db, `groups/${groupId}`);

    const unsubscribe = onValue(
      groupRef,
      (snapshot) => {
        if (snapshot.exists()) {
          setGroup(snapshot.val());
          setError(null);
        } else {
          setGroup(null);
          setError('團購不存在');
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => off(groupRef, 'value', unsubscribe);
  }, [groupId]);

  return { group, loading, error };
};

