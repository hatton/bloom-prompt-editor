import { useState, useEffect } from "react";
import { useLocalStorage } from "./useLocalStorage";

const API_KEY_STORAGE_KEY = "openRouterApiKey";

export const useSettings = () => {
  const [openRouterApiKey, setOpenRouterApiKey] = useLocalStorage<string>(
    API_KEY_STORAGE_KEY,
    ""
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(true);
  }, []);

  return { openRouterApiKey, setOpenRouterApiKey, isLoaded };
};
