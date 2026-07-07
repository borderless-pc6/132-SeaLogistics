"use client";

import type React from "react";
import type { ReactNode } from "react";
import { ReferenceDataProvider } from "../context/reference-data-context";
import { ShipmentsProvider } from "../context/shipments-context";

interface AuthenticatedProvidersProps {
  children: ReactNode;
}

export const AuthenticatedProviders: React.FC<AuthenticatedProvidersProps> = ({
  children,
}) => {
  return (
    <ReferenceDataProvider>
      <ShipmentsProvider>{children}</ShipmentsProvider>
    </ReferenceDataProvider>
  );
};
