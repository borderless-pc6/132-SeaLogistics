"use client";

import type React from "react";

import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/auth-context";

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const { currentUser, loading, mustChangePassword } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
        }}
      >
        <div>Carregando...</div>
      </div>
    );
  }

  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  if (!currentUser.isActive) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <h2>Conta Inativa</h2>
        <p>Sua conta está inativa. Entre em contato com o administrador.</p>
      </div>
    );
  }

  if (
    mustChangePassword() &&
    location.pathname !== "/change-password"
  ) {
    return <Navigate to="/change-password" replace />;
  }

  if (
    !mustChangePassword() &&
    location.pathname === "/change-password"
  ) {
    return <Navigate to="/home" replace />;
  }

  return <>{children}</>;
};
