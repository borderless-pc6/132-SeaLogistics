import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import type { UserCredential } from "firebase/auth";
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signOut,
  updatePassword,
} from "firebase/auth";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { auth, db } from "../lib/firebaseConfig";
import { clearAuthToken, getAuthToken, loginWithApi, loginWithOtpIdToken, refreshFirebaseSession, storeAuthToken } from "../services/authApi";
import { ensureFirebaseSignIn } from "../services/firebaseAuthClient";
import {
  clearDailySession,
  isDailySessionValid,
  markSessionExpired,
  storeDailySession,
} from "../utils/sessionUtils";
import { Company, User, UserRole } from "../types/user";
import {
  isRetryableAuthError,
  logAuthError,
  mapAuthError,
} from "../utils/authErrorHandler";
import { hashPassword, verifyPassword } from "../utils/passwordUtils";
import { normalizeEmail } from "../utils/normalizeEmail";
import { retryWithBackoff } from "../utils/retryWithBackoff";
import { registerFcmToken, shouldRegisterPush, unregisterFcmToken } from "../services/pushNotificationService";

interface AuthContextType {
  currentUser: User | null;
  currentCompany: Company | null;
  login: (email: string, password: string) => Promise<User>;
  loginWithFirebaseCredential: (credential: UserCredential) => Promise<User>;
  logout: () => void;
  isAdmin: () => boolean;
  isOperator: () => boolean;
  isStaff: () => boolean;
  isCompanyUser: () => boolean;
  canAccessAdminFeatures: () => boolean;
  canManageShipments: () => boolean;
  canCreateShipment: () => boolean;
  canImportShipments: () => boolean;
  canSyncExcel: () => boolean;
  canDeleteAllShipments: () => boolean;
  canManageEmployees: () => boolean;
  mustChangePassword: () => boolean;
  completePasswordChange: (newPassword: string) => Promise<{ firebaseSessionReady: boolean }>;
  loading: boolean;
  firebaseReady: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [firebaseReady, setFirebaseReady] = useState(false);
  const lastTokenCheckRef = useRef<number>(0);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const loginInProgressRef = useRef<string | null>(null);
  const loadUserDataInflightRef = useRef<Map<string, Promise<User | null>>>(
    new Map()
  );

  const clearLocalSession = () => {
    setCurrentUser(null);
    setCurrentCompany(null);
    setFirebaseReady(false);
    localStorage.removeItem("currentUser");
    clearAuthToken();
    clearDailySession();
    lastTokenCheckRef.current = 0;
  };

  const expireDailySession = async (notify = true) => {
    if (notify) {
      markSessionExpired();
    }

    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
      tokenCheckIntervalRef.current = null;
    }

    try {
      await signOut(auth);
    } catch {
      // ignora se não havia sessão Firebase
    }

