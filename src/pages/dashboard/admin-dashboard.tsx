"use client";

import { collection, getDocs } from "firebase/firestore";
import {
  AlertCircle,
  Building2,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  FileText,
  Package,
  Plus,
  Settings,
  Shield,
  Ship,
  TrendingUp,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminPanel } from "../../components/admin-panel/admin-panel";
import ChatAssistant from "../../components/chat-assistant/chat-assistant";
import { DashboardCharts } from "../../components/dashboard-charts";
import Navbar from "../../components/navbar/navbar";
import { StatCardSkeleton } from "../../components/skeleton-loader/skeleton-loader";
import { Tooltip } from "../../components/tooltip/tooltip";
import { useLanguage } from "../../context/language-context";
import { useShipments } from "../../context/shipments-context";
import { db } from "../../lib/firebaseConfig";
import { exportDashboardToPDF } from "../../services/pdfExportService";
import type { Company } from "../../types/user";
import "../../utils/animations.css";
import "./dashboard.css";

import type { Shipment } from "../../context/shipments-context";

interface AdminDashboardStats {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  pending: number;
  thisMonth: number;
  totalUsers: number;
  totalCompanies: number;
  activeCompanies: number;
}

export const AdminDashboard = () => {
  const { translations, language } = useLanguage();
  const { shipments, loading: shipmentsLoading } = useShipments() as {
    shipments: Shipment[];
    loading: boolean;
  };
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminDashboardStats>({
    totalShipments: 0,
    inTransit: 0,
    delivered: 0,
    pending: 0,
    thisMonth: 0,
    totalUsers: 0,
    totalCompanies: 0,
    activeCompanies: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminPanelTab, setAdminPanelTab] = useState<
    "users" | "companies" | "shipments"
  >("users");

  // Função para abrir o painel admin com uma aba específica
  const openAdminPanel = (tab: "users" | "companies" | "shipments") => {
    setAdminPanelTab(tab);
    setShowAdminPanel(true);
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);

        // Carregar usuários
        const usersSnapshot = await getDocs(collection(db, "users"));
        const totalUsers = usersSnapshot.size;

        // Carregar empresas
        const companiesSnapshot = await getDocs(collection(db, "companies"));
        const companies = companiesSnapshot.docs.map(
          (doc) => doc.data() as Company
        );
        const totalCompanies = companies.length;
        const activeCompanies = companies.filter((c) => c.isActive).length;

        // Calcular estatísticas de shipments
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const normalizeStatus = (status: string) => {
          return (
            status
              ?.toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .replace(/\s+/g, "-") || ""
          );
        };

        const totalShipments = shipments.length;

        const inTransit = shipments.filter((s) => {
          const status = normalizeStatus(s.status);
          return [
            "em-transito",
            "agendado",
            "embarcado",
            "in-transit",
          ].includes(status);
        }).length;

        const delivered = shipments.filter((s) => {
          const status = normalizeStatus(s.status);
          return ["concluido", "entregue", "delivered", "finalizado"].includes(
            status
          );
        }).length;

        const pending = shipments.filter((s) => {
          const status = normalizeStatus(s.status);
          return ["documentacao", "pendente", "pending", "analise"].includes(
            status
          );
        }).length;

        const thisMonth = shipments.filter((s) => {
          if (s.etdOrigem) {
            const shipDate = new Date(s.etdOrigem);
            return (
              shipDate.getMonth() === currentMonth &&
              shipDate.getFullYear() === currentYear
            );
          }
          return false;
        }).length;

        setStats({
          totalShipments,
          inTransit,
          delivered,
          pending,
          thisMonth,
          totalUsers,
          totalCompanies,
          activeCompanies,
        });
      } catch (error) {
        console.error("Error loading admin stats:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [shipments]);

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      console.log("Iniciando exportação PDF...", { stats, shipmentsCount: shipments.length });
      
      await exportDashboardToPDF({
        title: translations.administrativeDashboard,
        stats,
        shipments: shipments.slice(0, 100), // Limitar a 100 para não sobrecarregar o PDF
        language: language as "pt" | "en" | "es",
      });
      
      console.log("PDF exportado com sucesso!");
      // Você pode adicionar um toast aqui se tiver
    } catch (error) {
      console.error("Erro ao exportar PDF:", error);
      alert(translations.exportError || "Erro ao exportar relatório. Tente novamente.");
    } finally {
      setIsExporting(false);
    }
  };

  if (loading || shipmentsLoading) {
    return (
      <main className="dashboard-container">
        <Navbar />
        <div className="dashboard-content fade-in">
          <div className="dashboard-header">
            <h1>{translations.administrativeDashboard}</h1>
            <p>{translations.welcomeAdmin}</p>
          </div>
          <div className="admin-stats-grid">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        </div>
        <ChatAssistant />
      </main>
    );
  }

  return (
    <main className="dashboard-container">
      <Navbar />
      <div className="dashboard-content fade-in">
        <div className="dashboard-header">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h1>{translations.administrativeDashboard}</h1>
              <p>{translations.welcomeAdmin}</p>
            </div>
            <Tooltip content={translations.export || "Exportar relatório para PDF"}>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="export-pdf-button"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "12px 20px",
                  background: isExporting 
                    ? "linear-gradient(135deg, #95a5a6 0%, #7f8c8d 100%)"
                    : "linear-gradient(135deg, #789170 0%, #5a7a5a 100%)",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: isExporting ? "wait" : "pointer",
                  fontSize: "14px",
                  fontWeight: 500,
                  boxShadow: "0 4px 12px rgba(120, 145, 112, 0.3)",
                  transition: "all 0.3s ease",
                  opacity: isExporting ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isExporting) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow = "0 6px 16px rgba(120, 145, 112, 0.4)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 12px rgba(120, 145, 112, 0.3)";
                }}
              >
                {isExporting ? (
                  <>
                    <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    {translations.saving || "Exportando..."}
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    {translations.export || "Exportar PDF"}
                  </>
                )}
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="admin-stats-grid">
          <Tooltip content={translations.clickToSeeAllShipments || "Clique para ver todos os envios"}>
            <div
              className="stat-card clickable hover-lift"
              onClick={() => navigate("/envios")}
            >
              <div className="stat-icon">
                <Ship size={24} />
              </div>
              <div className="stat-info">
                <h3>{translations.totalShipments}</h3>
                <p className="stat-number">{stats.totalShipments}</p>
              </div>
            </div>
          </Tooltip>

          <Tooltip content={translations.inTransit + " - Clique para filtrar"}>
            <div
              className="stat-card clickable hover-lift"
              onClick={() => navigate("/envios?status=em-transito")}
            >
              <div className="stat-icon in-transit">
                <Package size={24} />
              </div>
              <div className="stat-info">
                <h3>{translations.inTransit}</h3>
                <p className="stat-number">{stats.inTransit}</p>
              </div>
            </div>
          </Tooltip>

          <Tooltip content={translations.delivered + " - Clique para filtrar"}>
            <div
              className="stat-card clickable hover-lift"
              onClick={() => navigate("/envios?status=concluido")}
            >
              <div className="stat-icon delivered">
                <CheckCircle size={24} />
              </div>
              <div className="stat-info">
                <h3>{translations.delivered}</h3>
                <p className="stat-number">{stats.delivered}</p>
              </div>
            </div>
          </Tooltip>

          <Tooltip content={translations.pending + " - Clique para filtrar"}>
            <div
              className="stat-card clickable hover-lift"
              onClick={() => navigate("/envios?status=documentacao")}
            >
              <div className="stat-icon pending">
                <Clock size={24} />
              </div>
              <div className="stat-info">
                <h3>{translations.pending}</h3>
                <p className="stat-number">{stats.pending}</p>
              </div>
            </div>
          </Tooltip>

          <Tooltip content={translations.thisMonth + " - Clique para filtrar"}>
            <div
              className="stat-card clickable hover-lift"
              onClick={() => navigate("/envios?filter=this-month")}
            >
              <div className="stat-icon this-month">
                <TrendingUp size={24} />
              </div>
              <div className="stat-info">
                <h3>{translations.thisMonth}</h3>
                <p className="stat-number">{stats.thisMonth}</p>
              </div>
            </div>
          </Tooltip>

          <Tooltip content="Gerenciar usuários do sistema">
            <div
              className="stat-card clickable hover-lift"
              onClick={() => {
                openAdminPanel("users");
              }}
            >
              <div className="stat-icon users">
                <Users size={24} />
              </div>
              <div className="stat-info">
                <h3>{translations.totalUsers}</h3>
                <p className="stat-number">{stats.totalUsers}</p>
              </div>
            </div>
          </Tooltip>

          <Tooltip content="Gerenciar empresas cadastradas">
            <div
              className="stat-card clickable hover-lift"
              onClick={() => {
                openAdminPanel("companies");
              }}
            >
              <div className="stat-icon companies">
                <Building2 size={24} />
              </div>
              <div className="stat-info">
                <h3>{translations.activeCompanies}</h3>
                <p className="stat-number">
                  {stats.activeCompanies}/{stats.totalCompanies}
                </p>
              </div>
            </div>
          </Tooltip>

          <Tooltip content={translations.manageShipments}>
            <div
              className="stat-card clickable hover-lift"
              onClick={() => navigate("/envios")}
            >
              <div className="stat-icon action">
                <AlertCircle size={24} />
              </div>
              <div className="stat-info">
                <h3>{translations.manageShipments}</h3>
                <p className="action-text">
                  {translations.clickToSeeAllShipments}
                </p>
              </div>
            </div>
          </Tooltip>
        </div>

        {/* Ações Rápidas */}
        <div className="quick-actions fade-in">
          <h2>{translations.quickActions}</h2>
          <div className="actions-grid">
            <Tooltip content={translations.newShipment}>
              <button
                className="hover-lift smooth-transition"
                onClick={() => navigate("/novo-envio")}
              >
                <Plus size={20} />
                <span>{translations.newShipment}</span>
              </button>
            </Tooltip>

            <Tooltip content={translations.adminPanel}>
              <button
                className="hover-lift smooth-transition"
                onClick={() => {
                  openAdminPanel("users");
                }}
              >
                <Shield size={20} />
                <span>{translations.adminPanel}</span>
              </button>
            </Tooltip>

            <Tooltip content={translations.configurations}>
              <button
                className="hover-lift smooth-transition"
                onClick={() => navigate("/settings")}
              >
                <Settings size={20} />
                <span>{translations.configurations}</span>
              </button>
            </Tooltip>

            <Tooltip content={translations.connectExcel}>
              <button
                className="hover-lift smooth-transition"
                onClick={() => navigate("/excel-integration")}
              >
                <FileSpreadsheet size={20} />
                <span>{translations.connectExcel}</span>
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Gráficos e Estatísticas */}
        <DashboardCharts shipments={shipments} isAdmin={true} />
      </div>

      {showAdminPanel && (
        <AdminPanel
          onClose={() => setShowAdminPanel(false)}
          initialTab={adminPanelTab}
        />
      )}

      <ChatAssistant />
    </main>
  );
};
