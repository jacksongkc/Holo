import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../app/ThemeContext";
import { resolveNavigatorLocale, setNavigatorLocale, type LocaleCode } from "../i18n";
import {
  User,
  Mail,
  Shield,
  Lock,
  Globe,
  Palette,
  Save,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  QrCode,
  Copy,
  Trash2,
} from "lucide-react";
import QRCode from "qrcode";
import { getAuthUser } from "../utils/session";
import { api, type User as UserType } from "../services/api";

type ThemeMode = "light" | "dark" | "auto";

interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  enabled: boolean;
  issuer: string;
  accountName: string;
}

export function SettingsPage() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [currentLocale, setCurrentLocale] = useState<LocaleCode>(resolveNavigatorLocale());
  const [themeMode, setThemeMode] = useState<ThemeMode>(theme === "dark" ? "dark" : "light");
  
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | "">("");
  const [loading, setLoading] = useState(false);
  const [userInfo, setUserInfo] = useState<UserType | null>(null);
  
  const [twoFactorSetup, setTwoFactorSetup] = useState<TwoFactorSetup | null>(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [showTwoFactorSetup, setShowTwoFactorSetup] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  const sessionUser = getAuthUser();

  useEffect(() => {
    async function fetchUserInfo() {
      try {
        const user = await api.users.me();
        setUserInfo(user);
      } catch (err) {
        console.error("Failed to fetch user info:", err);
      }
    }
    fetchUserInfo();
  }, []);

  useEffect(() => {
    async function fetchTwoFactorStatus() {
      try {
        const setup = await api.users.twoFactor.getSetup();
        setTwoFactorSetup(setup);
      } catch (err) {
        console.error("Failed to fetch two factor status:", err);
      }
    }
    fetchTwoFactorStatus();
  }, []);

  useEffect(() => {
    async function generateQRCode() {
      if (twoFactorSetup?.secret && twoFactorSetup?.issuer && twoFactorSetup?.accountName) {
        try {
          const otpUrl = `otpauth://totp/${encodeURIComponent(twoFactorSetup.issuer)}:${encodeURIComponent(twoFactorSetup.accountName)}?secret=${encodeURIComponent(twoFactorSetup.secret)}&issuer=${encodeURIComponent(twoFactorSetup.issuer)}`;
          const dataUrl = await QRCode.toDataURL(otpUrl, {
            width: 200,
            margin: 1,
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          });
          setQrCodeDataUrl(dataUrl);
        } catch (err) {
          console.error("Failed to generate QR code:", err);
        }
      }
    }
    generateQRCode();
  }, [twoFactorSetup?.secret, twoFactorSetup?.issuer, twoFactorSetup?.accountName]);

  async function handleSave() {
    setMessage("");
    setMessageType("");

    if (newPassword) {
      if (!oldPassword) {
        setMessage(t("settings.errors.oldPasswordRequired"));
        setMessageType("error");
        return;
      }
      if (newPassword !== confirmPassword) {
        setMessage(t("settings.errors.passwordMismatch"));
        setMessageType("error");
        return;
      }
      if (newPassword.length < 6) {
        setMessage(t("settings.errors.passwordTooShort"));
        setMessageType("error");
        return;
      }

      setLoading(true);
      try {
        const userId = sessionUser?.userId || sessionUser?.username || "";
        if (!userId) {
          throw new Error("User not found");
        }
        await api.users.changePassword(userId, { oldPassword, newPassword });
        setMessage(t("settings.messages.passwordChanged"));
        setMessageType("success");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : t("settings.errors.updateFailed");
        if (errorMsg.includes("old password is incorrect") || errorMsg.includes("incorrect")) {
          setMessage(t("settings.errors.oldPasswordIncorrect"));
        } else {
          setMessage(errorMsg);
        }
        setMessageType("error");
      } finally {
        setLoading(false);
      }
    }

    if (themeMode !== theme) {
      if (themeMode === "dark") {
        setTheme("dark");
      } else {
        setTheme("light");
      }
    }

    if (currentLocale !== resolveNavigatorLocale()) {
      setNavigatorLocale(currentLocale);
      window.location.reload();
    }
  }

  async function handleEnableTwoFactor() {
    if (!twoFactorSetup || !/^\d{6}$/.test(twoFactorCode)) {
      return;
    }

    setTwoFactorLoading(true);
    try {
      await api.users.twoFactor.enable({ secret: twoFactorSetup.secret, code: twoFactorCode });
      setTwoFactorSetup({ ...twoFactorSetup, enabled: true });
      setShowTwoFactorSetup(false);
      setTwoFactorCode("");
      setMessage(t("settings.twoFactor.enabled"));
      setMessageType("success");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t("settings.errors.twoFactorEnableFailed");
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function handleDisableTwoFactor() {
    if (!confirm(t("settings.twoFactor.disableConfirm"))) {
      return;
    }

    setTwoFactorLoading(true);
    try {
      await api.users.twoFactor.disable();
      setTwoFactorSetup(prev => prev ? { ...prev, enabled: false } : null);
      setMessage(t("settings.twoFactor.disabled"));
      setMessageType("success");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t("settings.errors.twoFactorDisableFailed");
      setMessage(errorMsg);
      setMessageType("error");
    } finally {
      setTwoFactorLoading(false);
    }
  }

  async function handleGenerateNewSecret() {
    setTwoFactorLoading(true);
    try {
      const setup = await api.users.twoFactor.getSetup();
      setTwoFactorSetup(setup);
      setTwoFactorCode("");
    } catch (err) {
      console.error("Failed to generate new secret:", err);
    } finally {
      setTwoFactorLoading(false);
    }
  }

  function handleCopySecret() {
    if (twoFactorSetup?.secret) {
      navigator.clipboard.writeText(twoFactorSetup.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  }

  const roleLabels: Record<string, string> = {
    admin: t("users.roles.admin"),
    operator: t("users.roles.operator"),
    viewer: t("users.roles.viewer"),
  };

  return (
    <div className="page-content">
      <div className="page-header">
        <h1>{t("settings.title")}</h1>
        <p className="page-description">{t("settings.description")}</p>
      </div>

      <div className="settings-container">
        <div className="settings-section">
          <div className="section-header">
            <User size={18} />
            <h2>{t("settings.profile")}</h2>
          </div>
          <div className="settings-card">
            <div className="profile-info">
              <div className="info-item">
                <label>
                  <User size={14} />
                  <span>{t("settings.username")}</span>
                </label>
                <span className="info-value">{userInfo?.username || sessionUser?.username || "admin"}</span>
              </div>
              <div className="info-item">
                <label>
                  <Mail size={14} />
                  <span>{t("settings.email")}</span>
                </label>
                <span className="info-value">{userInfo?.email || t("settings.noEmail")}</span>
              </div>
              <div className="info-item">
                <label>
                  <Shield size={14} />
                  <span>{t("settings.role")}</span>
                </label>
                <span className="info-value">{roleLabels[userInfo?.role || sessionUser?.role || "viewer"]}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-header">
            <Lock size={18} />
            <h2>{t("settings.changePassword")}</h2>
          </div>
          <div className="settings-card">
            <div className="form-group">
              <label htmlFor="oldPassword" className="form-label">
                <Lock size={14} />
                <span>{t("settings.oldPassword")}</span>
              </label>
              <input
                type="password"
                id="oldPassword"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder={t("settings.oldPasswordPlaceholder")}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="newPassword" className="form-label">
                <Lock size={14} />
                <span>{t("settings.newPassword")}</span>
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={t("settings.newPasswordPlaceholder")}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                <Lock size={14} />
                <span>{t("settings.confirmPassword")}</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("settings.confirmPasswordPlaceholder")}
                className="form-input"
              />
            </div>
            <p className="form-hint">{t("settings.passwordHint")}</p>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-header">
            <Smartphone size={18} />
            <h2>{t("settings.twoFactor.title")}</h2>
          </div>
          <div className="settings-card">
            {twoFactorSetup?.enabled ? (
              <div className="two-factor-status">
                <div className="two-factor-status-enabled">
                  <CheckCircle2 size={32} className="status-icon success" />
                  <div>
                    <h3 className="status-title">{t("settings.twoFactor.enabledStatus")}</h3>
                    <p className="status-desc">{t("settings.twoFactor.enabledDesc")}</p>
                  </div>
                </div>
                <button
                  className="btn btn-danger"
                  onClick={handleDisableTwoFactor}
                  disabled={twoFactorLoading}
                >
                  <Trash2 size={14} />
                  <span>{t("settings.twoFactor.disable")}</span>
                </button>
              </div>
            ) : showTwoFactorSetup ? (
              <div className="two-factor-setup">
                <div className="setup-step">
                  <h3 className="step-title">{t("settings.twoFactor.step1")}</h3>
                  <p className="step-desc">{t("settings.twoFactor.step1Desc")}</p>
                </div>

                <div className="setup-step">
                  <h3 className="step-title">{t("settings.twoFactor.step2")}</h3>
                  <div className="qr-code-container">
                    {qrCodeDataUrl ? (
                      <img
                        src={qrCodeDataUrl}
                        alt="QR Code"
                        className="qr-code"
                      />
                    ) : (
                      <div className="qr-code-placeholder">
                        <QrCode size={48} />
                      </div>
                    )}
                  </div>
                  <div className="secret-key">
                    <span className="secret-label">{t("settings.twoFactor.secretKey")}:</span>
                    <code className="secret-value">{twoFactorSetup?.secret}</code>
                    <button
                      type="button"
                      className="copy-btn"
                      onClick={handleCopySecret}
                      title={t("settings.twoFactor.copySecret")}
                    >
                      {copiedSecret ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={handleGenerateNewSecret}
                    disabled={twoFactorLoading}
                  >
                    {t("settings.twoFactor.generateNew")}
                  </button>
                </div>

                <div className="setup-step">
                  <h3 className="step-title">{t("settings.twoFactor.step3")}</h3>
                  <div className="form-group">
                    <label htmlFor="setupTwoFactorCode" className="form-label">
                      <Shield size={14} />
                      <span>{t("settings.twoFactor.verificationCode")}</span>
                    </label>
                    <input
                      type="text"
                      id="setupTwoFactorCode"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder={t("settings.twoFactor.verificationCodePlaceholder")}
                      className="form-input two-factor-input"
                      maxLength={6}
                    />
                  </div>
                </div>

                <div className="setup-actions">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowTwoFactorSetup(false)}
                    disabled={twoFactorLoading}
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleEnableTwoFactor}
                    disabled={twoFactorLoading || !/^\d{6}$/.test(twoFactorCode)}
                  >
                    {twoFactorLoading && <div className="spinner small" />}
                    <span>{t("settings.twoFactor.enable")}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="two-factor-status">
                <div className="two-factor-status-disabled">
                  <Shield size={32} className="status-icon muted" />
                  <div>
                    <h3 className="status-title">{t("settings.twoFactor.disabledStatus")}</h3>
                    <p className="status-desc">{t("settings.twoFactor.disabledDesc")}</p>
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowTwoFactorSetup(true)}
                >
                  <Smartphone size={14} />
                  <span>{t("settings.twoFactor.setup")}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="settings-section">
          <div className="section-header">
            <Globe size={18} />
            <h2>{t("settings.language")}</h2>
          </div>
          <div className="settings-card">
            <div className="form-group">
              <label htmlFor="language" className="form-label">
                <Globe size={14} />
                <span>{t("settings.languageSelect")}</span>
              </label>
              <select
                id="language"
                value={currentLocale}
                onChange={(e) => setCurrentLocale(e.target.value as LocaleCode)}
                className="form-select"
              >
                <option value="zh-CN">中文</option>
                <option value="en-US">English</option>
              </select>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="section-header">
            <Palette size={18} />
            <h2>{t("settings.theme")}</h2>
          </div>
          <div className="settings-card">
            <div className="form-group">
              <label className="form-label">
                <Palette size={14} />
                <span>{t("settings.themeSelect")}</span>
              </label>
              <div className="theme-options">
                <button
                  className={`theme-option ${themeMode === "light" ? "active" : ""}`}
                  onClick={() => setThemeMode("light")}
                >
                  <div className="theme-preview light-preview"></div>
                  <span>{t("settings.themeLight")}</span>
                </button>
                <button
                  className={`theme-option ${themeMode === "dark" ? "active" : ""}`}
                  onClick={() => setThemeMode("dark")}
                >
                  <div className="theme-preview dark-preview"></div>
                  <span>{t("settings.themeDark")}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {message && (
          <div className={`message message-${messageType}`}>
            {messageType === "success" ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{message}</span>
          </div>
        )}

        <div className="settings-actions">
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            <Save size={14} />
            <span>{t("settings.save")}</span>
            {loading && <div className="spinner small" />}
          </button>
        </div>
      </div>
    </div>
  );
}
