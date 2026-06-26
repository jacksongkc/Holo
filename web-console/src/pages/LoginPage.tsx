import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { DatabaseBackup, Lock, User, AlertCircle, Shield, ArrowLeft } from "lucide-react";
import { api } from "../services/api";
import { setAuthToken, setAuthUser } from "../utils/session";

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [twoFactorRequired, setTwoFactorRequired] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    
    if (!username.trim() || !password.trim()) {
      setError(t("login.errors.emptyFields"));
      return;
    }

    if (twoFactorRequired && !twoFactorCode.trim()) {
      setError(t("login.errors.emptyTwoFactorCode"));
      return;
    }

    if (twoFactorRequired && !/^\d{6}$/.test(twoFactorCode.trim())) {
      setError(t("login.errors.invalidTwoFactorCode"));
      return;
    }

    setLoading(true);
    
    try {
      const requestBody: { username: string; password: string; twoFactorCode?: string } = {
        username: username.trim(),
        password: password.trim(),
      };
      
      if (twoFactorRequired) {
        requestBody.twoFactorCode = twoFactorCode.trim();
      }

      const response = await api.auth.login(requestBody);
      
      if (response.twoFactorRequired) {
        setTwoFactorRequired(true);
        setLoading(false);
        return;
      }
      
      setAuthToken(response.userId);
      setAuthUser({ 
        username: response.username, 
        role: response.role, 
        userId: response.userId,
        twoFactorEnabled: response.twoFactorEnabled,
      });
      navigate("/");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message || t("login.errors.invalidCredentials"));
      } else {
        setError(t("login.errors.invalidCredentials"));
      }
    } finally {
      setLoading(false);
    }
  }

  function handleBackToPassword() {
    setTwoFactorRequired(false);
    setTwoFactorCode("");
    setError("");
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-brand">
            <div className="brand-icon">
              <DatabaseBackup size={24} />
            </div>
            <div className="brand-text">
              <h1>{t("app.title")}</h1>
              <p className="brand-subtitle">{t("login.subtitle")}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {twoFactorRequired ? (
            <>
              <div className="two-factor-header">
                <button
                  type="button"
                  className="back-button"
                  onClick={handleBackToPassword}
                  disabled={loading}
                >
                  <ArrowLeft size={16} />
                  <span>{t("login.back")}</span>
                </button>
                <div className="two-factor-icon">
                  <Shield size={32} />
                </div>
                <h2 className="two-factor-title">{t("login.twoFactorTitle")}</h2>
                <p className="two-factor-description">{t("login.twoFactorDescription")}</p>
              </div>

              <div className="form-group">
                <label htmlFor="twoFactorCode" className="form-label">
                  <Shield size={14} />
                  <span>{t("login.twoFactorCode")}</span>
                </label>
                <input
                  type="text"
                  id="twoFactorCode"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder={t("login.twoFactorCodePlaceholder")}
                  disabled={loading}
                  className="form-input two-factor-input"
                  maxLength={6}
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
            </>
          ) : (
            <>
              <div className="form-group">
                <label htmlFor="username" className="form-label">
                  <User size={14} />
                  <span>{t("login.username")}</span>
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={t("login.usernamePlaceholder")}
                  disabled={loading}
                  className="form-input"
                  autoComplete="username"
                />
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  <Lock size={14} />
                  <span>{t("login.password")}</span>
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder")}
                  disabled={loading}
                  className="form-input"
                  autoComplete="current-password"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="login-button"
          >
            {loading ? (
              <div className="spinner" />
            ) : (
              twoFactorRequired ? t("login.verify") : t("login.submit")
            )}
          </button>
        </form>

        {!twoFactorRequired && (
          <div className="login-footer">
            <p className="demo-hint">
              <span className="hint-label">{t("login.demoLabel")}</span>
              <span className="hint-value">admin / admin</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
