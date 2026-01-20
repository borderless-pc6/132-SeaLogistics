import React from 'react';
import {
  calculatePasswordStrength,
  getPasswordStrengthLevel,
  getPasswordTips,
} from '../../schemas/passwordSchema';
import './password-strength-indicator.css';

interface PasswordStrengthIndicatorProps {
  password: string;
  showTips?: boolean;
}

export const PasswordStrengthIndicator: React.FC<
  PasswordStrengthIndicatorProps
> = ({ password, showTips = true }) => {
  if (!password) return null;

  const strength = calculatePasswordStrength(password);
  const { label, color } = getPasswordStrengthLevel(strength);
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
        Força: {label} ({strength}%)
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
