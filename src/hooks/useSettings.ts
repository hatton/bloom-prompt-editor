import { useState, useEffect } from "react";

const API_KEY_STORAGE_KEY = "openRouterApiKey";

export const useSettings = () => {
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>("");

  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setOpenRouterApiKey(storedApiKey);
    }
  }, []);

  useEffect(() => {
    if (openRouterApiKey) {
      localStorage.setItem(API_KEY_STORAGE_KEY, openRouterApiKey);
    } else {
      // If the key is cleared, remove it from storage
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  }, [openRouterApiKey]);

  return { openRouterApiKey, setOpenRouterApiKey };
};
