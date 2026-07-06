"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import type { InputHTMLAttributes } from "react";
import "./password-input.css";

interface PasswordInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  hasError?: boolean;
  wrapperClassName?: string;
}

export function PasswordInput({
  className = "",
  wrapperClassName = "",
  hasError = false,
  disabled,
  style,
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div
      className={[
        "password-input-wrap",
        hasError ? "password-input-wrap--error" : "",
        wrapperClassName,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <input
        {...props}
        type={visible ? "text" : "password"}
        disabled={disabled}
        style={style}
        className={["password-input-field", className].filter(Boolean).join(" ")}
      />
      <button
        type="button"
        className="password-input-toggle"
        onClick={() => setVisible((current) => !current)}
        disabled={disabled}
        aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
        tabIndex={-1}
      >
        {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
      </button>
    </div>
  );
}
