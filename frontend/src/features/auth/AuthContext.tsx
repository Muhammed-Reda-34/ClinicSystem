import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  http,
  bootstrapAuthSession,
} from "../../lib/http";
import { setAccessToken } from "../../lib/authToken";
import { queryClient } from "../../app/queryClient";
import type {
  AuthResponse,
  AuthUser,
} from "../../types/auth";

type Value = {
  user: AuthUser | null;
  initializing: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (role: string) => boolean;
};

const C = createContext<Value | null>(null);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [initializing, setInitializing] =
    useState(true);

  useEffect(() => {
    let live = true;

    bootstrapAuthSession()
      .then((session) => {
        if (live) {
          setUser(session.user);
        }
      })
      .catch(() => {
        if (live) {
          setUser(null);
        }
      })
      .finally(() => {
        if (live) {
          setInitializing(false);
        }
      });

    const handleAuthRefreshed = (
      event: Event
    ) => {
      setUser(
        (event as CustomEvent<AuthResponse>)
          .detail.user
      );
    };

    window.addEventListener(
      "clinic:auth-refreshed",
      handleAuthRefreshed
    );

    return () => {
      live = false;

      window.removeEventListener(
        "clinic:auth-refreshed",
        handleAuthRefreshed
      );
    };
  }, []);

  async function login(
    email: string,
    password: string
  ) {
    const { data } =
      await http.post<AuthResponse>(
        "/auth/login",
        { email, password }
      );

    // Stop any requests belonging to the previous account,
    // then remove all account-scoped cached data before
    // activating the newly authenticated account.
    await queryClient.cancelQueries();
    queryClient.clear();

    setAccessToken(data.accessToken);
    setUser(data.user);
  }

  async function logout() {
    try {
      await http.post("/auth/logout");
    } finally {
      // Prevent any previous doctor's cached data from surviving
      // into the next login session.
      await queryClient.cancelQueries();
      queryClient.clear();

      setAccessToken(null);
      setUser(null);
    }
  }

  const value = useMemo(
    () => ({
      user,
      initializing,
      login,
      logout,
      hasRole: (role: string) =>
        user?.roles.includes(role) ?? false,
    }),
    [user, initializing]
  );

  return (
    <C.Provider value={value}>
      {children}
    </C.Provider>
  );
}

export function useAuth() {
  const value = useContext(C);

  if (!value) {
    throw new Error("AuthProvider missing");
  }

  return value;
}
