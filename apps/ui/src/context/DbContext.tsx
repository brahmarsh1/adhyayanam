import { createContext, useContext } from "react";
import type { DbAdapter } from "@adhyayanam/shared";

const DbContext = createContext<DbAdapter | null>(null);

export function DbProvider({
  adapter,
  children,
}: {
  adapter: DbAdapter;
  children: React.ReactNode;
}) {
  return <DbContext.Provider value={adapter}>{children}</DbContext.Provider>;
}

export function useDb(): DbAdapter {
  const db = useContext(DbContext);
  if (!db) throw new Error("useDb must be used within a DbProvider");
  return db;
}
