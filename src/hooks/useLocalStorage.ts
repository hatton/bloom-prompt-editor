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

      // Handle different types appropriately with validation
      if (typeof defaultValue === "string") {
        return item as T;
      }

      if (typeof defaultValue === "number") {
        const parsed = parseFloat(item);
        if (isNaN(parsed) || !isFinite(parsed)) {
          console.warn(
            `Invalid number stored in localStorage for key "${key}": ${item}`
          );
          return defaultValue;
        }
        return parsed as T;
      }

      if (typeof defaultValue === "boolean") {
        if (item === "true") return true as T;
        if (item === "false") return false as T;
        // Handle legacy boolean values that might be stored as 1/0
        if (item === "1") return true as T;
        if (item === "0") return false as T;
        console.warn(
          `Invalid boolean stored in localStorage for key "${key}": ${item}`
        );
        return defaultValue;
      }

      // For objects/arrays, parse JSON with validation
      if (typeof defaultValue === "object") {
        try {
          const parsed = JSON.parse(item);
          // Basic type validation - ensure parsed result matches expected type structure
          if (Array.isArray(defaultValue) && !Array.isArray(parsed)) {
            console.warn(
              `Expected array but got different type for localStorage key "${key}"`
            );
            return defaultValue;
          }
          if (!Array.isArray(defaultValue) && typeof parsed !== "object") {
            console.warn(
              `Expected object but got different type for localStorage key "${key}"`
            );
            return defaultValue;
          }
          return parsed as T;
        } catch (parseError) {
          console.warn(
            `Invalid JSON stored in localStorage for key "${key}":`,
            parseError
          );
          return defaultValue;
        }
      }

      // Fallback for unknown types
      console.warn(`Unsupported type for localStorage key "${key}"`);
      return defaultValue;
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
      } else if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        // Additional validation for primitive types
        if (typeof value === "number" && (!isFinite(value) || isNaN(value))) {
          console.warn(
            `Cannot store invalid number in localStorage for key "${key}":`,
            value
          );
          return;
        }
        localStorage.setItem(key, String(value));
      } else if (typeof value === "object") {
        try {
          const jsonString = JSON.stringify(value);
          localStorage.setItem(key, jsonString);
        } catch (stringifyError) {
          console.warn(
            `Error serializing value for localStorage key "${key}":`,
            stringifyError
          );
        }
      } else {
        console.warn(
          `Unsupported value type for localStorage key "${key}":`,
          typeof value
        );
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
