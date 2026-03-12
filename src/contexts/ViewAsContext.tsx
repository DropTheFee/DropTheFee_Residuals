import { createContext, useContext, useState, ReactNode } from 'react';

interface ViewAsContextType {
  viewAsRepId: string | null;
  viewAsRepName: string | null;
  setViewAsRep: (repId: string | null, repName: string | null) => void;
  exitViewAs: () => void;
  isViewingAsRep: boolean;
}

const ViewAsContext = createContext<ViewAsContextType | undefined>(undefined);

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAsRepId, setViewAsRepId] = useState<string | null>(null);
  const [viewAsRepName, setViewAsRepName] = useState<string | null>(null);

  const setViewAsRep = (repId: string | null, repName: string | null) => {
    setViewAsRepId(repId);
    setViewAsRepName(repName);
  };

  const exitViewAs = () => {
    setViewAsRepId(null);
    setViewAsRepName(null);
  };

  const isViewingAsRep = viewAsRepId !== null;

  return (
    <ViewAsContext.Provider
      value={{
        viewAsRepId,
        viewAsRepName,
        setViewAsRep,
        exitViewAs,
        isViewingAsRep,
      }}
    >
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  const context = useContext(ViewAsContext);
  if (context === undefined) {
    throw new Error('useViewAs must be used within a ViewAsProvider');
  }
  return context;
}
