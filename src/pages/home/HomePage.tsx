import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/auth-context";
import { Dashboard } from "../dashboard/dashboard";

export const HomePage = () => {
  const { isAdmin, isOperator, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="page-loading__spinner" />
        <p>Carregando...</p>
      </div>
    );
  }

  if (isAdmin()) {
    return <Navigate to="/admin-dashboard" replace />;
  }

  if (isOperator()) {
    return <Dashboard />;
  }

  return <Dashboard />;
};
