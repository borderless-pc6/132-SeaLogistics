"use client";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  type Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import type React from "react";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { db } from "../lib/firebaseConfig";
import {
  sendClientShipmentNotification,
  sendClientStatusUpdateNotification,
} from "../services/notificationService";
import { recordStatusHistory } from "../services/statusHistoryService";
import { UserRole } from "../types/user";
import { useAuth } from "./auth-context";

export const SHIPMENTS_PAGE_SIZE = 50;

export interface Shipment {
  id?: string;
  cliente: string;
  operador: string;
  shipper: string;
  invoice: string;
  pol: string;
  pod: string;
  etdOrigem: string;
  etaDestino: string;
  currentLocation: string;
  quantBox: number;
  status: string;
  numeroBl: string;
  armador: string;
  booking: string;
  companyId?: string;
  tipo?: string;
  observacoes?: string;
  imo?: string;
  actualDeparture?: string;
  reportedEta?: string;
  navio?: string;
  navioCodigo?: string;
  containerType?: string;
  cargoReady?: string;
  coleta?: string;
  emptyToShipper?: string;
  readyToLoad?: string;
  loadedOnBoard?: string;
  destinoRumo?: string;
  etaRumo?: string;
  shipMapImageUrl?: string;
  ce?: string;
  createdAt?: Timestamp | Date;
  updatedAt?: Timestamp | Date;
}

interface ShipmentsContextType {
  shipments: Shipment[];
  addShipment: (
    shipment: Omit<Shipment, "id" | "createdAt" | "companyId">
  ) => Promise<void>;
  updateShipment: (shipment: Shipment) => Promise<void>;
  canEditShipment: (shipment: Shipment) => boolean;
  canCreateShipment: () => boolean;
  deleteAllShipments: () => Promise<void>;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
}

const ShipmentsContext = createContext<ShipmentsContextType | undefined>(
  undefined
);

export const useShipments = () => {
  const context = useContext(ShipmentsContext);
  if (context === undefined) {
    throw new Error("useShipments must be used within a ShipmentsProvider");
  }
  return context;
};

interface ShipmentsProviderProps {
  children: ReactNode;
}

