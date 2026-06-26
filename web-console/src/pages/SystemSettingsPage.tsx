import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Settings, Server, Shield, FileText, Save, RotateCcw } from "lucide-react";
import { useToast } from "../components/Toast";
import { api, SystemSettings as SystemSettingsType } from "../services/api";

type TabKey = "general" | "server" | "security" | "audit";

interface GeneralSettings {
  systemName: string;
  timezone: string;
  dateFormat: string;
  defaultLanguage: string;
}

interface ServerSettings {
  port: number;
  maxUploadSize: number;
  logLevel: string;
  enableDebug: boolean;
}

interface SecuritySettings {
  maxLoginAttempts: number;
  lockoutDuration: number;
  sessionTimeout: number;
  enableTwoFactor: boolean;
  enableIPWhitelist: boolean;
  ipWhitelist: string[];
}

interface AuditSettings {
  enableAudit: boolean;
  auditRetentionDays: number;
  enableLoginAudit: boolean;
  enableActionAudit: boolean;
}

const defaultGeneralSettings: GeneralSettings = {
  systemName: "Holo-VTL",
  timezone: "Asia/Shanghai",
  dateFormat: "YYYY-MM-DD HH:mm:ss",
  defaultLanguage: "zh-CN",
};

const defaultServerSettings: ServerSettings = {
  port: 80,
  maxUploadSize: 500,
  logLevel: "info",
  enableDebug: false,
};

const defaultSecuritySettings: SecuritySettings = {
  maxLoginAttempts: 3,
  lockoutDuration: 15,
  sessionTimeout: 120,
  enableTwoFactor: false,
  enableIPWhitelist: false,
  ipWhitelist: [],
};

const defaultAuditSettings: AuditSettings = {
  enableAudit: true,
  auditRetentionDays: 90,
  enableLoginAudit: true,
  enableActionAudit: true,
};

