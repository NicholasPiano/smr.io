import React, { createContext, useContext, useEffect, useState } from 'react';

interface MobileContextType {
  isMobile: boolean;
  isTablet: boolean;
  screenWidth: number;
}

const MobileContext = createContext<MobileContextType | undefined>(undefined);

interface MobileProviderProps {
  children: React.ReactNode;
}

/**
 * Mobile context provider that detects screen size and provides mobile/tablet state
 */
export function MobileProvider({ children }: MobileProviderProps): JSX.Element {
  const [screenWidth, setScreenWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = (): void => {
      setScreenWidth(window.innerWidth);
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Call handler right away so state gets updated with initial window size
    handleResize();

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const isMobile = screenWidth < 768; // Mobile breakpoint
  const isTablet = screenWidth >= 768 && screenWidth < 1024; // Tablet breakpoint

  const value: MobileContextType = {
    isMobile,
    isTablet,
    screenWidth,
  };

  return (
    <MobileContext.Provider value={value}>
      {children}
    </MobileContext.Provider>
  );
}

/**
 * Hook to use mobile context
 */
export function useMobile(): MobileContextType {
  const context = useContext(MobileContext);
  if (context === undefined) {
    throw new Error('useMobile must be used within a MobileProvider');
  }
  return context;
}
