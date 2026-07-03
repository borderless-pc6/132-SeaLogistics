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
import {
  onAuthStateChanged,
  signInWithCustomToken,
  signInWithEmailAndPassword,
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
import { clearAuthToken, getAuthToken, loginWithApi, refreshFirebaseSession, storeAuthToken } from "../services/authApi";
import { ensureFirebaseSignIn } from "../services/firebaseAuthClient";
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
  const lastTokenCheckRef = useRef<number>(0);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const establishFirebaseSession = async (firebaseCustomToken: string) => {
    await signInWithCustomToken(auth, firebaseCustomToken);
  };

  const tryFirebaseEmailSignIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return true;
    } catch (error) {
      console.warn("[Auth] Firebase email/senha indisponível:", error);
      return false;
    }
  };

  const tryRestoreFirebaseSession = async (): Promise<boolean> => {
    const savedToken = getAuthToken();
    if (!savedToken) return false;

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
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          await loadUserData(firebaseUser.uid);
        } catch {
          setLoading(false);
        }
        return;
      }

      const savedUser = localStorage.getItem("currentUser");
      const savedToken = getAuthToken();

      if (savedUser && savedToken) {
        try {
          const userData = JSON.parse(savedUser);
          if (userData.id) {
            const restored = await tryRestoreFirebaseSession();
            if (restored) {
              return;
            }
            await loadUserData(userData.id);
            return;
          }
        } catch {
          localStorage.removeItem("currentUser");
          clearAuthToken();
        }
      } else if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          if (userData.id) {
            await loadUserData(userData.id);
            return;
          }
        } catch {
          localStorage.removeItem("currentUser");
        }
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    try {
      console.log("Carregando dados do usuário do Firestore:", userId);

      // Usa retry para erros de rede
      const userDoc = await retryWithBackoff(
        async () => {
          return await getDoc(doc(db, "users", userId));
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          retryable: (error) => isRetryableAuthError(error),
        }
      );

      if (userDoc.exists()) {
        const userData = { ...userDoc.data(), uid: userDoc.id } as User;
        console.log("Dados do usuário carregados:", userData);
        setCurrentUser(userData);

        if (shouldRegisterPush(userData)) {
          registerFcmToken(userId).catch((err) =>
            console.warn("[FCM] Falha ao registrar token:", err)
          );
        }

        // Atualizar localStorage com dados mais recentes
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            email: userData.email,
            name: userData.displayName,
            id: userData.uid,
            role: userData.role,
          })
        );

        // Se for usuário de empresa, carregar dados da empresa
        if (userData.role === UserRole.COMPANY_USER && userData.companyId) {
          try {
            const companyDoc = await retryWithBackoff(
              async () => {
                return await getDoc(doc(db, "companies", userData.companyId!));
              },
              {
                maxRetries: 2,
                initialDelay: 1000,
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
            logAuthError(error, "loadUserData - company");
          }
        }
      } else {
        console.warn("Usuário não encontrado no Firestore:", userId);
        localStorage.removeItem("currentUser");
        setCurrentUser(null);
      }
    } catch (error) {
      logAuthError(error, "loadUserData");
      const authError = mapAuthError(error);

      // Se for erro de token expirado, faz logout automático
      if (authError.type === "token") {
        logout();
      }

      localStorage.removeItem("currentUser");
      setCurrentUser(null);
      throw error;
    } finally {
      setLoading(false);
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

    setCurrentUser(finalUserData);

    await ensureFirebaseSignIn({
      uid: userDoc.id,
      email: normalizedEmail,
      password,
      displayName: userData.displayName || userData.email,
    });

    if (userData.role === UserRole.COMPANY_USER && userData.companyId) {
      try {
        const companyDoc = await retryWithBackoff(
          async () => {
            return await getDoc(doc(db, "companies", userData.companyId!));
          },
          {
            maxRetries: 2,
            initialDelay: 1000,
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

    localStorage.setItem(
      "currentUser",
      JSON.stringify({
        email: userData.email,
        name: userData.displayName,
        id: userDoc.id,
        role: userData.role,
        mustChangePassword: userData.mustChangePassword ?? false,
      })
    );

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

        if (apiResponse.token) {
          storeAuthToken(apiResponse.token);
        }

        if (apiResponse.firebaseCustomToken) {
          await establishFirebaseSession(apiResponse.firebaseCustomToken);
        } else {
          await tryFirebaseEmailSignIn(normalizedEmail, password);
        }

        await loadUserData(apiResponse.user.uid);
        const userDoc = await getDoc(doc(db, "users", apiResponse.user.uid));
        if (userDoc.exists()) {
          return { ...userDoc.data(), uid: userDoc.id } as User;
        }
        return { ...apiResponse.user, uid: apiResponse.user.uid } as User;
      } catch (apiError) {
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
      logAuthError(error, "login");
      throw error;
    }
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

    setCurrentUser(null);
    setCurrentCompany(null);
    localStorage.removeItem("currentUser");
    clearAuthToken();
    lastTokenCheckRef.current = 0;
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

    await refreshUserData();
    return { firebaseSessionReady };
  };

  const value: AuthContextType = {
    currentUser,
    currentCompany,
    login,
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
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
