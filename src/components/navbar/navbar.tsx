"use client";

import { ChevronLeft, ChevronRight, Home, Plus, Settings, Ship, X } from "lucide-react";
import { useContext, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logo2 from "../../assets/logo2.png";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import { AdminPanel } from "../admin-panel/admin-panel";
import { NavbarContext } from "./navbar-context";
import "./navbar.css";

const Navbar = () => {
  const { isCollapsed, setIsCollapsed } = useContext(NavbarContext);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, logout } = useAuth();
  const { translations } = useLanguage();

  const getActiveItem = () => {
    if (location.pathname.includes("settings")) return "settings";
    if (location.pathname.includes("novo-envio")) return "novo-envio";
    if (location.pathname.includes("envios")) return "envios";
    return "home";
  };

  const activeItem = getActiveItem();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <>
      <div className={`navbar ${!isCollapsed ? "expanded" : "collapsed"}`}>
        <div className="navbar-header">
          <button
            className="toggle-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={!isCollapsed ? translations.collapseMenu : translations.expandMenu}
          >
            {isCollapsed ? <ChevronRight size={24} /> : <ChevronLeft size={24} />}
          </button>

          <div className="company-logo">
            <img
              src={logo2 || "/placeholder.svg"}
              alt="SeaLogistics Logo"
              className={`company-logo-img ${!isCollapsed ? "visible" : "hidden"
                }`}
            />
          </div>
        </div>

        <nav className="nav-items">
          <div
            className={`nav-item ${activeItem === "home" ? "active" : ""}`}
            onClick={() => navigate("/home")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/home")}
          >
            <div className="icon-container">
              <Home size={20} />
            </div>
            <span className={`nav-text ${!isCollapsed ? "visible" : "hidden"}`}>
              {isAdmin() ? translations.dashboard : translations.inicio}
            </span>
          </div>

          <div
            className={`nav-item ${activeItem === "envios" ? "active" : ""}`}
            onClick={() => navigate("/envios")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/envios")}
          >
            <div className="icon-container">
              <Ship size={20} />
            </div>
            <span className={`nav-text ${!isCollapsed ? "visible" : "hidden"}`}>
              {translations.envios}
            </span>
          </div>

          {/* Botão Novo Envio - apenas para admins */}
          {isAdmin() && (
            <div
              className={`nav-item ${activeItem === "novo-envio" ? "active" : ""
                }`}
              onClick={() => navigate("/novo-envio")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && navigate("/novo-envio")}
            >
              <div className="icon-container">
                <Plus size={20} />
              </div>
              <span
                className={`nav-text ${!isCollapsed ? "visible" : "hidden"}`}
              >
                {translations.novoEnvio}
              </span>
            </div>
          )}

          <div
            className={`nav-item ${activeItem === "settings" ? "active" : ""}`}
            onClick={() => navigate("/settings")}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && navigate("/settings")}
          >
            <div className="icon-container">
              <Settings size={20} />
            </div>
            <span className={`nav-text ${!isCollapsed ? "visible" : "hidden"}`}>
              {translations.configuracoes}
            </span>
          </div>

          {/* Botão de Logout */}
          <div
            className="nav-item logout"
            onClick={handleLogout}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && handleLogout()}
          >
            <div className="icon-container">
              <X size={20} />
            </div>
            <span className={`nav-text ${!isCollapsed ? "visible" : "hidden"}`}>
              {translations.sair}
            </span>
          </div>
        </nav>
      </div>

      {/* Painel Administrativo Modal */}
      {showAdminPanel && (
        <AdminPanel onClose={() => setShowAdminPanel(false)} />
      )}
    </>
  );
};

export default Navbar;
