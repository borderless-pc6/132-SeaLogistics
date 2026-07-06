"use client";
import LanguageSwitcher from "../../components/language-switcher/language-switcher";
import LoginForm from "../../components/login-form/login-form";
import "./login-page.css";

export const LoginPage = () => {
  return (
    <div className="login-shell">
      <header className="login-lang-corner">
        <LanguageSwitcher />
      </header>
      <main className="login-container">
        <div className="login-content">
          <div className="login-card">
            <LoginForm />
          </div>
        </div>
      </main>
    </div>
  );
};
