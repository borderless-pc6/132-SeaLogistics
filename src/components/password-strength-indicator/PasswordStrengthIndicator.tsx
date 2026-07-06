import React from "react";
import { useLanguage } from "../../context/language-context";
import {
  calculatePasswordStrength,
  getPasswordStrengthLevel,
  getPasswordTips,
} from "../../schemas/passwordSchema";
import "./password-strength-indicator.css";

interface PasswordStrengthIndicatorProps {
  password: string;
  showTips?: boolean;
}

const STRENGTH_LABEL_KEYS = {
  weak: "passwordStrengthWeak",
  medium: "passwordStrengthMedium",
  strong: "passwordStrengthStrong",
  "very-strong": "passwordStrengthVeryStrong",
} as const;

export const PasswordStrengthIndicator: React.FC<
  PasswordStrengthIndicatorProps
> = ({ password, showTips = true }) => {
  const { translations } = useLanguage();

  if (!password) return null;

  const strength = calculatePasswordStrength(password);
  const { level, color } = getPasswordStrengthLevel(strength);
  const labelKey = STRENGTH_LABEL_KEYS[level];
  const phrase = translations[labelKey];
  const tips = getPasswordTips(password);

  return (
    <div className="password-strength-indicator">
      <div className="strength-bar-container">
        <div
          className="strength-bar"
          style={{
            width: `${strength}%`,
            backgroundColor: color,
          }}
        />
      </div>
      <div className="strength-label" style={{ color }}>
        {phrase}
      </div>
      {showTips && tips.length > 0 && (
        <div className="password-tips">
          <p className="tips-title">Para melhorar sua senha:</p>
          <ul>
            {tips.map((tip, index) => (
              <li key={index}>{tip}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
