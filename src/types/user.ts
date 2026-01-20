export interface userForm {
  email: string;
  password: string;
}

export interface userCredentials {
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
  companyName?: string;
  companyCode?: string;
  role?: UserRole;
}

export enum UserRole {
  ADMIN = 'admin',
  COMPANY_USER = 'company_user'
}

export interface Company {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  phone?: string;
  address?: string;
  createdAt: Date;
  isActive: boolean;
}

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;
  companyId?: string; // Para usuários de empresa
  companyName?: string; // Cache do nome da empresa
  phone?: string; // Telefone/WhatsApp do usuário
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  notificationPreferences?: NotificationPreferences; // Preferências de notificação
}

export interface NotificationPreferences {
  email: boolean; // Receber notificações por email
  whatsapp: boolean; // Receber notificações por WhatsApp
  statusUpdates: boolean; // Notificar mudanças de status
  newShipments: boolean; // Notificar novos envios
}

export interface UserSettings {
  name: string;
  email: string;
  phone: string;
  whatsappPhone?: string; // Número de WhatsApp (pode ser diferente do telefone)
  company: string;
  position: string;
  notifications: {
    email: boolean;
    whatsapp: boolean; // Notificações via WhatsApp
    push: boolean;
    statusUpdates: boolean;
    newShipments: boolean;
  };
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    theme: string;
  };
  createdAt?: Date;
  updatedAt?: Date;
}
