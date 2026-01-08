import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook for localStorage with auto-save
 * @param {string} key - localStorage key
 * @param {any} initialValue - initial value if no data in localStorage
 * @param {number} debounceMs - debounce delay in milliseconds (default: 500ms)
 * @returns {[any, Function]} - [value, setValue]
 */
export function useLocalStorage(key, initialValue, debounceMs = 500) {
  // Get initial value from localStorage or use initialValue
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error loading ${key} from localStorage:`, error);
      return initialValue;
    }
  });

  // Debounce timer ref
  const debounceTimer = useRef(null);

  // Save to localStorage with debounce
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Set new timer
    debounceTimer.current = setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(storedValue));
      } catch (error) {
        console.error(`Error saving ${key} to localStorage:`, error);
      }
    }, debounceMs);

    // Cleanup
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [key, storedValue, debounceMs]);

  return [storedValue, setStoredValue];
}

