/**
 * Utilitários para hash e verificação de senhas
 * Usa Web Crypto API nativa do navegador
 */

/**
 * Gera um hash SHA-256 da senha
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

/**
 * Verifica se a senha fornecida corresponde ao hash armazenado
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const passwordHash = await hashPassword(password);
  return passwordHash === storedHash;
}


