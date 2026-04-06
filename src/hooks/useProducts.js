import { useState, useEffect } from 'react';
import { ref, onValue, off } from 'firebase/database';
import { db } from '../config/firebase';
import { DEFAULT_PRODUCTS } from '../utils/constants';

/**
 * 監聽 Firebase 產品列表，無資料時 fallback 到預設產品
 * @returns {Object} { products, loading }
 */
export const useProducts = () => {
  const [products, setProducts] = useState(DEFAULT_PRODUCTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const productsRef = ref(db, 'products');

    const unsubscribe = onValue(
      productsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          const list = Object.values(data).sort((a, b) => a.id - b.id);
          setProducts(list);
        } else {
          setProducts(DEFAULT_PRODUCTS);
        }
        setLoading(false);
      },
      () => {
        setProducts(DEFAULT_PRODUCTS);
        setLoading(false);
      }
    );

    return () => off(productsRef, 'value', unsubscribe);
  }, []);

  return { products, loading };
};