export function SystemSettingsPage() {
  const { t } = useTranslation();
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<TabKey>("general");
  const [saving, setSaving] = useState(false);

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>(defaultGeneralSettings);
  const [serverSettings, setServerSettings] = useState<ServerSettings>(defaultServerSettings);
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(defaultSecuritySettings);
  const [auditSettings, setAuditSettings] = useState<AuditSettings>(defaultAuditSettings);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    try {
      const settings = await api.ops.getSettings();
      setGeneralSettings(settings.general);
      setServerSettings(settings.server);
      setSecuritySettings({
        ...settings.security,
        ipWhitelist: settings.security.ipWhitelist || [],
      });
      setAuditSettings(settings.audit);
    } catch (err) {
      push(t("systemSettings.loadFailed"), "error");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const settings: SystemSettingsType = {
        general: generalSettings,
        server: serverSettings,
        security: securitySettings,
        audit: auditSettings,
      };
      await api.ops.saveSettings(settings);
      push(t("systemSettings.saveSuccess"), "success");
    } catch (err) {
      push(t("systemSettings.saveFailed"), "error");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setGeneralSettings(defaultGeneralSettings);
    setServerSettings(defaultServerSettings);
    setSecuritySettings(defaultSecuritySettings);
    setAuditSettings(defaultAuditSettings);
    push(t("systemSettings.resetSuccess"), "info");
  }

  const tabs = [
    { key: "general" as TabKey, label: t("systemSettings.general"), icon: Settings },
    { key: "server" as TabKey, label: t("systemSettings.server"), icon: Server },
    { key: "security" as TabKey, label: t("systemSettings.security"), icon: Shield },
    { key: "audit" as TabKey, label: t("systemSettings.audit"), icon: FileText },
  ];

  function InputField({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
  }: {
    label: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: string;
    placeholder?: string;
  }) {
    return (
      <div className="settings-form-group">
        <label className="settings-form-label">{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="settings-form-input"
          placeholder={placeholder}
        />
      </div>
    );
  }

  function SelectField({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: { value: string; label: string }[];
  }) {
    return (
      <div className="settings-form-group">
        <label className="settings-form-label">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="settings-form-select"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  function SwitchField({
    label,
    value,
    onChange,
    description,
  }: {
    label: string;
    value: boolean;
    onChange: (value: boolean) => void;
    description?: string;
  }) {
    return (
      <div className="settings-form-group settings-form-group-switch">
        <div>
          <label className="settings-form-label">{label}</label>
          {description && <span className="settings-form-description">{description}</span>}
        </div>
        <button
          type="button"
          className={`settings-form-switch ${value ? "settings-form-switch-on" : ""}`}
          onClick={() => onChange(!value)}
        >
          <span className="settings-form-switch-thumb" />
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>{t("systemSettings.title")}</h1>
        <div className="page-header-actions">
          <button className="btn btn-secondary" type="button" onClick={handleReset}>
            <RotateCcw size={14} />
            {t("systemSettings.reset")}
          </button>
          <button className="btn btn-primary" type="button" onClick={handleSave} disabled={saving}>
            <Save size={14} />
            {saving ? t("systemSettings.saving") : t("systemSettings.save")}
          </button>
        </div>
      </div>

      <div className="settings-container">
        <nav className="settings-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                type="button"
                className={`settings-tab-item ${activeTab === tab.key ? "settings-tab-item-active" : ""}`}
                onClick={() => setActiveTab(tab.key)}
              >
                <Icon size={16} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="settings-content">
          {activeTab === "general" && (
            <div className="settings-panel">
              <h2>{t("systemSettings.general")}</h2>
              <div className="settings-form">
                <InputField
                  label={t("systemSettings.systemName")}
                  value={generalSettings.systemName}
                  onChange={(v) => setGeneralSettings({ ...generalSettings, systemName: v })}
                  placeholder="Holo-VTL"
                />
                <SelectField
                  label={t("systemSettings.timezone")}
                  value={generalSettings.timezone}
                  onChange={(v) => setGeneralSettings({ ...generalSettings, timezone: v })}
                  options={[
                    { value: "Asia/Shanghai", label: "Asia/Shanghai (UTC+8)" },
                    { value: "Asia/Tokyo", label: "Asia/Tokyo (UTC+9)" },
                    { value: "Europe/London", label: "Europe/London (UTC+0)" },
                    { value: "America/New_York", label: "America/New_York (UTC-5)" },
                    { value: "UTC", label: "UTC" },
                  ]}
                />
                <SelectField
                  label={t("systemSettings.dateFormat")}
                  value={generalSettings.dateFormat}
                  onChange={(v) => setGeneralSettings({ ...generalSettings, dateFormat: v })}
                  options={[
                    { value: "YYYY-MM-DD HH:mm:ss", label: "YYYY-MM-DD HH:mm:ss" },
                    { value: "MM/DD/YYYY HH:mm:ss", label: "MM/DD/YYYY HH:mm:ss" },
                    { value: "DD/MM/YYYY HH:mm:ss", label: "DD/MM/YYYY HH:mm:ss" },
                  ]}
                />
                <SelectField
                  label={t("systemSettings.defaultLanguage")}
                  value={generalSettings.defaultLanguage}
                  onChange={(v) => setGeneralSettings({ ...generalSettings, defaultLanguage: v })}
                  options={[
                    { value: "zh-CN", label: "中文" },
                    { value: "en-US", label: "English" },
                  ]}
                />
              </div>
            </div>
          )}

          {activeTab === "server" && (
            <div className="settings-panel">
              <h2>{t("systemSettings.server")}</h2>
              <div className="settings-form">
                <InputField
                  label={t("systemSettings.port")}
                  value={serverSettings.port}
                  onChange={(v) => setServerSettings({ ...serverSettings, port: parseInt(v) || 80 })}
                  type="number"
                  placeholder="80"
                />
                <InputField
                  label={t("systemSettings.maxUploadSize")}
                  value={serverSettings.maxUploadSize}
                  onChange={(v) => setServerSettings({ ...serverSettings, maxUploadSize: parseInt(v) || 500 })}
                  type="number"
                  placeholder="500"
                />
                <span className="settings-form-description">{t("systemSettings.maxUploadSizeDesc")}</span>
                <SelectField
                  label={t("systemSettings.logLevel")}
                  value={serverSettings.logLevel}
                  onChange={(v) => setServerSettings({ ...serverSettings, logLevel: v })}
                  options={[
                    { value: "debug", label: "Debug" },
                    { value: "info", label: "Info" },
                    { value: "warn", label: "Warn" },
                    { value: "error", label: "Error" },
                  ]}
                />
                <SwitchField
                  label={t("systemSettings.enableDebug")}
                  value={serverSettings.enableDebug}
                  onChange={(v) => setServerSettings({ ...serverSettings, enableDebug: v })}
                  description={t("systemSettings.enableDebugDesc")}
                />
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="settings-panel">
              <h2>{t("systemSettings.security")}</h2>
              <div className="settings-form">
                <InputField
                  label={t("systemSettings.maxLoginAttempts")}
                  value={securitySettings.maxLoginAttempts}
                  onChange={(v) => setSecuritySettings({ ...securitySettings, maxLoginAttempts: parseInt(v) || 3 })}
                  type="number"
                  placeholder="3"
                />
                <span className="settings-form-description">{t("systemSettings.maxLoginAttemptsDesc")}</span>
                <InputField
                  label={t("systemSettings.lockoutDuration")}
                  value={securitySettings.lockoutDuration}
                  onChange={(v) => setSecuritySettings({ ...securitySettings, lockoutDuration: parseInt(v) || 15 })}
                  type="number"
                  placeholder="15"
                />
                <span className="settings-form-description">{t("systemSettings.lockoutDurationDesc")}</span>
                <InputField
                  label={t("systemSettings.sessionTimeout")}
                  value={securitySettings.sessionTimeout}
                  onChange={(v) => setSecuritySettings({ ...securitySettings, sessionTimeout: parseInt(v) || 120 })}
                  type="number"
                  placeholder="120"
                />
                <span className="settings-form-description">{t("systemSettings.sessionTimeoutDesc")}</span>
                <SwitchField
                  label={t("systemSettings.enableTwoFactor")}
                  value={securitySettings.enableTwoFactor}
                  onChange={(v) => setSecuritySettings({ ...securitySettings, enableTwoFactor: v })}
                  description={t("systemSettings.enableTwoFactorDesc")}
                />
                <SwitchField
                  label={t("systemSettings.enableIPWhitelist")}
                  value={securitySettings.enableIPWhitelist}
                  onChange={(v) => setSecuritySettings({ ...securitySettings, enableIPWhitelist: v })}
                  description={t("systemSettings.enableIPWhitelistDesc")}
                />
                {securitySettings.enableIPWhitelist && (
                  <div className="settings-form-group">
                    <label className="settings-form-label">{t("systemSettings.ipWhitelist")}</label>
                    <span className="settings-form-description">{t("systemSettings.ipWhitelistDesc")}</span>
                    <div className="ip-whitelist-container">
                      {securitySettings.ipWhitelist.map((ip, index) => (
                        <div key={index} className="ip-whitelist-item">
                          <span className="ip-whitelist-text">{ip}</span>
                          <button 
                            className="btn btn-sm btn-danger" 
                            onClick={() => setSecuritySettings({ 
                              ...securitySettings, 
                              ipWhitelist: securitySettings.ipWhitelist.filter((_, i) => i !== index) 
                            })}
                          >
                            {t("common.remove")}
                          </button>
                        </div>
                      ))}
                      <div className="ip-whitelist-add">
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder={t("systemSettings.ipWhitelistPlaceholder")}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const newIP = e.currentTarget.value.trim();
                              if (newIP && !securitySettings.ipWhitelist.includes(newIP)) {
                                setSecuritySettings({ 
                                  ...securitySettings, 
                                  ipWhitelist: [...securitySettings.ipWhitelist, newIP] 
                                });
                                e.currentTarget.value = "";
                              }
                            }
                          }}
                        />
                        <button 
                          className="btn btn-sm" 
                          onClick={(e) => {
                            const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                            const newIP = input.value.trim();
                            if (newIP && !securitySettings.ipWhitelist.includes(newIP)) {
                              setSecuritySettings({ 
                                ...securitySettings, 
                                ipWhitelist: [...securitySettings.ipWhitelist, newIP] 
                              });
                              input.value = "";
                            }
                          }}
                        >
                          {t("common.add")}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "audit" && (
            <div className="settings-panel">
              <h2>{t("systemSettings.audit")}</h2>
              <div className="settings-form">
                <SwitchField
                  label={t("systemSettings.enableAudit")}
                  value={auditSettings.enableAudit}
                  onChange={(v) => setAuditSettings({ ...auditSettings, enableAudit: v })}
                  description={t("systemSettings.enableAuditDesc")}
                />
                <InputField
                  label={t("systemSettings.auditRetentionDays")}
                  value={auditSettings.auditRetentionDays}
                  onChange={(v) => setAuditSettings({ ...auditSettings, auditRetentionDays: parseInt(v) || 90 })}
                  type="number"
                  placeholder="90"
                />
                <span className="settings-form-description">{t("systemSettings.auditRetentionDaysDesc")}</span>
                <SwitchField
                  label={t("systemSettings.enableLoginAudit")}
                  value={auditSettings.enableLoginAudit}
                  onChange={(v) => setAuditSettings({ ...auditSettings, enableLoginAudit: v })}
                  description={t("systemSettings.enableLoginAuditDesc")}
                />
                <SwitchField
                  label={t("systemSettings.enableActionAudit")}
                  value={auditSettings.enableActionAudit}
                  onChange={(v) => setAuditSettings({ ...auditSettings, enableActionAudit: v })}
                  description={t("systemSettings.enableActionAuditDesc")}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}