import useLocalStorageState from "use-local-storage-state";

/**
 * Custom hook for managing localStorage values with automatic synchronization across tabs
 * @param key - The localStorage key
 * @param defaultValue - The default value to use if no stored value exists
 * @returns [value, setValue] - Current value and setter function
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useLocalStorageState(key, {
    defaultValue,
    storageSync: true, // This enables cross-tab synchronization
  });
  
  return [value, setValue];
}
