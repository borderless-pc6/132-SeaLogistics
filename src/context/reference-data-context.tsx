"use client";

import { collection, getDocs } from "firebase/firestore";
import type React from "react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { db } from "../lib/firebaseConfig";
import { type Company, type User, UserRole } from "../types/user";
import { useAuth } from "./auth-context";

const STALE_TIME_MS = 5 * 60 * 1000;

interface ReferenceDataContextType {
  users: User[];
  companies: Company[];
  loading: boolean;
  refresh: () => Promise<void>;
  getCompanyUsers: () => User[];
  getStaffUsers: () => User[];
}

const ReferenceDataContext = createContext<
  ReferenceDataContextType | undefined
>(undefined);

export const useReferenceData = () => {
  const context = useContext(ReferenceDataContext);
  if (context === undefined) {
    throw new Error(
      "useReferenceData must be used within a ReferenceDataProvider"
    );
  }
  return context;
};

interface ReferenceDataProviderProps {
  children: ReactNode;
}

export const ReferenceDataProvider: React.FC<ReferenceDataProviderProps> = ({
  children,
}) => {
  const { currentUser, firebaseReady } = useAuth();
  const isStaffUser =
    currentUser?.role === UserRole.ADMIN ||
    currentUser?.role === UserRole.OPERATOR;
  const [users, setUsers] = useState<User[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const lastFetchedAt = useRef<number>(0);

  const fetchData = useCallback(async (force = false) => {
    if (!currentUser || !firebaseReady || !isStaffUser) {
      setUsers([]);
      setCompanies([]);
      setLoading(false);
      return;
    }

    const now = Date.now();
    if (
      !force &&
      lastFetchedAt.current > 0 &&
      now - lastFetchedAt.current < STALE_TIME_MS
    ) {
      return;
    }

    try {
      setLoading(true);

      const [usersSnapshot, companiesSnapshot] = await Promise.all([
        getDocs(collection(db, "users")),
        getDocs(collection(db, "companies")),
      ]);

      const usersData = usersSnapshot.docs.map(
        (docSnap) =>
          ({
            ...docSnap.data(),
            uid: docSnap.id,
          }) as User
      );

      const companiesData = companiesSnapshot.docs.map(
        (docSnap) =>
          ({
            ...docSnap.data(),
            id: docSnap.id,
          }) as Company
      );

      setUsers(usersData);
      setCompanies(companiesData);
      lastFetchedAt.current = now;
    } catch (error) {
      console.error("Error loading reference data:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser, firebaseReady, isStaffUser]);

  useEffect(() => {
    if (!currentUser || !firebaseReady || !isStaffUser) {
      setUsers([]);
      setCompanies([]);
      setLoading(false);
      lastFetchedAt.current = 0;
      return;
    }

    void fetchData();
  }, [currentUser?.uid, firebaseReady, isStaffUser, fetchData]);

  const refresh = useCallback(async () => {
    await fetchData(true);
  }, [fetchData]);

  const getCompanyUsers = useCallback(
    () =>
      users.filter(
        (user) => user.role === UserRole.COMPANY_USER && user.isActive !== false
      ),
    [users]
  );

  const getStaffUsers = useCallback(
    () =>
      users.filter(
        (user) =>
          (user.role === UserRole.ADMIN || user.role === UserRole.OPERATOR) &&
          user.isActive !== false
      ),
    [users]
  );

  const value = useMemo(
    () => ({
      users,
      companies,
      loading,
      refresh,
      getCompanyUsers,
      getStaffUsers,
    }),
    [users, companies, loading, refresh, getCompanyUsers, getStaffUsers]
  );

  return (
    <ReferenceDataContext.Provider value={value}>
      {children}
    </ReferenceDataContext.Provider>
  );
};
