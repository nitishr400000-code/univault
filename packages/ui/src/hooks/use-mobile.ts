import * as React from "react";

const MOBILE_BREAKPOINT = 768;

const subscribe = (onChange: () => void) => {
  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

const isMobileViewport = () => window.innerWidth < MOBILE_BREAKPOINT;

export const useIsMobile = () =>
  React.useSyncExternalStore(subscribe, isMobileViewport, () => false);
