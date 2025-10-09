"use client";

import React from "react";

type AutoPlayContextValue = {
  setCurrent: (el: HTMLVideoElement | null) => void;
  isCurrent: (el: HTMLVideoElement | null | undefined) => boolean;
};

const AutoPlayContext = React.createContext<AutoPlayContextValue | undefined>(
  undefined
);

export function useLandingAutoPlay() {
  const ctx = React.useContext(AutoPlayContext);
  if (!ctx) throw new Error("useLandingAutoPlay must be used within provider");
  return ctx;
}

export const LandingAutoPlayProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const currentRef = React.useRef<HTMLVideoElement | null>(null);

  const setCurrent = React.useCallback((el: HTMLVideoElement | null) => {
    if (currentRef.current && currentRef.current !== el) {
      try {
        currentRef.current.pause();
      } catch {}
    }
    currentRef.current = el;
  }, []);

  const isCurrent = React.useCallback(
    (el: HTMLVideoElement | null | undefined) => {
      return !!el && currentRef.current === el;
    },
    []
  );

  const value = React.useMemo<AutoPlayContextValue>(
    () => ({ setCurrent, isCurrent }),
    [setCurrent, isCurrent]
  );

  return (
    <AutoPlayContext.Provider value={value}>
      {children}
    </AutoPlayContext.Provider>
  );
};