export const ShipmentsProvider: React.FC<ShipmentsProviderProps> = ({
  children,
}) => {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [loadedCount, setLoadedCount] = useState(SHIPMENTS_PAGE_SIZE);
  const [refreshKey, setRefreshKey] = useState(0);
  const { currentUser, isAdmin, firebaseReady } = useAuth();
  const isLoadingMoreRef = useRef(false);

  const refresh = useCallback(() => {
    isLoadingMoreRef.current = false;
    setLoadingMore(false);
    setLoadedCount(SHIPMENTS_PAGE_SIZE);
    setRefreshKey((prev) => prev + 1);
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    isLoadingMoreRef.current = true;
    setLoadingMore(true);
    setLoadedCount((prev) => prev + SHIPMENTS_PAGE_SIZE);
  }, [loadingMore, hasMore]);

  useEffect(() => {
    if (!currentUser) {
      setShipments([]);
      setLoading(false);
      setHasMore(false);
      return undefined;
    }

    if (!firebaseReady) {
      setShipments([]);
      setLoading(true);

      const timeout = setTimeout(() => {
        setLoading(false);
      }, 15000);

      return () => clearTimeout(timeout);
    }

    const isAdminOrOperator =
      currentUser.role === UserRole.ADMIN ||
      currentUser.role === UserRole.OPERATOR;
    const isCompanyUser =
      currentUser.role === UserRole.COMPANY_USER && !!currentUser.companyId;

    if (!isAdminOrOperator && !isCompanyUser) {
      setShipments([]);
      setLoading(false);
      setHasMore(false);
      return undefined;
    }

    if (!isLoadingMoreRef.current) {
      setLoading(true);
    }

    let q;
    if (isAdminOrOperator) {
      q = query(
        collection(db, "shipments"),
        orderBy("createdAt", "desc"),
        limit(loadedCount)
      );
    } else {
      q = query(
        collection(db, "shipments"),
        where("companyId", "==", currentUser.companyId),
        orderBy("createdAt", "desc"),
        limit(loadedCount)
      );
    }

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const shipmentsData: Shipment[] = [];
        querySnapshot.forEach((docSnap) => {
          shipmentsData.push({
            id: docSnap.id,
            ...docSnap.data(),
          } as Shipment);
        });

        setShipments(shipmentsData);
        setHasMore(querySnapshot.docs.length === loadedCount);
        setLoading(false);
        setLoadingMore(false);
        isLoadingMoreRef.current = false;
      },
      (error) => {
        console.error("Error fetching shipments:", error);
        if (error.code === "permission-denied") {
          console.error(
            "Permissão negada no Firestore. Faça logout e login novamente."
          );
        }
        setLoading(false);
        setLoadingMore(false);
        isLoadingMoreRef.current = false;
      }
    );

    return () => unsubscribe();
  }, [
    currentUser?.uid,
    currentUser?.role,
    currentUser?.companyId,
    firebaseReady,
    loadedCount,
    refreshKey,
  ]);

  const addShipment = async (
    shipmentData: Omit<Shipment, "id" | "createdAt" | "companyId"> & {
      companyId?: string;
    }
  ) => {
    try {
      if (!currentUser) {
        throw new Error("Usuário não autenticado");
      }

      const isAdmin_ = isAdmin();
      const isOperator_ = currentUser.role === UserRole.OPERATOR;
      const isCompanyUser_ = currentUser.role === UserRole.COMPANY_USER;

      if (!isAdmin_ && !isOperator_ && !isCompanyUser_) {
        throw new Error("Você não tem permissão para criar novos shipments");
      }

      let companyIdToUse = shipmentData.companyId;

      if (isCompanyUser_) {
        if (!currentUser.companyId) {
          throw new Error("Sua conta não está vinculada a uma empresa");
        }
        companyIdToUse = currentUser.companyId;
      }

      const shipmentWithCompany: Record<string, unknown> = {
        ...shipmentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      if (companyIdToUse !== undefined) {
        shipmentWithCompany.companyId = companyIdToUse;
      } else {
        delete shipmentWithCompany.companyId;
      }

      const docRef = await addDoc(
        collection(db, "shipments"),
        shipmentWithCompany
      );

      try {
        await recordStatusHistory({
          shipmentId: docRef.id,
          eventType: "created",
          toStatus: shipmentData.status || "documentacao",
          changedBy: currentUser.uid,
          changedByName:
            currentUser.displayName || currentUser.email || "Sistema",
          companyId: companyIdToUse,
        });
      } catch (historyError) {
        console.error("Erro ao registrar histórico de criação:", historyError);
      }

      if (companyIdToUse) {
        try {
          await sendClientShipmentNotification({
            ...shipmentData,
            id: docRef.id,
            companyId: companyIdToUse,
          } as Shipment);
        } catch (error) {
          console.error("=== ERRO AO NOTIFICAR CLIENTE (NOVO ENVIO) ===", error);
        }
      }
    } catch (error) {
      console.error("Error adding shipment: ", error);
      throw error;
    }
  };

  const updateShipment = async (updatedShipment: Shipment) => {
    try {
      if (!updatedShipment.id) {
        throw new Error("Shipment ID is required for updates");
      }

      if (!canEditShipment(updatedShipment)) {
        throw new Error("Sem permissão para editar este shipment");
      }

      const shipmentRef = doc(db, "shipments", updatedShipment.id);
      const currentShipmentDoc = await getDoc(shipmentRef);

      if (!currentShipmentDoc.exists()) {
        throw new Error("Shipment não encontrado");
      }

      const currentShipment = currentShipmentDoc.data();
      const oldStatus = currentShipment.status;

      const updatePayload: Record<string, unknown> = {
        cliente: updatedShipment.cliente,
        operador: updatedShipment.operador,
        shipper: updatedShipment.shipper,
        pol: updatedShipment.pol,
        pod: updatedShipment.pod,
        etdOrigem: updatedShipment.etdOrigem,
        etaDestino: updatedShipment.etaDestino,
        currentLocation: updatedShipment.currentLocation,
        quantBox: updatedShipment.quantBox,
        status: updatedShipment.status,
        numeroBl: updatedShipment.numeroBl,
        armador: updatedShipment.armador,
        booking: updatedShipment.booking,
        invoice: updatedShipment.invoice,
        observacoes: updatedShipment.observacoes || "",
        tipo: updatedShipment.tipo || "",
        imo: updatedShipment.imo || "",
        actualDeparture: updatedShipment.actualDeparture || "",
        reportedEta: updatedShipment.reportedEta || "",
        updatedAt: new Date(),
      };
      if (updatedShipment.companyId !== undefined) {
        updatePayload.companyId = updatedShipment.companyId;
      }
      await updateDoc(shipmentRef, updatePayload);

      if (oldStatus !== updatedShipment.status) {
        try {
          await recordStatusHistory({
            shipmentId: updatedShipment.id,
            eventType: "status_change",
            fromStatus: oldStatus,
            toStatus: updatedShipment.status,
            changedBy: currentUser?.uid || "system",
            changedByName:
              currentUser?.displayName ||
              currentUser?.email ||
              "Sistema",
            companyId: updatedShipment.companyId,
          });
        } catch (historyError) {
          console.error("Erro ao registrar histórico de status:", historyError);
        }
      }

      if (oldStatus !== updatedShipment.status) {
        try {
          await sendClientStatusUpdateNotification(updatedShipment, oldStatus);
        } catch (error) {
          console.error(
            "=== ERRO AO NOTIFICAR CLIENTE (ATUALIZAÇÃO DE STATUS) ===",
            error
          );
        }
      }
    } catch (error) {
      console.error("Error updating shipment: ", error);
      throw error;
    }
  };

  const canEditShipment = (shipment: Shipment): boolean => {
    if (!currentUser) return false;

    if (isAdmin() || currentUser.role === UserRole.OPERATOR) return true;

    return false;
  };

  const canCreateShipment = (): boolean => {
    if (!currentUser) return false;
    return (
      isAdmin() ||
      currentUser.role === UserRole.OPERATOR ||
      currentUser.role === UserRole.COMPANY_USER
    );
  };

  const deleteAllShipments = async () => {
    try {
      if (!currentUser) {
        throw new Error("Usuário não autenticado");
      }

      if (!isAdmin()) {
        throw new Error(
          "Apenas administradores podem deletar todos os shipments"
        );
      }

      const q = query(collection(db, "shipments"));
      const querySnapshot = await getDocs(q);
      const docs = querySnapshot.docs;

      const BATCH_SIZE = 500;
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = docs.slice(i, i + BATCH_SIZE);
        chunk.forEach((document) => {
          batch.delete(doc(db, "shipments", document.id));
        });
        await batch.commit();
      }

      refresh();
    } catch (error) {
      console.error("Error deleting all shipments: ", error);
      throw error;
    }
  };

  const value: ShipmentsContextType = {
    shipments,
    addShipment,
    updateShipment,
    canEditShipment,
    canCreateShipment,
    deleteAllShipments,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
  };

  return (
    <ShipmentsContext.Provider value={value}>
      {children}
    </ShipmentsContext.Provider>
  );
};
