package domain

type SystemSettings struct {
	General  GeneralSettings  `json:"general"`
	Server   ServerSettings   `json:"server"`
	Security SecuritySettings `json:"security"`
	Audit    AuditSettings    `json:"audit"`
}

type GeneralSettings struct {
	SystemName      string `json:"systemName"`
	Timezone        string `json:"timezone"`
	DateFormat      string `json:"dateFormat"`
	DefaultLanguage string `json:"defaultLanguage"`
}

type ServerSettings struct {
	Port           int    `json:"port"`
	MaxUploadSize  int    `json:"maxUploadSize"`
	LogLevel       string `json:"logLevel"`
	EnableDebug    bool   `json:"enableDebug"`
}

type SecuritySettings struct {
	MaxLoginAttempts  int      `json:"maxLoginAttempts"`
	LockoutDuration   int      `json:"lockoutDuration"`
	SessionTimeout    int      `json:"sessionTimeout"`
	EnableTwoFactor   bool     `json:"enableTwoFactor"`
	EnableIPWhitelist bool     `json:"enableIPWhitelist"`
	IPWhitelist       []string `json:"ipWhitelist"`
}

type AuditSettings struct {
	EnableAudit        bool `json:"enableAudit"`
	AuditRetentionDays int  `json:"auditRetentionDays"`
	EnableLoginAudit   bool `json:"enableLoginAudit"`
	EnableActionAudit  bool `json:"enableActionAudit"`
}

func DefaultSystemSettings() SystemSettings {
	return SystemSettings{
		General: GeneralSettings{
			SystemName:      "Holo-VTL",
			Timezone:        "Asia/Shanghai",
			DateFormat:      "YYYY-MM-DD HH:mm:ss",
			DefaultLanguage: "zh-CN",
		},
		Server: ServerSettings{
			Port:          80,
			MaxUploadSize: 500,
			LogLevel:      "info",
			EnableDebug:   false,
		},
		Security: SecuritySettings{
			MaxLoginAttempts:  3,
			LockoutDuration:   15,
			SessionTimeout:    120,
			EnableTwoFactor:   false,
			EnableIPWhitelist: false,
			IPWhitelist:       []string{},
		},
		Audit: AuditSettings{
			EnableAudit:        true,
			AuditRetentionDays: 90,
			EnableLoginAudit:   true,
			EnableActionAudit:  true,
		},
	}
}
