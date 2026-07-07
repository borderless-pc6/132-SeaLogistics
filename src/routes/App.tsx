import { lazy, Suspense } from "react";
import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { AuthenticatedLayout } from "../components/authenticated-layout";
import { NavbarProvider } from "../components/navbar/navbar-provider";
import { AdminRoute, PrivateRoute } from "../components/protected-route";
import { TableSkeleton } from "../components/skeleton-loader/skeleton-loader";
import { AuthProvider } from "../context/auth-context";
import { LanguageProvider } from "../context/language-context";
import { ToastProvider } from "../context/toast-context";
import { Dashboard } from "../pages/dashboard/dashboard";
import { EnviosPage } from "../pages/envios/envios-page";
import { ShipmentDetailPage } from "../pages/envios/shipment-detail-page";
import { ChangePasswordPage } from "../pages/change-password/change-password-page";
import { EquipePage } from "../components/company-employees/company-employees";
import { HomePage } from "../pages/home/HomePage";
import { LoginPage as Login } from "../pages/login/login-page";
import { RegisterPage as Register } from "../pages/register/register-page";
import { PushNotificationListener } from "../components/push-notification-listener/push-notification-listener";
import ExcelCallback from "../pages/auth/excel-callback";

const AdminDashboard = lazy(
  () => import("../pages/dashboard/admin-dashboard").then((m) => ({ default: m.AdminDashboard }))
);
const ExcelIntegrationPage = lazy(
  () => import("../pages/excel-integration/excel-integration-page")
);
const ExcelSpecificTest = lazy(
  () => import("../components/excel-specific-test/excel-specific-test")
);
const NovoEnvioPage = lazy(() => import("../pages/novo-envio/novo-envio"));
const Settings = lazy(() =>
  import("../pages/settings/Settings").then((m) => ({ default: m.Settings }))
);

const LazyFallback = () => (
  <div style={{ padding: "2rem" }}>
    <TableSkeleton />
  </div>
);

export const App = () => {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <NavbarProvider>
            <Router
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
              <PushNotificationListener />
              <div className="app-container">
                <Suspense fallback={<LazyFallback />}>
                  <Routes>
                    <Route path="/" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    <Route
                      element={
                        <PrivateRoute>
                          <AuthenticatedLayout />
                        </PrivateRoute>
                      }
                    >
                      <Route
                        path="/change-password"
                        element={<ChangePasswordPage />}
                      />
                      <Route path="/equipe" element={<EquipePage />} />
                      <Route path="/home" element={<HomePage />} />
                      <Route path="/dashboard" element={<Dashboard />} />
                      <Route path="/envios" element={<EnviosPage />} />
                      <Route path="/envios/:id" element={<ShipmentDetailPage />} />
                      <Route path="/novo-envio" element={<NovoEnvioPage />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/auth/callback" element={<ExcelCallback />} />
                      <Route
                        path="/excel-auth-callback"
                        element={<ExcelCallback />}
                      />
                      <Route
                        path="/excel-integration"
                        element={
                          <AdminRoute>
                            <ExcelIntegrationPage />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/excel-test"
                        element={
                          <AdminRoute>
                            <ExcelSpecificTest />
                          </AdminRoute>
                        }
                      />
                      <Route
                        path="/admin-dashboard"
                        element={
                          <AdminRoute>
                            <AdminDashboard />
                          </AdminRoute>
                        }
                      />
                    </Route>
                  </Routes>
                </Suspense>
              </div>
            </Router>
          </NavbarProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
};
