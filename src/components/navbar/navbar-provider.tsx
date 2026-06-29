import React, { useEffect, useState, ReactNode } from 'react';
import { NavbarContext } from './navbar-context';

interface NavbarProviderProps {
    children: ReactNode;
}

export const NavbarProvider: React.FC<NavbarProviderProps> = ({ children }) => {
    const [isCollapsed, setIsCollapsed] = useState(false);

    useEffect(() => {
        document.documentElement.dataset.navbarCollapsed = isCollapsed ? 'true' : 'false';
    }, [isCollapsed]);

    return (
        <NavbarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
            {children}
        </NavbarContext.Provider>
    );
}; 