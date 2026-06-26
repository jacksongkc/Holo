import { useMemo, useState, useRef, useEffect } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useTheme } from "../app/ThemeContext";
import { resolveNavigatorLocale, type LocaleMode } from "../i18n";
import { LOCALE_MODE_STORAGE_KEY, logout, getAuthUser } from "../utils/session";
import { canAccessRoute } from "../utils/permissions";
import { useSessionTimeout } from "../utils/useSessionTimeout";
import {
  ActivitySquare,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  DatabaseBackup,
  Globe,
  HardDrive,
  Info,
  Languages,
  LetterText,
  LibraryBig,
  LogOut,
  Moon,
  Sun,
  Users,
  User,
  Settings,
  Book,
  RefreshCw,
  FileText,
} from "lucide-react";

type NavItem = {
  to: string;
  labelKey: string;
  icon: typeof ActivitySquare;
};

export function AppShell() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const { showWarning, remainingSeconds, extendSession, handleLogout: timeoutLogout } = useSessionTimeout();
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentUserName, setCurrentUserName] = useState<string>("admin");
  const [currentUserRole, setCurrentUserRole] = useState<string>("admin");
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [localeModeState, setLocaleMode] = useState<LocaleMode>(() => {
    if (typeof window === "undefined") {
      return "auto";
    }
    const localStore = window.localStorage as Storage | undefined;
    const saved =
      localStore && typeof localStore.getItem === "function"
        ? localStore.getItem(LOCALE_MODE_STORAGE_KEY)
        : null;
    if (saved === "auto" || saved === "zh-CN" || saved === "en-US") {
      return saved;
    }
    return "auto";
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const userInfo = getAuthUser();
    if (userInfo) {
      setCurrentUserName(userInfo.username);
      setCurrentUserRole(userInfo.role);
    }
  }, [userMenuOpen]);

  const role = getAuthUser()?.role as "admin" | "operator" | "viewer" || "viewer";

  const allItems: NavItem[] = [
    { to: "/", labelKey: "nav.dashboard", icon: ActivitySquare },
    { to: "/storage", labelKey: "nav.storage", icon: HardDrive },
    { to: "/resources", labelKey: "nav.resources", icon: LibraryBig },
    { to: "/targets", labelKey: "nav.targets", icon: DatabaseBackup },
    { to: "/users", labelKey: "nav.users", icon: Users },
    { to: "/system-settings", labelKey: "nav.systemSettings", icon: Settings },
    { to: "/audit", labelKey: "nav.audit", icon: FileText },
    { to: "/about", labelKey: "nav.about", icon: Info },
  ];

  const items = allItems.filter((item) => canAccessRoute(role, item.to));

  const currentPage = useMemo(() => {
    const active = items.find((item) => (item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to)));
    return active ? t(active.labelKey) : t("nav.dashboard");
  }, [items, location.pathname, t]);

  function nextLocaleMode(mode: LocaleMode): LocaleMode {
    if (mode === "auto") {
      return "en-US";
    }
    if (mode === "en-US") {
      return "zh-CN";
    }
    return "auto";
  }

  async function cycleLocaleMode() {
    const next = nextLocaleMode(localeModeState);
    setLocaleMode(next);
    if (typeof window !== "undefined") {
      const localStore = window.localStorage as Storage | undefined;
      if (localStore && typeof localStore.setItem === "function") {
        localStore.setItem(LOCALE_MODE_STORAGE_KEY, next);
      }
    }
    const resolved = next === "auto" ? resolveNavigatorLocale() : next;
    await i18n.changeLanguage(resolved);
  }

  const localeButtonTitle =
    localeModeState === "auto"
      ? t("common.localeAuto")
      : localeModeState === "en-US"
        ? t("locale.enUS")
        : t("locale.zhCN");
  const LocaleModeIcon = localeModeState === "auto" ? Globe : localeModeState === "en-US" ? LetterText : Languages;
  const productVersionStatus = import.meta.env.VITE_APP_VERSION || "v0.0.0";
  const buildLabel = t("common.buildLabel", { version: productVersionStatus.startsWith('v') ? productVersionStatus.toUpperCase() : `V${productVersionStatus.toUpperCase()}` });

  function handleLogout() {
    setUserMenuOpen(false);
    logout();
    navigate("/login");
  }

  return (
    <div className={sidebarExpanded ? "layout-root" : "layout-root layout-sidebar-collapsed"}>
      <aside className="layout-sidebar">
        <div className="sidebar-head">
          <div className="brand-box">
            <div className="brand-mark">
              <DatabaseBackup size={18} />
            </div>
            <div className="brand-meta">
              <div className="brand-title">{t("app.title")}</div>
            </div>
          </div>
        </div>

        <nav className="nav-stack">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "nav-link nav-link-active" : "nav-link")}
            >
              <item.icon size={16} />
              <span className="nav-label">{t(item.labelKey)}</span>
            </NavLink>
          ))}
        </nav>
        <button
          className="icon-btn sidebar-toggle"
          type="button"
          onClick={() => setSidebarExpanded((prev) => !prev)}
          aria-label={t("common.toggleSidebar")}
          title={t("common.toggleSidebar")}
        >
          {sidebarExpanded ? <ChevronLeft size={17} /> : <ChevronRight size={17} />}
        </button>
      </aside>

      <div className="layout-main">
        <header className="topbar">
          <div className="topbar-left">
            <h2 className="topbar-title">{currentPage}</h2>
          </div>

          <div className="topbar-actions">
            <NavLink className="version-pill version-link" to="/about" title={t("about.title")}>
              {buildLabel}
            </NavLink>
            <button className="icon-btn" onClick={toggleTheme} aria-label={theme === "dark" ? t("theme.light") : t("theme.dark")}>
              {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <button
              className="icon-btn locale-toggle-btn"
              onClick={() => void cycleLocaleMode()}
              title={localeButtonTitle}
              aria-label={localeButtonTitle}
            >
              <LocaleModeIcon size={16} />
            </button>

            <div className="user-menu-container" ref={userMenuRef}>
              <button
                className="user-menu-trigger"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-label={t("userMenu.title")}
                title={t("userMenu.title")}
              >
                <User size={16} />
                <span className="user-menu-trigger-name">{currentUserName}</span>
              </button>

              {userMenuOpen && (
                <div className="user-dropdown-menu">
                  <div className="user-dropdown-header">
                    <div className="user-avatar-large">
                      <User size={24} />
                    </div>
                    <div className="user-info">
                      <span className="user-name">{currentUserName}</span>
                      <span className="user-role">{t(`users.roles.${currentUserRole}`)}</span>
                    </div>
                  </div>

                  <div className="user-dropdown-divider"></div>

                  <button className="user-dropdown-item" onClick={() => { setUserMenuOpen(false); navigate("/settings"); }}>
                    <Settings size={14} />
                    <span>{t("userMenu.personalSettings")}</span>
                  </button>

                  <button className="user-dropdown-item" onClick={() => { setUserMenuOpen(false); window.open("https://github.com/jacksongkc/Holo", "_blank"); }}>
                    <Book size={14} />
                    <span>{t("userMenu.userManual")}</span>
                  </button>

                  <button className="user-dropdown-item" onClick={() => { setUserMenuOpen(false); navigate("/about"); }}>
                    <Info size={14} />
                    <span>{t("userMenu.about")}</span>
                  </button>

                  <div className="user-dropdown-divider"></div>

                  <button className="user-dropdown-item user-dropdown-item-danger" onClick={handleLogout}>
                    <LogOut size={14} />
                    <span>{t("userMenu.logout")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page-container">
          <Outlet />
        </main>
      </div>

      {showWarning && (
        <div className="session-timeout-overlay">
          <div className="session-timeout-dialog">
            <div className="session-timeout-icon">
              <AlertCircle size={48} />
            </div>
            <h3 className="session-timeout-title">{t("sessionTimeout.title")}</h3>
            <p className="session-timeout-message">{t("sessionTimeout.message")}</p>
            <div className="session-timeout-timer">
              <Clock size={20} />
              <span className="session-timeout-countdown">{remainingSeconds}s</span>
            </div>
            <div className="session-timeout-actions">
              <button className="btn btn-secondary" onClick={timeoutLogout}>
                <LogOut size={16} />
                {t("sessionTimeout.logout")}
              </button>
              <button className="btn btn-primary" onClick={extendSession}>
                <RefreshCw size={16} />
                {t("sessionTimeout.stayLoggedIn")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
