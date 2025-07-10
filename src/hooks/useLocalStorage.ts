import { useState, useEffect } from "react";

/**
 * Custom hook for managing localStorage values with automatic synchronization
 * @param key - The localStorage key
 * @param defaultValue - The default value to use if no stored value exists
 * @returns [value, setValue] - Current value and setter function
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  // Initialize state with value from localStorage or default
  const [value, setValue] = useState<T>(() => {
    try {
      // Check if localStorage is available (might not be in some environments)
      if (typeof window === "undefined" || !window.localStorage) {
        return defaultValue;
      }

      const item = localStorage.getItem(key);
      if (item === null || item === undefined) {
        return defaultValue;
      }

      // Attempt to parse the value based on the generic type T
      try {
        console.debug(
          `useLocalStorage: Reading localStorage key "${key}" = ${item}, parsed as`,
          JSON.parse(item).toString()
        );
        return JSON.parse(item) as T;
      } catch {
        // If parsing fails, fallback to defaultValue
        console.warn(
          `Failed to parse localStorage value for key "${key}". Falling back to defaultValue.`
        );
        return defaultValue;
      }
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });

  // Update localStorage when value changes
  useEffect(() => {
    try {
      // Check if localStorage is available
      if (typeof window === "undefined" || !window.localStorage) {
        return;
      }

      // Validate that the key is a non-empty string
      if (!key || typeof key !== "string") {
        console.warn("Invalid localStorage key provided:", key);
        return;
      }

      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        try {
          const jsonString = JSON.stringify(value);
          console.debug(
            `Setting localStorage key "${key}" with value:`,
            jsonString
          );
          localStorage.setItem(key, jsonString);
        } catch (stringifyError) {
          console.warn(
            `Error serializing value for localStorage key "${key}":`,
            stringifyError
          );
        }
      }
    } catch (error) {
      // Handle quota exceeded errors and other localStorage errors
      if (error instanceof DOMException && error.code === 22) {
        console.warn(`localStorage quota exceeded for key "${key}"`);
      } else {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    }
  }, [key, value]);

  return [value, setValue];
}
