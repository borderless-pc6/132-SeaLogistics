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

export async function loginWithApi(
  email: string,
  password: string
): Promise<LoginResponse> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = (await response.json()) as LoginResponse;

  if (!response.ok) {
    throw new Error(data.error || "Erro ao autenticar");
  }

  return data;
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
