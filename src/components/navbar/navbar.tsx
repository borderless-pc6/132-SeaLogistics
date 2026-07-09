"use client";

import { Home, Menu, Plus, Settings, Ship, Users, X } from "lucide-react";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import logo2 from "../../assets/logo2.png";
import { useAuth } from "../../context/auth-context";
import { useLanguage } from "../../context/language-context";
import "./navbar.css";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isStaff, isAdmin, canCreateShipment, canManageEmployees, currentUser } = useAuth();
  const { translations } = useLanguage();

  const getActiveItem = () => {
    if (location.pathname.includes("equipe")) return "equipe";
    if (location.pathname.includes("perfil")) return "perfil";
    if (location.pathname.includes("settings")) return "settings";
    if (location.pathname.includes("novo-envio")) return "novo-envio";
    if (location.pathname.includes("envios")) return "envios";
    return "home";
  };

  const activeItem = getActiveItem();

  const handleNavigate = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const navItems = [
    {
      id: "home",
      path: "/home",
      icon: Home,
      label: isStaff() ? translations.dashboard : translations.inicio,
    },
    {
      id: "envios",
      path: "/envios",
      icon: Ship,
      label: translations.envios,
    },
    ...(canManageEmployees()
      ? [
          {
            id: "equipe",
            path: "/equipe",
            icon: Users,
            label: "Equipe",
          },
        ]
      : []),
    ...(canCreateShipment()
      ? [
          {
            id: "novo-envio",
            path: "/novo-envio",
            icon: Plus,
            label: translations.novoEnvio,
          },
        ]
      : []),
    {
      id: "settings",
      path: "/settings",
      icon: Settings,
      label: translations.configuracoes,
    },
  ];

  return (
    <>
      <header className="app-header">
        <div className="app-header__inner">
          <button
            type="button"
            className="app-header__menu-btn"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <button
            type="button"
            className="app-header__brand"
            onClick={() => handleNavigate("/home")}
          >
            <img src={logo2 || "/placeholder.svg"} alt="SeaLogistics" className="app-header__logo" />
            <span className="app-header__title">Sea Logistics</span>
          </button>

          <nav className="app-header__nav" aria-label="Navegação principal">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`app-header__link ${activeItem === item.id ? "active" : ""}`}
                  onClick={() => handleNavigate(item.path)}
                >
                  <Icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="app-header__actions">
            {canCreateShipment() && activeItem !== "novo-envio" && (
              <button
                type="button"
                className="app-header__cta"
                onClick={() => handleNavigate("/novo-envio")}
              >
                <Plus size={18} />
                <span className="app-header__cta-text">{translations.novoEnvio}</span>
              </button>
            )}
            {isAdmin() && (
              <span className="app-header__role-badge">Admin</span>
            )}
            <button
              type="button"
              className={`app-header__user ${activeItem === "perfil" ? "active" : ""}`}
              onClick={() => handleNavigate("/perfil")}
              title={currentUser?.email || translations.profile}
              aria-label={translations.profile}
            >
              <span className="app-header__user-name">
                {currentUser?.displayName?.split(" ")[0] || "Usuário"}
              </span>
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <div className="app-header__backdrop" onClick={() => setMobileOpen(false)} />
          <nav className="app-header__mobile" aria-label="Menu mobile">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`app-header__mobile-link ${activeItem === item.id ? "active" : ""}`}
                  onClick={() => handleNavigate(item.path)}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
            {canCreateShipment() && activeItem !== "novo-envio" && (
              <button
                type="button"
                className="app-header__mobile-cta"
                onClick={() => handleNavigate("/novo-envio")}
              >
                <Plus size={20} />
                <span>{translations.novoEnvio}</span>
              </button>
            )}
          </nav>
        </>
      )}
    </>
  );
};

export default Navbar;
