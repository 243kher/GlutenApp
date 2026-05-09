import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";

interface UserType {
  id: number;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string | null;
  dietaryPreferences?: string | null;
}

interface AuthContextType {
  user: UserType | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: UserType) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("token"));
  const [user, setUser] = useState<UserType | null>(null);
  const queryClient = useQueryClient();

  const { data: meData, isLoading } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (meData) {
      setUser(meData as unknown as UserType);
    }
  }, [meData]);

  useEffect(() => {
    if (!token) {
      setUser(null);
    }
  }, [token]);

  function login(newToken: string, newUser: UserType) {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(newUser);
  }

  function logout() {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    queryClient.clear();
  }

  return (
    <AuthContext.Provider value={{ user, token, isLoading: !!token && isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
