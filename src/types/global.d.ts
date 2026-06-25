declare module '*.css';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.jpeg';
declare module '*.gif';
declare module '*.bmp';
declare module '*.tiff';

declare module '../../components/chat-assistant/chat-assistant' {
    const ChatAssistant: () => JSX.Element;
    export default ChatAssistant;
}

declare module '@/context/auth-context' {
    import { User, Company } from '@/types/user';

    interface AuthContextType {
        currentUser: User | null;
        currentCompany: Company | null;
        login: (email: string, password: string) => Promise<void>;
        logout: () => void;
        isAdmin: () => boolean;
        isOperator: () => boolean;
        isStaff: () => boolean;
        isCompanyUser: () => boolean;
        canAccessAdminFeatures: () => boolean;
        canManageShipments: () => boolean;
        loading: boolean;
        refreshUserData: () => Promise<void>;
    }

    export const useAuth: () => AuthContextType;
} 