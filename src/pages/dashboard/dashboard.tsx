"use client";

import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  MapPin,
  Package,
  Settings,
  Ship,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ChatAssistant from "../../components/chat-assistant/chat-assistant";
import { DashboardCharts } from "../../components/dashboard-charts";
import Navbar from "../../components/navbar/navbar";
import { StatCardSkeleton } from "../../components/skeleton-loader/skeleton-loader";
import { Tooltip } from "../../components/tooltip/tooltip";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import { type Shipment, useShipments } from "../../context/shipments-context";
import "../../utils/animations.css";
import "./user-dashboard.css";

interface DashboardStats {
  totalShipments: number;
  inTransit: number;
  delivered: number;
  pending: number;
  thisMonth: number;
}

interface RecentActivity {
  id: string;
  action: string;
  shipment: string;
  date: string;
  status: string;
}

export const Dashboard = () => {
  const { currentUser, isAdmin } = useAuth();
  const { shipments, loading } = useShipments();
  const { translations } = useLanguage();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalShipments: 0,
    inTransit: 0,
    delivered: 0,
    pending: 0,
    thisMonth: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  // Redirecionar admins para a página de envios
  useEffect(() => {
    if (!loading && isAdmin()) {
      navigate("/envios");
    }
  }, [isAdmin, loading, navigate]);

  const calculateStats = useCallback((shipmentsToStat: Shipment[]) => {
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

    const totalShipments = shipmentsToStat.length;

    const inTransit = shipmentsToStat.filter((s) => {
      const status = normalizeStatus(s.status);
      return ["em-transito", "agendado", "embarcado", "in-transit"].includes(
        status
      );
    }).length;

    const delivered = shipmentsToStat.filter((s) => {
      const status = normalizeStatus(s.status);
      return ["concluido", "entregue", "delivered", "finalizado"].includes(
        status
      );
    }).length;

    const pending = shipmentsToStat.filter((s) => {
      const status = normalizeStatus(s.status);
      return ["documentacao", "pendente", "pending", "analise"].includes(
        status
      );
    }).length;

    const thisMonth = shipmentsToStat.filter((s) => {
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
    });
  }, []);

  const generateRecentActivity = useCallback(
    (shipmentsToProcess: Shipment[]) => {
      const activities: RecentActivity[] = shipmentsToProcess
        .slice(0, 5)
        .map((shipment) => ({
          id: shipment.id || "",
          action: getActionText(shipment.status),
          shipment: `${shipment.pol} → ${shipment.pod}`,
          date: shipment.etdOrigem || "",
          status: shipment.status,
        }));

      setRecentActivity(activities);
    },
    [translations]
  );

  const getActionText = (status: string) => {
    const normalizedStatus =
      status
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-") || "";

    switch (normalizedStatus) {
      case "documentacao":
      case "pendente":
        return translations.statusPending;
      case "agendado":
      case "em-transito":
      case "embarcado":
        return translations.statusInTransit;
      case "concluido":
      case "entregue":
        return translations.statusDelivered;
      default:
        return translations.statusUpdated;
    }
  };

  useEffect(() => {
    if (shipments.length > 0) {
      calculateStats(shipments);
      generateRecentActivity(shipments);
    }
  }, [shipments, calculateStats, generateRecentActivity]);

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const getStatusColor = (status: string) => {
    const normalizedStatus =
      status
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-") || "";

    switch (normalizedStatus) {
      case "documentacao":
      case "pendente":
        return "#073b4c";
      case "agendado":
        return "#118ab2";
      case "em-transito":
      case "embarcado":
        return "#ffd166";
      case "concluido":
      case "entregue":
        return "#06d6a0";
      default:
        return "#6c757d";
    }
  };

  // Se for admin ou ainda carregando, não mostrar o dashboard
  if (loading || isAdmin()) {
    return (
      <main className="dashboard-container">
        <Navbar />
        <div className="dashboard-content fade-in">
          {loading ? (
            <>
              <div className="dashboard-header">
                <h1>{translations.dashboard}</h1>
                <p>{translations.welcomeUser} {currentUser?.displayName}!</p>
              </div>
              <div className="stats-section">
                <h2 className="section-title">{translations.overview}</h2>
                <div className="stats-grid">
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </div>
              </div>
            </>
          ) : (
            <div className="loading-message">
              {translations.redirecting}
            </div>
          )}
        </div>
        <ChatAssistant />
      </main>
    );
  }

  return (
    <main className="dashboard-container">
      <Navbar />
      <div className="dashboard-content">
        <div className="dashboard-header">
          <h1>{translations.dashboard}</h1>
          <p>
            {translations.welcomeUser} {currentUser?.displayName}!
          </p>
        </div>

        {/* Cards de Estatísticas - Primeira Linha */}
        <div className="stats-section">
          <h2 className="section-title">{translations.overview}</h2>
          <div className="stats-grid">
            <div className="stat-card" onClick={() => navigate("/envios")}>
              <div className="stat-icon">
                <Ship size={24} />
              </div>
              <div className="stat-info">
                <h3>{translations.totalShipments}</h3>
                <p className="stat-number">{stats.totalShipments}</p>
              </div>
            </div>

            <div
              className="stat-card"
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

            <div
              className="stat-card"
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

            <div
              className="stat-card"
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

            <div
              className="stat-card"
              onClick={() => navigate("/envios?period=this-month")}
            >
              <div className="stat-icon this-month">
                <TrendingUp size={24} />
              </div>
              <div className="stat-info">
                <h3>{translations.thisMonth}</h3>
                <p className="stat-number">{stats.thisMonth}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Seção Principal - Duas Colunas */}
        <div className="main-content-grid">
          {/* Coluna Esquerda - Atividades Recentes */}
          <div className="left-column">
            <div
              className="recent-activity clickable-card"
              onClick={() => navigate("/envios")}
            >
              <h2 className="section-title">{translations.shipmentsTitle}</h2>
              {recentActivity.length > 0 ? (
                <div className="activity-list">
                  {recentActivity.map((activity) => (
                    <div key={activity.id} className="activity-item">
                      <div
                        className="activity-status-dot"
                        style={{
                          backgroundColor: getStatusColor(activity.status),
                        }}
                      ></div>
                      <div className="activity-details">
                        <p className="activity-action">{activity.action}</p>
                        <p className="activity-shipment">
                          <MapPin size={14} />
                          {activity.shipment}
                        </p>
                      </div>
                      <div className="activity-date">
                        <Calendar size={14} />
                        {formatDate(activity.date)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-activity">
                  <AlertCircle size={48} />
                  <p>{translations.noShipments}</p>
                </div>
              )}
            </div>
          </div>

          {/* Coluna Direita - Ações Rápidas */}
          <div className="right-column">
            {/* Ações Rápidas */}
            <div className="quick-actions-section">
              <h2 className="section-title">{translations.quickActions}</h2>
              <div className="quick-actions-grid">
                <a href="/envios" className="quick-action-card">
                  <div className="action-icon">
                    <Ship size={24} />
                  </div>
                  <div className="action-content">
                    <h3>{translations.shipmentsTitle}</h3>
                    <p>{translations.manageShipments}</p>
                  </div>
                </a>
                <a href="/settings" className="quick-action-card">
                  <div className="action-icon">
                    <Settings size={24} />
                  </div>
                  <div className="action-content">
                    <h3>{translations.settings}</h3>
                    <p>{translations.configurePreferences}</p>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos - Largura Total */}
        <div className="charts-section-full">
          <h2 className="section-title">{translations.analytics}</h2>
          <DashboardCharts shipments={shipments} isAdmin={false} />
        </div>
      </div>
      <ChatAssistant />
    </main>
  );
};