    clearLocalSession();
    setLoading(false);
  };

  const syncFirebaseReady = (userId?: string | null) => {
    const ready = Boolean(
      auth.currentUser && (!userId || auth.currentUser.uid === userId)
    );
    setFirebaseReady(ready);
    return ready;
  };

  const establishFirebaseSession = async (firebaseCustomToken: string) => {
    await signInWithCustomToken(auth, firebaseCustomToken);
  };

  const ensureFirebaseSessionForUser = async (
    uid: string,
    email: string,
    password: string,
    displayName: string,
    firebaseCustomToken?: string | null
  ): Promise<boolean> => {
    try {
      if (firebaseCustomToken) {
        try {
          await establishFirebaseSession(firebaseCustomToken);
          if (syncFirebaseReady(uid)) {
            return true;
          }
        } catch (error) {
          console.warn("[Auth] Custom token inválido, tentando fallback:", error);
        }
      }

      if (syncFirebaseReady(uid)) {
        return true;
      }

      if (getAuthToken()) {
        try {
          const { firebaseCustomToken: refreshed } = await refreshFirebaseSession();
          if (refreshed) {
            await establishFirebaseSession(refreshed);
          }
        } catch (error) {
          console.warn("[Auth] Falha ao renovar custom token:", error);
        }
      }

      if (syncFirebaseReady(uid)) {
        return true;
      }

      if (auth.currentUser && auth.currentUser.uid !== uid) {
        await signOut(auth);
      }

      const signedIn = await ensureFirebaseSignIn({
        uid,
        email,
        password,
        displayName,
      });

      syncFirebaseReady(uid);
      return signedIn;
    } catch (error) {
      console.warn("[Auth] Falha ao estabelecer sessão Firebase:", error);
      syncFirebaseReady(uid);
      return false;
    }
  };

  const tryRestoreFirebaseSession = async (): Promise<boolean> => {
    const savedToken = getAuthToken();
    if (!savedToken || !isDailySessionValid()) return false;

    try {
      const { firebaseCustomToken } = await refreshFirebaseSession();
      if (firebaseCustomToken) {
        await establishFirebaseSession(firebaseCustomToken);
        return true;
      }
    } catch (error) {
      logAuthError(error, "tryRestoreFirebaseSession");
    }

    return false;
  };

  useEffect(() => {
    const savedToken = getAuthToken();
    const savedUser = localStorage.getItem("currentUser");

    if ((savedToken || savedUser) && !isDailySessionValid()) {
      void expireDailySession();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        if (!isDailySessionValid()) {
          await expireDailySession();
          return;
        }

        syncFirebaseReady(firebaseUser.uid);

        if (loginInProgressRef.current === firebaseUser.uid) {
          return;
        }

        try {
          await loadUserData(firebaseUser.uid);
        } catch {
          setLoading(false);
        }
        return;
      }

      setFirebaseReady(false);
      const savedUser = localStorage.getItem("currentUser");
      const savedToken = getAuthToken();

      if ((savedUser || savedToken) && !isDailySessionValid()) {
        await expireDailySession();
        return;
      }

      if (savedUser && savedToken) {
        try {
          const userData = JSON.parse(savedUser);
          if (userData.id) {
            const restored = await tryRestoreFirebaseSession();
            if (restored) {
              return;
            }
          }
        } catch {
          localStorage.removeItem("currentUser");
          clearAuthToken();
          clearDailySession();
        }
      }

      if (savedUser && !getAuthToken()) {
        localStorage.removeItem("currentUser");
        clearDailySession();
      }

      setCurrentUser(null);
      setCurrentCompany(null);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!currentUser?.uid || firebaseReady) {
      return undefined;
    }

    let cancelled = false;

    const attemptReconnect = async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        if (cancelled) return;

        if (getAuthToken()) {
          const restored = await tryRestoreFirebaseSession();
          if (restored && syncFirebaseReady(currentUser.uid)) {
            return;
          }
        }

        if (auth.currentUser?.uid === currentUser.uid) {
          syncFirebaseReady(currentUser.uid);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }

      // Evita UI presa em loading se a sessão Firebase não puder ser restaurada
      if (!cancelled && auth.currentUser?.uid === currentUser.uid) {
        syncFirebaseReady(currentUser.uid);
      }
    };

    void attemptReconnect();

    return () => {
      cancelled = true;
    };
  }, [currentUser?.uid, firebaseReady]);

  useEffect(() => {
    if (!currentUser) {
      return undefined;
    }

    if (!isDailySessionValid()) {
      void expireDailySession();
      return undefined;
    }

    const raw = localStorage.getItem("sessionExpiresAt");
    const expiresAt = Number(raw);
    if (!Number.isFinite(expiresAt)) {
      return undefined;
    }

    const msUntilExpiry = expiresAt - Date.now();
    if (msUntilExpiry <= 0) {
      void expireDailySession();
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      void expireDailySession();
    }, msUntilExpiry + 100);

    return () => window.clearTimeout(timeout);
  }, [currentUser?.uid]);

  const persistUserToStorage = (userData: User) => {
    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        email: userData.email,
        name: userData.displayName,
        id: userData.uid,
        role: userData.role,
        mustChangePassword: userData.mustChangePassword ?? false,
      })
    );
  };

  const loadUserData = async (
    userId: string,
    hints?: { companyId?: string; role?: UserRole }
  ): Promise<User | null> => {
    const inflight = loadUserDataInflightRef.current.get(userId);
    if (inflight) {
      return inflight;
    }

    const promise = (async (): Promise<User | null> => {
      try {
        const roleHint = hints?.role;
        const companyIdHint = hints?.companyId;
        const shouldFetchCompany =
          roleHint === UserRole.COMPANY_USER && Boolean(companyIdHint);

        const [userDoc, companyDoc] = await Promise.all([
          retryWithBackoff(
            async () => getDoc(doc(db, "users", userId)),
            {
              maxRetries: 2,
              initialDelay: 300,
              retryable: (error) => isRetryableAuthError(error),
            }
          ),
          shouldFetchCompany
            ? retryWithBackoff(
                async () => getDoc(doc(db, "companies", companyIdHint!)),
                {
                  maxRetries: 2,
                  initialDelay: 300,
                  retryable: (error) => isRetryableAuthError(error),
                }
              )
            : Promise.resolve(null),
        ]);

        if (!userDoc.exists()) {
          console.warn("Usuário não encontrado no Firestore:", userId);
          localStorage.removeItem("currentUser");
          setCurrentUser(null);
          return null;
        }

        const userData = { ...userDoc.data(), uid: userDoc.id } as User;
        setCurrentUser(userData);
        syncFirebaseReady(userId);
        persistUserToStorage(userData);

        if (companyDoc?.exists()) {
          const companyData = {
            ...companyDoc.data(),
            id: companyDoc.id,
          } as Company;
          setCurrentCompany(companyData);
        } else if (
          userData.role === UserRole.COMPANY_USER &&
          userData.companyId
        ) {
          try {
            const lateCompanyDoc = await retryWithBackoff(
              async () => getDoc(doc(db, "companies", userData.companyId!)),
              {
                maxRetries: 2,
                initialDelay: 300,
                retryable: (error) => isRetryableAuthError(error),
              }
            );

            if (lateCompanyDoc.exists()) {
              const companyData = {
                ...lateCompanyDoc.data(),
                id: lateCompanyDoc.id,
              } as Company;
              setCurrentCompany(companyData);
            }
          } catch (error) {
            logAuthError(error, "loadUserData - company");
          }
        }

        window.setTimeout(() => {
          if (shouldRegisterPush(userData)) {
            registerFcmToken(userId).catch((err) =>
              console.warn("[FCM] Falha ao registrar token:", err)
            );
          }
        }, 2000);

        return userData;
      } catch (error) {
        logAuthError(error, "loadUserData");
        const authError = mapAuthError(error);

        if (authError.type === "token") {
          logout();
        }

        localStorage.removeItem("currentUser");
        setCurrentUser(null);
        throw error;
      } finally {
        setLoading(false);
      }
    })();

    loadUserDataInflightRef.current.set(userId, promise);

    try {
      return await promise;
    } finally {
      loadUserDataInflightRef.current.delete(userId);
    }
  };

  const refreshUserData = async () => {
    if (currentUser?.uid) {
      try {
        console.log("Atualizando dados do usuário...");
        await loadUserData(currentUser.uid);
      } catch (error) {
        logAuthError(error, "refreshUserData");
        const authError = mapAuthError(error);

        if (authError.type === "token") {
          logout();
        }
        throw error;
      }
    }
  };

  // Verifica periodicamente se o usuário ainda existe e está ativo
  useEffect(() => {
    if (!currentUser) {
      // Limpa intervalo se não há usuário
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
      return;
    }

    const userId = currentUser.uid;

    // Verifica a cada 5 minutos
    tokenCheckIntervalRef.current = setInterval(async () => {
      const now = Date.now();
      // Evita múltiplas verificações simultâneas
      if (now - lastTokenCheckRef.current < 4 * 60 * 1000) {
        return;
      }

      lastTokenCheckRef.current = now;

      if (!isDailySessionValid()) {
        await expireDailySession();
        return;
      }

      try {
        const userDoc = await retryWithBackoff(
          async () => {
            return await getDoc(doc(db, "users", userId));
          },
          {
            maxRetries: 2,
            initialDelay: 1000,
            retryable: (error) => isRetryableAuthError(error),
          }
        );

        if (!userDoc.exists()) {
          console.warn("Usuário não encontrado durante verificação periódica");
          // Limpa intervalo e faz logout
          if (tokenCheckIntervalRef.current) {
            clearInterval(tokenCheckIntervalRef.current);
            tokenCheckIntervalRef.current = null;
          }
          setCurrentUser(null);
          setCurrentCompany(null);
          localStorage.removeItem("currentUser");
          clearAuthToken();
          return;
        }

        const userData = userDoc.data() as User;

        // Se usuário foi desativado, faz logout
        if (!userData.isActive) {
          console.warn("Usuário foi desativado");
          // Limpa intervalo e faz logout
          if (tokenCheckIntervalRef.current) {
            clearInterval(tokenCheckIntervalRef.current);
            tokenCheckIntervalRef.current = null;
          }
          setCurrentUser(null);
          setCurrentCompany(null);
          localStorage.removeItem("currentUser");
          clearAuthToken();
          return;
        }

        // Atualiza dados do usuário se necessário
        const currentUserData = currentUser;
        if (
          userData.uid !== currentUserData.uid ||
          userData.email !== currentUserData.email ||
          userData.role !== currentUserData.role
        ) {
          // Recarrega dados do usuário
          try {
            const updatedUserData = { ...userData, uid: userDoc.id } as User;
            setCurrentUser(updatedUserData);

            // Atualiza localStorage
            localStorage.setItem(
              "currentUser",
              JSON.stringify({
                email: updatedUserData.email,
                name: updatedUserData.displayName,
                id: updatedUserData.uid,
                role: updatedUserData.role,
              })
            );

            // Carrega empresa se necessário
            if (
              updatedUserData.role === UserRole.COMPANY_USER &&
              updatedUserData.companyId
            ) {
              try {
                const companyDoc = await getDoc(
                  doc(db, "companies", updatedUserData.companyId)
                );
                if (companyDoc.exists()) {
                  const companyData = {
                    ...companyDoc.data(),
                    id: companyDoc.id,
                  } as Company;
                  setCurrentCompany(companyData);
                }
              } catch (error) {
                // Ignora erro ao carregar empresa
              }
            }
          } catch (error) {
            logAuthError(error, "tokenCheckInterval - updateUser");
          }
        }
      } catch (error) {
        logAuthError(error, "tokenCheckInterval");
        const authError = mapAuthError(error);

        // Se for erro de token ou permissão, faz logout
        if (authError.type === "token" || authError.type === "permission") {
          // Limpa intervalo e faz logout
          if (tokenCheckIntervalRef.current) {
            clearInterval(tokenCheckIntervalRef.current);
            tokenCheckIntervalRef.current = null;
          }
          setCurrentUser(null);
          setCurrentCompany(null);
          localStorage.removeItem("currentUser");
          clearAuthToken();
        }
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
        tokenCheckIntervalRef.current = null;
      }
    };
  }, [currentUser]);

  const loginViaFirestore = async (
    email: string,
    password: string
  ): Promise<User> => {
    const normalizedEmail = normalizeEmail(email);

    const querySnapshot = await retryWithBackoff(
      async () => {
        const usersQuery = query(
          collection(db, "users"),
          where("email", "==", normalizedEmail)
        );
        return await getDocs(usersQuery);
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        retryable: (error) => isRetryableAuthError(error),
      }
    );

    if (querySnapshot.empty) {
      const error = new Error("Usuário não encontrado");
      logAuthError(error, "login");
      throw error;
    }

    const userDoc = querySnapshot.docs[0];
    const userData = { ...userDoc.data(), uid: userDoc.id } as User & {
      passwordHash?: string;
    };

    if (!userData.isActive) {
      const error = new Error("Usuário inativo. Contacte o administrador.");
      logAuthError(error, "login");
      throw error;
    }

    const passwordHash = userData.passwordHash;
    if (!passwordHash) {
      const error = new Error(
        "Senha não cadastrada. Por favor, redefina sua senha."
      );
      logAuthError(error, "login");
      throw error;
    }

    const isPasswordValid = await verifyPassword(password, passwordHash);
    if (!isPasswordValid) {
      const error = new Error("Senha incorreta");
      logAuthError(error, "login");
      throw error;
    }

    const { passwordHash: _, ...userDataWithoutPassword } = userData;
    const finalUserData = userDataWithoutPassword as User;

    try {
      await retryWithBackoff(
        async () => {
          await setDoc(
            doc(db, "users", userDoc.id),
            {
              ...finalUserData,
              passwordHash,
              lastLogin: new Date(),
            },
            { merge: true }
          );
        },
        {
          maxRetries: 2,
          initialDelay: 500,
          retryable: (error) => isRetryableAuthError(error),
        }
      );
    } catch (error) {
      logAuthError(error, "login - updateLastLogin");
    }

    loginInProgressRef.current = userDoc.id;

    await ensureFirebaseSessionForUser(
      userDoc.id,
      normalizedEmail,
      password,
      userData.displayName || userData.email
    );

    setCurrentUser(finalUserData);
    syncFirebaseReady(userDoc.id);
    setLoading(false);
    persistUserToStorage(finalUserData);
    storeDailySession();

    if (userData.role === UserRole.COMPANY_USER && userData.companyId) {
      try {
        const companyDoc = await retryWithBackoff(
          async () => {
            return await getDoc(doc(db, "companies", userData.companyId!));
          },
          {
            maxRetries: 2,
            initialDelay: 300,
            retryable: (error) => isRetryableAuthError(error),
          }
        );

        if (companyDoc.exists()) {
          const companyData = {
            ...companyDoc.data(),
            id: companyDoc.id,
          } as Company;
          setCurrentCompany(companyData);
        }
      } catch (error) {
        logAuthError(error, "login - loadCompany");
      }
    }

    loginInProgressRef.current = null;
    return finalUserData;
  };

  const login = async (email: string, password: string): Promise<User> => {
    const normalizedEmail = normalizeEmail(email);

    try {
      try {
        const apiResponse = await loginWithApi(normalizedEmail, password);

        if (!apiResponse.user?.uid) {
          throw new Error(apiResponse.error || "Erro ao autenticar");
        }

        const uid = apiResponse.user.uid;
        loginInProgressRef.current = uid;

        if (apiResponse.token) {
          storeAuthToken(apiResponse.token);
        }

        storeDailySession();

        const hydratedUser = {
          ...apiResponse.user,
          uid,
          isActive: apiResponse.user.isActive ?? true,
          mustChangePassword: apiResponse.user.mustChangePassword ?? false,
        } as User;

        setCurrentUser(hydratedUser);
        setLoading(false);
        persistUserToStorage(hydratedUser);

        await ensureFirebaseSessionForUser(
          uid,
          normalizedEmail,
          password,
          apiResponse.user.displayName || normalizedEmail,
          apiResponse.firebaseCustomToken
        );

        const fullUser =
          (await loadUserData(uid, {
            role: apiResponse.user.role,
            companyId: apiResponse.user.companyId ?? undefined,
          })) ?? hydratedUser;

        loginInProgressRef.current = null;
        return fullUser;
      } catch (apiError) {
        loginInProgressRef.current = null;
        const message =
          apiError instanceof Error ? apiError.message : String(apiError);
        const isCredentialError =
          message.includes("não encontrado") ||
          message.includes("incorreta") ||
          message.includes("inativo") ||
          message.includes("não cadastrada") ||
          message.includes("inválid");

        if (isCredentialError) {
          throw apiError;
        }

        console.warn(
          "API de login indisponível, usando autenticação direta no Firestore:",
          message
        );
        return await loginViaFirestore(normalizedEmail, password);
      }
    } catch (error) {
      loginInProgressRef.current = null;
      logAuthError(error, "login");
      throw error;
    }
  };

  const loginWithFirebaseCredential = async (
    credential: UserCredential
  ): Promise<User> => {
    const idToken = await credential.user.getIdToken(true);
    const apiResponse = await loginWithOtpIdToken(idToken);

    if (!apiResponse.user?.uid) {
      throw new Error(apiResponse.error || "Erro ao autenticar com código");
    }

    const uid = apiResponse.user.uid;
    loginInProgressRef.current = uid;

    if (apiResponse.token) {
      storeAuthToken(apiResponse.token);
    }

    storeDailySession();

    try {
      await signOut(auth);
    } catch {
      // ignora
    }

    if (apiResponse.firebaseCustomToken) {
      await establishFirebaseSession(apiResponse.firebaseCustomToken);
    }

    const hydratedUser = {
      ...apiResponse.user,
      uid,
      isActive: apiResponse.user.isActive ?? true,
      mustChangePassword: apiResponse.user.mustChangePassword ?? false,
    } as User;

    setCurrentUser(hydratedUser);
    setLoading(false);
    persistUserToStorage(hydratedUser);
    syncFirebaseReady(uid);

    const fullUser =
      (await loadUserData(uid, {
        role: apiResponse.user.role,
        companyId: apiResponse.user.companyId ?? undefined,
      })) ?? hydratedUser;

    loginInProgressRef.current = null;
    return fullUser;
  };

  const logout = async () => {
    console.log("Fazendo logout...");

    const userId = currentUser?.uid;
    if (userId) {
      await unregisterFcmToken(userId).catch((err) =>
        console.warn("[FCM] Falha ao remover token no logout:", err)
      );
    }

    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
      tokenCheckIntervalRef.current = null;
    }

    try {
      await signOut(auth);
    } catch {
      // ignora se não havia sessão Firebase
    }

    clearLocalSession();
  };

  const isAdmin = (): boolean => {
    if (!currentUser) return false;
    return currentUser.role === UserRole.ADMIN;
  };

  const isOperator = (): boolean => {
    if (!currentUser) return false;
    return currentUser.role === UserRole.OPERATOR;
  };

  const isStaff = (): boolean => {
    return isAdmin() || isOperator();
  };

  const isCompanyUser = () => {
    return currentUser?.role === UserRole.COMPANY_USER;
  };

  const canAccessAdminFeatures = () => {
    return isAdmin();
  };

  const canManageShipments = () => {
    return isStaff();
  };

  const canCreateShipment = () => {
    return isStaff() || isCompanyUser();
  };

  const canImportShipments = () => {
    return isAdmin();
  };

  const canSyncExcel = () => {
    return isAdmin();
  };

  const canDeleteAllShipments = () => {
    return isAdmin();
  };

  const canManageEmployees = () => {
    return isCompanyUser() && Boolean(currentUser?.companyId);
  };

  const mustChangePassword = () => {
    return Boolean(currentUser?.mustChangePassword);
  };

  const completePasswordChange = async (
    newPassword: string
  ): Promise<{ firebaseSessionReady: boolean }> => {
    if (!currentUser?.uid) {
      throw new Error("Usuário não autenticado");
    }

    if (!currentUser.mustChangePassword) {
      throw new Error("Troca de senha não é necessária neste momento");
    }

    const passwordHash = await hashPassword(newPassword);
    const normalizedEmail = normalizeEmail(currentUser.email);

    await updateDoc(doc(db, "users", currentUser.uid), {
      passwordHash,
      mustChangePassword: false,
      updatedAt: new Date(),
    });

    let firebaseSessionReady = false;

    if (
      auth.currentUser &&
      normalizeEmail(auth.currentUser.email || "") === normalizedEmail
    ) {
      try {
        await updatePassword(auth.currentUser, newPassword);
        firebaseSessionReady = true;
      } catch (error) {
        console.warn("[Auth] Falha ao atualizar senha no Firebase Auth:", error);
      }
    }

    if (!firebaseSessionReady) {
      firebaseSessionReady = await ensureFirebaseSignIn({
        uid: currentUser.uid,
        email: normalizedEmail,
        password: newPassword,
        displayName: currentUser.displayName || currentUser.email,
      });
    }

    syncFirebaseReady(currentUser.uid);
    await refreshUserData();
    return { firebaseSessionReady };
  };

  const value: AuthContextType = {
    currentUser,
    currentCompany,
    login,
    loginWithFirebaseCredential,
    logout,
    isAdmin,
    isOperator,
    isStaff,
    isCompanyUser,
    canAccessAdminFeatures,
    canManageShipments,
    canCreateShipment,
    canImportShipments,
    canSyncExcel,
    canDeleteAllShipments,
    canManageEmployees,
    mustChangePassword,
    completePasswordChange,
    loading,
    firebaseReady,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
