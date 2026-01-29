"use client";

import { CheckCircle, Clock, Package, Ship, Users } from "lucide-react";
import React, { useEffect, useMemo, useRef } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EmptyState } from "../empty-state/empty-state";
import { useLanguage } from "../../context/language-context";
import "../../utils/animations.css";
import "./dashboard-charts.css";

interface ChartData {
  name: string;
  value: number;
  color: string;
}

import type { Timestamp } from "firebase/firestore";

interface Shipment {
  id?: string;
  cliente: string;
  status: string;
  etdOrigem?: string;
  pol?: string;
  pod?: string;
  armador?: string;
  tipo?: string;
  createdAt?: Date | Timestamp;
}

interface DashboardChartsProps {
  shipments: Shipment[];
  isAdmin?: boolean;
}

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

export const DashboardCharts: React.FC<DashboardChartsProps> = ({
  shipments,
}) => {
  const { translations } = useLanguage();
  const prevShipmentsRef = useRef<Shipment[]>([]);
  const [stableShipments, setStableShipments] = React.useState<Shipment[]>([]);

  // Estabilizar os dados para evitar piscamento
  useEffect(() => {
    if (!shipments || !Array.isArray(shipments)) {
      setStableShipments([]);
      return;
    }

    // Só atualizar se os dados realmente mudaram
    const currentData = JSON.stringify(
      shipments.map((s) => ({
        id: s.id,
        cliente: s.cliente,
        status: s.status,
        armador: s.armador,
      }))
    );
    const prevData = JSON.stringify(
      prevShipmentsRef.current.map((s) => ({
        id: s.id,
        cliente: s.cliente,
        status: s.status,
        armador: s.armador,
      }))
    );

    if (currentData !== prevData) {
      // Adicionar delay para estabilizar
      const timer = setTimeout(() => {
        setStableShipments(shipments);
        prevShipmentsRef.current = shipments;
      }, 100); // 100ms de delay

      return () => clearTimeout(timer);
    }
  }, [shipments]);

  // Verificar se shipments é válido e tem dados
  const validShipments = useMemo(() => {
    if (
      !stableShipments ||
      !Array.isArray(stableShipments) ||
      stableShipments.length === 0
    ) {
      return [];
    }
    return stableShipments.filter((s) => s && typeof s === "object");
  }, [stableShipments]);

  // Dados para gráfico de pizza de status
  const getStatusData = (): ChartData[] => {
    if (validShipments.length === 0) return [];

    const statusCounts: { [key: string]: number } = {};

    validShipments.forEach((shipment) => {
      const status = shipment.status || "Não definido";
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count], index) => ({
      name: status,
      value: count,
      color: COLORS[index % COLORS.length],
    }));
  };

  // Dados para gráfico de evolução mensal (para usuários comuns)
  const getMonthlyData = (): ChartData[] => {
    if (validShipments.length === 0) return [];

    const monthlyCounts: { [key: string]: number } = {};

    validShipments.forEach((shipment) => {
      if (shipment.etdOrigem) {
        const date = new Date(shipment.etdOrigem);
        const monthKey = `${date.getMonth() + 1}/${date.getFullYear()}`;
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
      }
    });

    return Object.entries(monthlyCounts)
      .sort((a, b) => {
        const [monthA, yearA] = a[0].split("/");
        const [monthB, yearB] = b[0].split("/");
        return (
          new Date(
            Number.parseInt(yearA),
            Number.parseInt(monthA) - 1
          ).getTime() -
          new Date(
            Number.parseInt(yearB),
            Number.parseInt(monthB) - 1
          ).getTime()
        );
      })
      .map(([month, count]) => ({
        name: month,
        value: count,
        color: "#8884d8",
      }));
  };

  // Dados para gráfico de portos de origem (para usuários comuns)
  const getPortData = (): ChartData[] => {
    if (validShipments.length === 0) return [];

    const portCounts: { [key: string]: number } = {};

    validShipments.forEach((shipment) => {
      if (shipment.pol) {
        const port = shipment.pol;
        portCounts[port] = (portCounts[port] || 0) + 1;
      }
    });

    return Object.entries(portCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([port, count], index) => ({
        name: port,
        value: count,
        color: COLORS[index % COLORS.length],
      }));
  };

  const getUniqueClientsCount = (): number => {
    if (validShipments.length === 0) return 0;
    const uniqueClients = new Set(
      validShipments.map((s) => s.cliente).filter(Boolean)
    );
    return uniqueClients.size;
  };

  const getStatusBreakdown = () => {
    const normalizeStatus = (status: string) => {
      return (
        status
          ?.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-") || ""
      );
    };

    const finalized = validShipments.filter((s) => {
      const status = normalizeStatus(s.status);
      return ["concluido", "entregue", "delivered", "finalizado"].includes(
        status
      );
    }).length;

    const inTransit = validShipments.filter((s) => {
      const status = normalizeStatus(s.status);
      return ["em-transito", "agendado", "embarcado", "in-transit"].includes(
        status
      );
    }).length;

    const pendingBooking = validShipments.filter((s) => {
      const status = normalizeStatus(s.status);
      return ["documentacao", "pendente", "pending", "analise"].includes(
        status
      );
    }).length;

    return {
      finalized,
      inTransit,
      pendingBooking,
    };
  };

  const getTopOrigins = () => {
    if (validShipments.length === 0) return [];

    const originCounts: { [key: string]: number } = {};

    validShipments.forEach((shipment) => {
      if (shipment.pol) {
        const origin = shipment.pol;
        originCounts[origin] = (originCounts[origin] || 0) + 1;
      }
    });

    return Object.entries(originCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([origin, count]) => ({
        origin,
        count,
      }));
  };

  const getTopDestinations = () => {
    if (validShipments.length === 0) return [];

    const destinationCounts: { [key: string]: number } = {};

    validShipments.forEach((shipment) => {
      if (shipment.pod) {
        const destination = shipment.pod;
        destinationCounts[destination] =
          (destinationCounts[destination] || 0) + 1;
      }
    });

    return Object.entries(destinationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([destination, count]) => ({
        destination,
        count,
      }));
  };

  // Calcular estatísticas gerais
  const getGeneralStats = () => {
    const normalizeStatus = (status: string) => {
      return (
        status
          ?.toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, "-") || ""
      );
    };

    const total = validShipments.length;

    const completed = validShipments.filter((s) => {
      const status = normalizeStatus(s.status);
      return ["concluido", "entregue", "delivered", "finalizado"].includes(
        status
      );
    }).length;

    const pending = validShipments.filter((s) => {
      const status = normalizeStatus(s.status);
      return ["documentacao", "pendente", "pending", "analise"].includes(
        status
      );
    }).length;

    const inTransit = validShipments.filter((s) => {
      const status = normalizeStatus(s.status);
      return ["em-transito", "agendado", "embarcado", "in-transit"].includes(
        status
      );
    }).length;

    return {
      total,
      completed,
      pending,
      inTransit,
      completedPercentage:
        total > 0 ? Math.round((completed / total) * 100) : 0,
      pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0,
    };
  };

  // Dados para gráficos
  const statusData = getStatusData();
  const monthlyData = getMonthlyData();
  const portData = getPortData();
  const stats = useMemo(() => getGeneralStats(), [validShipments]);
  const uniqueClientsCount = useMemo(
    () => getUniqueClientsCount(),
    [validShipments]
  );
  const statusBreakdown = useMemo(() => getStatusBreakdown(), [validShipments]);
  const totalRoutes = validShipments.length;
  const topOrigins = useMemo(() => getTopOrigins(), [validShipments]);
  const topDestinations = useMemo(() => getTopDestinations(), [validShipments]);

  // Verificar se há dados para mostrar
  if (validShipments.length === 0) {
    // Se não há dados estáveis mas há dados originais, mostrar loading
    if (shipments && shipments.length > 0) {
      return (
        <div className="dashboard-charts">
          <div className="loading-charts">
            <Package size={48} />
            <h3>{translations.loadingCharts}</h3>
            <p>{translations.stabilizingData}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="dashboard-charts fade-in">
        <EmptyState
          icon={Package}
          title={translations.noData || "Nenhum dado disponível"}
          description="Não há envios para exibir nos gráficos. Crie um novo envio para começar."
        />
      </div>
    );
  }

  return (
    <div className="dashboard-charts">
      <div className="key-metrics-section">
        <h3 className="metrics-title">Métricas Principais</h3>
        <div className="metrics-grid">
          <div className="metric-card clients">
            <div className="metric-icon">
              <Users size={20} />
            </div>
            <div className="metric-content">
              <h4>Quantidade de Clientes</h4>
              <p className="metric-value">{uniqueClientsCount}</p>
            </div>
          </div>

          <div className="metric-card routes">
            <div className="metric-icon">
              <Ship size={20} />
            </div>
            <div className="metric-content">
              <h4>Total de Rotas</h4>
              <p className="metric-value">{totalRoutes}</p>
            </div>
          </div>

          <div className="metric-card finished">
            <div className="metric-icon">
              <CheckCircle size={20} />
            </div>
            <div className="metric-content">
              <h4>Finalizados</h4>
              <p className="metric-value">{statusBreakdown.finalized}</p>
            </div>
          </div>

          <div className="metric-card in-progress">
            <div className="metric-icon">
              <Package size={20} />
            </div>
            <div className="metric-content">
              <h4>Em Andamento</h4>
              <p className="metric-value">{statusBreakdown.inTransit}</p>
            </div>
          </div>

          <div className="metric-card pending">
            <div className="metric-icon">
              <Clock size={20} />
            </div>
            <div className="metric-content">
              <h4>Pendentes de Booking</h4>
              <p className="metric-value">{statusBreakdown.pendingBooking}</p>
            </div>
          </div>

          <div className="metric-card origins">
            <div className="metric-icon">
              <Ship size={20} />
            </div>
            <div className="metric-content">
              <h4>Principais Origens</h4>
              <div className="top-ports-list">
                {topOrigins.map((item, index) => (
                  <div key={index} className="port-item">
                    <span className="port-name">{item.origin}</span>
                    <span className="port-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="metric-card destinations">
            <div className="metric-icon">
              <Ship size={20} />
            </div>
            <div className="metric-content">
              <h4>Principais Destinos</h4>
              <div className="top-ports-list">
                {topDestinations.map((item, index) => (
                  <div key={index} className="port-item">
                    <span className="port-name">{item.destination}</span>
                    <span className="port-count">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas Gerais */}
      <div className="stats-overview">
        <div className="stat-item">
          <div className="stat-icon total">
            <Ship size={20} />
          </div>
          <div className="stat-content">
            <h3>{translations.totalShipments}</h3>
            <p className="stat-number">{stats.total}</p>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon completed">
            <CheckCircle size={20} />
          </div>
          <div className="stat-content">
            <h3>{translations.completed}</h3>
            <p className="stat-number">{stats.completedPercentage}%</p>
            <small>
              {stats.completed} de {stats.total}
            </small>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon pending">
            <Clock size={20} />
          </div>
          <div className="stat-content">
            <h3>{translations.pending}</h3>
            <p className="stat-number">{stats.pendingPercentage}%</p>
            <small>
              {stats.pending} de {stats.total}
            </small>
          </div>
        </div>

        <div className="stat-item">
          <div className="stat-icon in-transit">
            <Package size={20} />
          </div>
          <div className="stat-content">
            <h3>{translations.inTransit}</h3>
            <p className="stat-number">{stats.inTransit}</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="charts-grid">
        {/* Gráfico de Pizza - Status */}
        <div className="chart-container">
          <h3>{translations.distributionByStatus}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) =>
                  `${name} ${((percent || 0) * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Barras - Evolução Mensal Pessoal */}
        <div className="chart-container">
          <h3>{translations.evolutionOfMyShipments}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Linha - Status ao Longo do Tempo */}
        <div className="chart-container">
          <h3>{translations.statusOfMyShipments}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#8884d8"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Barras - Portos de Origem */}
        <div className="chart-container">
          <h3>{translations.originPorts}</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={portData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#ffc658" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
