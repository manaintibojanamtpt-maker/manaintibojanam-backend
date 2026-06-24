import React, { createContext, useState, useEffect } from 'react';

export interface ViewportContextType {
  width: number;
  height: number;
  isMobile: boolean;
}

export const ViewportContext = createContext<ViewportContextType | undefined>(undefined);

export const ViewportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [height, setHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 768);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleWindowResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, []);

  return (
    <ViewportContext.Provider value={{ width, height, isMobile: width < 768 }}>
      {children}
    </ViewportContext.Provider>
  );
};
