import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getAccount, type AccountInfo } from "./api";
import { useAuth } from "./auth";

interface AccountState {
  info: AccountInfo | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const Ctx = createContext<AccountState>({ info: null, loading: true, error: null, reload: async () => {} });

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [info, setInfo] = useState<AccountInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!user) {
      setInfo(null);
      setLoading(false);
      return;
    }
    try {
      setInfo(await getAccount());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const value = useMemo(() => ({ info, loading, error, reload }), [info, loading, error, reload]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAccount(): AccountState {
  return useContext(Ctx);
}
