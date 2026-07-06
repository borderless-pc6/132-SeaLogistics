"use client";
import LanguageSwitcher from "../../components/language-switcher/language-switcher";
import RegisterSplit from "../../components/register-split/register-split";
import "./register-page.css";

export const RegisterPage = () => {
  return (
    <div className="login-shell">
      <header className="login-lang-corner">
        <LanguageSwitcher />
      </header>
      <main className="login-container">
        <div className="login-content">
          <RegisterSplit />
        </div>
      </main>
    </div>
  );
};
