import { useCallback, useState } from 'react';
import { z, ZodSchema } from 'zod';

export interface ValidationError {
  [key: string]: string;
}

export interface UseFormValidationReturn<T> {
  errors: ValidationError;
  validateField: (fieldName: keyof T, value: any) => boolean;
  validateForm: (data: T) => boolean;
  clearError: (fieldName: keyof T) => void;
  clearAllErrors: () => void;
  setError: (fieldName: keyof T, message: string) => void;
}

/**
 * Hook customizado para validação de formulários usando Zod
 * 
 * @param schema - Schema Zod para validação
 * @returns Objeto com funções e estado de validação
 * 
 * @example
 * const schema = z.object({
 *   email: z.string().email('Email inválido'),
 *   password: z.string().min(6, 'Mínimo 6 caracteres')
 * });
 * 
 * const { errors, validateField, validateForm } = useFormValidation(schema);
 */
export function useFormValidation<T extends Record<string, any>>(
  schema: ZodSchema<T>
): UseFormValidationReturn<T> {
  const [errors, setErrors] = useState<ValidationError>({});

  /**
   * Valida um campo específico
   */
  const validateField = useCallback(
    (fieldName: keyof T, value: any): boolean => {
      try {
        // Cria um objeto parcial para validar apenas o campo específico
        const partialData = { [fieldName]: value } as Partial<T>;
        
        // Tenta validar usando safeParse
        const result = schema.safeParse(partialData as T);
        
        if (result.success) {
          // Se passou, remove o erro
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[fieldName as string];
            return newErrors;
          });
          return true;
        } else {
          // Procura por erros específicos deste campo
          const fieldError = result.error.errors.find(
            (err) => err.path[0] === fieldName
          );
          
          if (fieldError) {
            setErrors((prev) => ({
              ...prev,
              [fieldName]: fieldError.message,
            }));
            return false;
          }
          
          // Se não encontrou erro para este campo, remove erro existente
          setErrors((prev) => {
            const newErrors = { ...prev };
            delete newErrors[fieldName as string];
            return newErrors;
          });
          return true;
        }
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessage = error.errors[0]?.message || 'Campo inválido';
          setErrors((prev) => ({
            ...prev,
            [fieldName]: errorMessage,
          }));
          return false;
        }
        return false;
      }
    },
    [schema]
  );

  /**
   * Valida o formulário completo
   */
  const validateForm = useCallback(
    (data: T): boolean => {
      try {
        schema.parse(data);
        setErrors({});
        return true;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const newErrors: ValidationError = {};
          error.errors.forEach((err) => {
            const path = err.path.join('.');
            newErrors[path] = err.message;
          });
          setErrors(newErrors);
          return false;
        }
        return false;
      }
    },
    [schema]
  );

  /**
   * Limpa erro de um campo específico
   */
  const clearError = useCallback((fieldName: keyof T) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName as string];
      return newErrors;
    });
  }, []);

  /**
   * Limpa todos os erros
   */
  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  /**
   * Define erro manualmente para um campo
   */
  const setError = useCallback((fieldName: keyof T, message: string) => {
    setErrors((prev) => ({
      ...prev,
      [fieldName]: message,
    }));
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearError,
    clearAllErrors,
    setError,
  };
}
