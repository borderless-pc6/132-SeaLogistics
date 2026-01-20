import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import React, {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { db } from "../lib/firebaseConfig";
import { Company, User, UserRole } from "../types/user";
import {
  isRetryableAuthError,
  logAuthError,
  mapAuthError,
} from "../utils/authErrorHandler";
import { retryWithBackoff } from "../utils/retryWithBackoff";

interface AuthContextType {
  currentUser: User | null;
  currentCompany: Company | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isCompanyUser: () => boolean;
  canAccessAdminFeatures: () => boolean;
  canManageShipments: () => boolean;
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
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentCompany, setCurrentCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const lastTokenCheckRef = useRef<number>(0);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Verificar se há usuário salvo no localStorage
    const savedUser = localStorage.getItem("currentUser");
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        console.log("Carregando dados do localStorage:", userData);
        if (userData.id) {
          loadUserData(userData.id);
        } else {
          console.warn("ID do usuário não encontrado no localStorage");
          setLoading(false);
        }
      } catch (error) {
        console.error("Error parsing saved user:", error);
        localStorage.removeItem("currentUser");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
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

  const login = async (email: string, password: string) => {
    try {
      // Simular autenticação (em produção usar Firebase Auth)
      // TODO: Implementar validação de senha quando usar Firebase Auth
      console.log(
        "Attempting login with password:",
        password ? "***" : "no password"
      );

      // Usa retry para erros de rede
      const querySnapshot = await retryWithBackoff(
        async () => {
          const usersQuery = query(
            collection(db, "users"),
            where("email", "==", email)
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
      const userData = { ...userDoc.data(), uid: userDoc.id } as User;

      console.log("Usuário encontrado:", userData);

      if (!userData.isActive) {
        const error = new Error("Usuário inativo. Contacte o administrador.");
        logAuthError(error, "login");
        throw error;
      }

      // Atualizar último login com retry
      try {
        await retryWithBackoff(
          async () => {
            await setDoc(
              doc(db, "users", userDoc.id),
              {
                ...userData,
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
        // Não falha o login se não conseguir atualizar lastLogin
        logAuthError(error, "login - updateLastLogin");
      }

      setCurrentUser(userData);

      // Carregar empresa se necessário
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
          // Não falha o login se não conseguir carregar empresa
        }
      }

      // Salvar no localStorage
      const userDataForStorage = {
        email: userData.email,
        name: userData.displayName,
        id: userDoc.id,
        role: userData.role,
      };

      console.log("Salvando no localStorage:", userDataForStorage);
      localStorage.setItem("currentUser", JSON.stringify(userDataForStorage));
    } catch (error) {
      logAuthError(error, "login");
      throw error;
    }
  };

  const logout = () => {
    console.log("Fazendo logout...");

    // Limpa intervalo de verificação
    if (tokenCheckIntervalRef.current) {
      clearInterval(tokenCheckIntervalRef.current);
      tokenCheckIntervalRef.current = null;
    }

    setCurrentUser(null);
    setCurrentCompany(null);
    localStorage.removeItem("currentUser");
    lastTokenCheckRef.current = 0;
  };

  const isAdmin = (): boolean => {
    if (!currentUser) return false;
    return currentUser.role === UserRole.ADMIN;
  };

  const isCompanyUser = () => {
    return currentUser?.role === UserRole.COMPANY_USER;
  };

  const canAccessAdminFeatures = () => {
    return isAdmin();
  };

  const canManageShipments = () => {
    // Admins podem gerenciar todos os shipments
    // Usuários de empresa só podem gerenciar os próprios
    return (
      currentUser?.role === UserRole.ADMIN ||
      currentUser?.role === UserRole.COMPANY_USER
    );
  };

  const value: AuthContextType = {
    currentUser,
    currentCompany,
    login,
    logout,
    isAdmin,
    isCompanyUser,
    canAccessAdminFeatures,
    canManageShipments,
    loading,
    refreshUserData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
