import { z } from 'zod';

/**
 * Validação de senha robusta
 * - Mínimo 8 caracteres
 * - Pelo menos 1 letra maiúscula
 * - Pelo menos 1 letra minúscula
 * - Pelo menos 1 número
 * - Pelo menos 1 caractere especial
 */
export const passwordSchema = z
  .string()
  .min(8, 'A senha deve ter no mínimo 8 caracteres')
  .regex(/[a-z]/, 'A senha deve conter pelo menos uma letra minúscula')
  .regex(/[A-Z]/, 'A senha deve conter pelo menos uma letra maiúscula')
  .regex(/[0-9]/, 'A senha deve conter pelo menos um número')
  .regex(
    /[^a-zA-Z0-9]/,
    'A senha deve conter pelo menos um caractere especial (!@#$%^&*)'
  );

/**
 * Calcula a força da senha (0-100)
 */
export function calculatePasswordStrength(password: string): number {
  if (!password) return 0;

  let strength = 0;

  // Comprimento
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;

  // Complexidade
  if (/[a-z]/.test(password)) strength += 15; // minúsculas
  if (/[A-Z]/.test(password)) strength += 15; // maiúsculas
  if (/[0-9]/.test(password)) strength += 15; // números
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15; // especiais

  return Math.min(strength, 100);
}

/**
 * Retorna o nível de força da senha
 */
export function getPasswordStrengthLevel(strength: number): {
  level: 'weak' | 'medium' | 'strong' | 'very-strong';
  label: string;
  color: string;
} {
  if (strength < 40) {
    return { level: 'weak', label: 'Fraca', color: '#ef4444' };
  } else if (strength < 60) {
    return { level: 'medium', label: 'Média', color: '#f59e0b' };
  } else if (strength < 80) {
    return { level: 'strong', label: 'Forte', color: '#10b981' };
  } else {
    return { level: 'very-strong', label: 'Muito Forte', color: '#059669' };
  }
}

/**
 * Retorna dicas para melhorar a senha
 */
export function getPasswordTips(password: string): string[] {
  const tips: string[] = [];

  if (password.length < 8) {
    tips.push('Use pelo menos 8 caracteres');
  }
  if (!/[a-z]/.test(password)) {
    tips.push('Adicione letras minúsculas');
  }
  if (!/[A-Z]/.test(password)) {
    tips.push('Adicione letras maiúsculas');
  }
  if (!/[0-9]/.test(password)) {
    tips.push('Adicione números');
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    tips.push('Adicione caracteres especiais (!@#$%^&*)');
  }

  return tips;
}
