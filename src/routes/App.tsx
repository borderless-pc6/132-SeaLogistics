import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import ExcelSpecificTest from "../components/excel-specific-test/excel-specific-test";
import { Footer } from "../components/footer/footer";
import { NavbarProvider } from "../components/navbar/navbar-provider";
import { AdminRoute, PrivateRoute } from "../components/protected-route";
import { AuthProvider } from "../context/auth-context";
import { LanguageProvider } from "../context/language-context";
import { ShipmentsProvider } from "../context/shipments-context";
import { ToastProvider } from "../context/toast-context";
import ExcelCallback from "../pages/auth/excel-callback";
import { AdminDashboard } from "../pages/dashboard/admin-dashboard";
import { Dashboard } from "../pages/dashboard/dashboard";
import { EnviosPage } from "../pages/envios/envios-page";
import ExcelIntegrationPage from "../pages/excel-integration/excel-integration-page";
import { HomePage as Home } from "../pages/home/HomePage";
import { LoginPage as Login } from "../pages/login/login-page";
import NovoEnvioPage from "../pages/novo-envio/novo-envio";
import { RegisterPage as Register } from "../pages/register/register-page";
import { Settings } from "../pages/settings/Settings";

export const App = () => {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AuthProvider>
          <ShipmentsProvider>
            <NavbarProvider>
            <Router
              future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
            >
              <div className="app-container">
                <Routes>
                  <Route path="/" element={<Login />} />
                  <Route path="/register" element={<Register />} />

                  <Route
                    path="/home"
                    element={
                      <PrivateRoute>
                        <Home />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/dashboard"
                    element={
                      <PrivateRoute>
                        <Dashboard />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/envios"
                    element={
                      <PrivateRoute>
                        <EnviosPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/novo-envio"
                    element={
                      <AdminRoute>
                        <NovoEnvioPage />
                      </AdminRoute>
                    }
                  />
                  <Route
                    path="/settings"
                    element={
                      <PrivateRoute>
                        <Settings />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/excel-integration"
                    element={
                      <PrivateRoute>
                        <ExcelIntegrationPage />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/excel-test"
                    element={
                      <PrivateRoute>
                        <ExcelSpecificTest />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/auth/callback"
                    element={
                      <PrivateRoute>
                        <ExcelCallback />
                      </PrivateRoute>
                    }
                  />
                  <Route
                    path="/excel-auth-callback"
                    element={
                      <PrivateRoute>
                        <ExcelCallback />
                      </PrivateRoute>
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
                </Routes>
                {/* Footer aparece em todas as páginas autenticadas */}
                <Footer theme="light" />
              </div>
            </Router>
            </NavbarProvider>
          </ShipmentsProvider>
        </AuthProvider>
      </ToastProvider>
    </LanguageProvider>
  );
};
