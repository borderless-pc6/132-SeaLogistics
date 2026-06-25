"use client";

import type React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { UserRole } from "../../types/user";

interface StaffRouteProps {
  children: React.ReactNode;
}

export const StaffRoute: React.FC<StaffRouteProps> = ({ children }) => {
  const { currentUser, loading } = useAuth();

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

  const isStaff =
    currentUser.role === UserRole.ADMIN ||
    currentUser.role === UserRole.OPERATOR;

  if (!isStaff) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};
