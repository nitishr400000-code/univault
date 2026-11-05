"use client";

import { useEffect } from "react";

const PwaRegistration = () => {
  useEffect(() => {
    const registerServiceWorker = async () => {
      if (!("serviceWorker" in navigator)) {
        return;
      }
      try {
        await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
      } catch (error) {
        console.error("Service worker registration failed:", error);
      }
    };
    registerServiceWorker();
  }, []);

  return null;
};

export default PwaRegistration;
