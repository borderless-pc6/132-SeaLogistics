import type { User } from "../types/user";

const API_URL = (
  import.meta.env.VITE_BACKEND_URL ||
  import.meta.env.VITE_EMAIL_SERVER_URL ||
  "http://localhost:3001"
).replace(/\/+$/, "");

export interface LoginResponse {
  success: boolean;
  token?: string;
  firebaseCustomToken?: string | null;
  user?: User & { uid: string };
  error?: string;
}

export interface RegisterAdminResponse {
  success: boolean;
  user?: User & { uid: string };
  error?: string;
}

/** @deprecated Auth usa Firestore diretamente — ver authService.ts e auth-context */
export async function registerAdminWithApi(data: {
  name: string;
  email: string;
  password: string;
  adminCode: string;
}): Promise<RegisterAdminResponse> {
  const response = await fetch(`${API_URL}/api/auth/register-admin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = (await response.json()) as RegisterAdminResponse;

  if (!response.ok) {
    throw new Error(result.error || "Erro ao cadastrar administrador");
  }

  return result;
}

export async function loginWithApi(
  email: string,
  password: string
): Promise<LoginResponse> {
  const payload = {
    email: email.trim().toLowerCase(),
    password,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as LoginResponse;

      if (!response.ok) {
        throw new Error(data.error || "Erro ao autenticar");
      }

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const isNetworkError =
        lastError.message.includes("Failed to fetch") ||
        lastError.message.includes("NetworkError");

      if (!isNetworkError || attempt === 2) {
        throw lastError;
      }

      await new Promise((resolve) => setTimeout(resolve, 2000 * (attempt + 1)));
    }
  }

  throw lastError ?? new Error("Erro ao autenticar");
}

export function storeAuthToken(token: string) {
  localStorage.setItem("authToken", token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem("authToken");
}

export function clearAuthToken() {
  localStorage.removeItem("authToken");
}

export interface RefreshFirebaseResponse {
  success: boolean;
  firebaseCustomToken?: string;
  error?: string;
}

/** Renova a sessão Firebase Auth a partir do JWT armazenado (necessário para regras do Firestore). */
export async function refreshFirebaseSession(): Promise<RefreshFirebaseResponse> {
  const token = getAuthToken();
  if (!token) {
    return { success: false, error: "Token JWT não encontrado" };
  }

  const response = await fetch(`${API_URL}/api/auth/refresh-firebase`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const data = (await response.json()) as RefreshFirebaseResponse;

  if (!response.ok) {
    throw new Error(data.error || "Erro ao renovar sessão Firebase");
  }

  return data;
}

export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return fetch(`${API_URL}${path}`, { ...options, headers });
}

export async function provisionFirebaseUser(data: {
  uid: string;
  email: string;
  password: string;
  displayName: string;
}): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/provision-user`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      uid: data.uid,
      email: data.email.trim().toLowerCase(),
      password: data.password,
      displayName: data.displayName,
    }),
  });

  const result = (await response.json()) as { success?: boolean; error?: string };

  if (!response.ok) {
    throw new Error(result.error || "Erro ao provisionar usuário Firebase");
  }
}
