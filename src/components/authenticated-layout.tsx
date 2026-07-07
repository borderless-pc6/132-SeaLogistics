"use client";

import type React from "react";
import { Outlet } from "react-router-dom";
import { AuthenticatedProviders } from "./authenticated-providers";

export const AuthenticatedLayout: React.FC = () => {
  return (
    <AuthenticatedProviders>
      <Outlet />
    </AuthenticatedProviders>
  );
};
