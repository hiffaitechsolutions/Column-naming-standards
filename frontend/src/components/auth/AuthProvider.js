'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import useAuthStore from '../../store/authstore';

export default function AuthProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const initialize = useAuthStore((state) => state.initialize);

  useEffect(() => {
    const init = async () => {
      await initialize();
      setIsInitialized(true);
    };
    init();
  }, []); 

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}