import { useState, useEffect } from "react";

const API_KEY_STORAGE_KEY = "openRouterApiKey";

export const useSettings = () => {
  const [openRouterApiKey, setOpenRouterApiKey] = useState<string>("");
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
    if (storedApiKey) {
      setOpenRouterApiKey(storedApiKey);
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      if (openRouterApiKey) {
        localStorage.setItem(API_KEY_STORAGE_KEY, openRouterApiKey);
      } else {
        // If the key is cleared, remove it from storage
        localStorage.removeItem(API_KEY_STORAGE_KEY);
      }
    }
  }, [openRouterApiKey, isLoaded]);

  return { openRouterApiKey, setOpenRouterApiKey, isLoaded };
};
