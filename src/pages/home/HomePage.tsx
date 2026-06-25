import { useAuth } from '../../context/auth-context';
import { Dashboard } from '../dashboard/dashboard';
import { AdminDashboard } from '../dashboard/admin-dashboard';

export const HomePage = () => {
    const { isAdmin, isOperator, loading } = useAuth();

    if (loading) {
        return <div>Carregando...</div>;
    }

    if (isAdmin()) {
        return <AdminDashboard />;
    }

    if (isOperator()) {
        return <Dashboard />;
    }

    return <Dashboard />;
}; 