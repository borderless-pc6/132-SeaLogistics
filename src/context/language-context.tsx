"use client";
import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";
import { translations } from "./../translations/index";

export type Language = "en" | "pt" | "es";

export interface LanguageContextType {
    language: Language;
    setLanguage: (language: Language) => void;
    translations: typeof translations.en;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(
    undefined
);

export function LanguageProvider({ children }: { children: ReactNode }) {
    const getInitialLanguage = (): Language => {
        if (typeof window === "undefined") {
            return "pt";
        }

        const savedLang = localStorage.getItem("language") as Language;
        if (savedLang && ["en", "pt", "es"].includes(savedLang)) {
            return savedLang;
        }

        return "pt";
    };

    const [language, setLanguageState] = useState<Language>(getInitialLanguage);

    useEffect(() => {
        document.documentElement.lang = language === "pt" ? "pt-BR" : language;
    }, [language]);

    const setLanguage = (lang: Language) => {
        setLanguageState(lang);
        localStorage.setItem("language", lang);
    };

    const value = {
        language,
        setLanguage,
        translations: translations[language],
    };

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error("useLanguage must be used within a LanguageProvider");
    }
    return context;
} 