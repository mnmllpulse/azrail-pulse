
import React, { createContext, useContext, useState, useEffect } from 'react';

interface UserStatus {
  plan: string;
  remaining: number;
  allowed: boolean;
}

interface UserContextType {
  status: UserStatus | null;
  refreshStatus: () => Promise<void>;
  isLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<UserStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshStatus = async () => {
    try {
      const response = await fetch('/api/user-status');
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Не удалось получить лимиты.');
      setStatus(data);
    } catch (err) {
      console.error("Failed to fetch user status:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  return (
    <UserContext.Provider value={{ status, refreshStatus, isLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
