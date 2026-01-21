import { z } from 'zod';

// Mensagens de erro personalizadas
const messages = {
  required: 'Este campo é obrigatório',
  email: 'Email inválido',
  minLength: (min: number) => `Mínimo de ${min} caracteres`,
  invalidDate: 'Data inválida',
  futureDate: 'A data de chegada deve ser posterior à data de partida',
  positiveNumber: 'Deve ser um número positivo',
};

// Schema para campos comuns (sem o campo 'tipo' que será específico de cada schema)
const baseShipmentFields = {
  clienteId: z.string().min(1, messages.required),
  operador: z.string().min(1, messages.required),
  etdOrigem: z.string().min(1, messages.required),
  etaDestino: z.string().min(1, messages.required),
  quantBox: z.number().positive(messages.positiveNumber),
  status: z.string().min(1, messages.required),
  numeroBl: z.string().optional(),
  armador: z.string().optional(),
  booking: z.string().optional(),
  invoice: z.string().optional(),
  shipper: z.string().optional(),
};

// Schema para transporte Marítimo
export const maritimeShipmentSchema = z.object({
  ...baseShipmentFields,
  tipo: z.literal('Marítimo'),
  pol: z.string().min(1, 'Porto de origem é obrigatório para transporte marítimo'),
  pod: z.string().min(1, 'Porto de destino é obrigatório para transporte marítimo'),
  numeroBl: z.string().min(1, 'BL é obrigatório para transporte marítimo'),
  armador: z.string().min(1, 'Armador é obrigatório para transporte marítimo'),
}).refine(
  (data) => {
    // Valida que ETA é depois de ETD
    if (data.etdOrigem && data.etaDestino) {
      const etd = new Date(data.etdOrigem);
      const eta = new Date(data.etaDestino);
      return eta >= etd;
    }
    return true;
  },
  {
    message: messages.futureDate,
    path: ['etaDestino'],
  }
);

// Schema para transporte Aéreo
export const airShipmentSchema = z.object({
  ...baseShipmentFields,
  tipo: z.literal('Aéreo'),
  pol: z.string().min(1, 'Aeroporto de origem é obrigatório'),
  pod: z.string().min(1, 'Aeroporto de destino é obrigatório'),
  booking: z.string().min(1, 'Booking é obrigatório para transporte aéreo'),
}).refine(
  (data) => {
    if (data.etdOrigem && data.etaDestino) {
      const etd = new Date(data.etdOrigem);
      const eta = new Date(data.etaDestino);
      return eta >= etd;
    }
    return true;
  },
  {
    message: messages.futureDate,
    path: ['etaDestino'],
  }
);

// Schema para transporte Terrestre
export const landShipmentSchema = z.object({
  ...baseShipmentFields,
  tipo: z.literal('Terrestre'),
  pol: z.string().min(1, 'Origem é obrigatória'),
  pod: z.string().min(1, 'Destino é obrigatório'),
  invoice: z.string().min(1, 'Invoice é obrigatória para transporte terrestre'),
}).refine(
  (data) => {
    if (data.etdOrigem && data.etaDestino) {
      const etd = new Date(data.etdOrigem);
      const eta = new Date(data.etaDestino);
      return eta >= etd;
    }
    return true;
  },
  {
    message: messages.futureDate,
    path: ['etaDestino'],
  }
);

// Schema dinâmico que se adapta ao tipo
// COMENTADO: Não está sendo usado e causa erro no runtime
// Se precisar usar discriminatedUnion no futuro, descomente esta linha
// export const dynamicShipmentSchema = z.discriminatedUnion('tipo', [
//   maritimeShipmentSchema,
//   airShipmentSchema,
//   landShipmentSchema,
// ]);

// Schema genérico (quando tipo não foi selecionado ainda)
export const genericShipmentSchema = z.object({
  ...baseShipmentFields,
  tipo: z.enum(['Aéreo', 'Marítimo', 'Terrestre', ''] as const, {
    errorMap: () => ({ message: 'Selecione um tipo de transporte' }),
  }).optional(),
  pol: z.string().optional(),
  pod: z.string().optional(),
});

/**
 * Retorna o schema apropriado baseado no tipo de transporte
 */
export function getShipmentSchema(tipo: 'Aéreo' | 'Marítimo' | 'Terrestre' | '') {
  switch (tipo) {
    case 'Marítimo':
      return maritimeShipmentSchema;
    case 'Aéreo':
      return airShipmentSchema;
    case 'Terrestre':
      return landShipmentSchema;
    default:
      return genericShipmentSchema;
  }
}
