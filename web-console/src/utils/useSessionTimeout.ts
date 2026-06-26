import { useEffect, useRef, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logout, isLoggedIn, getAuthUser } from "./session";
import { api } from "../services/api";

const LAST_ACTIVITY_KEY = "holo.lastActivity";
const DEFAULT_TIMEOUT_MINUTES = 120;
const WARNING_BEFORE_SECONDS = 60;

export function useSessionTimeout() {
  const navigate = useNavigate();
  const intervalRef = useRef<number | null>(null);
  const timeoutMsRef = useRef<number>(DEFAULT_TIMEOUT_MINUTES * 60 * 1000);
  const [showWarning, setShowWarning] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(WARNING_BEFORE_SECONDS);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const doLogout = useCallback(() => {
    clearTimer();
    logout();
    navigate("/login", { state: { from: "timeout" } });
  }, [clearTimer, navigate]);

  const updateLastActivity = useCallback(() => {
    if (!isLoggedIn()) return;
    localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    setShowWarning(false);
  }, []);

  const checkTimeout = useCallback(() => {
    if (!isLoggedIn()) {
      clearTimer();
      return;
    }

    const lastActivityStr = localStorage.getItem(LAST_ACTIVITY_KEY);
    const lastActivity = lastActivityStr ? parseInt(lastActivityStr, 10) : Date.now();
    const elapsed = Date.now() - lastActivity;
    const timeoutMs = timeoutMsRef.current;
    const warningMs = Math.max(timeoutMs - WARNING_BEFORE_SECONDS * 1000, 0);
    const remaining = Math.max(Math.ceil((timeoutMs - elapsed) / 1000), 0);

    setRemainingSeconds(remaining);

    if (elapsed >= warningMs) {
      setShowWarning(true);
    }

    if (elapsed >= timeoutMs) {
      doLogout();
    }
  }, [clearTimer, doLogout]);

  const startTimer = useCallback(() => {
    clearTimer();
    if (!isLoggedIn()) return;
    if (timeoutMsRef.current <= 0) return;

    checkTimeout();
    intervalRef.current = window.setInterval(checkTimeout, 1000) as unknown as number;
  }, [clearTimer, checkTimeout]);

  useEffect(() => {
    if (!isLoggedIn()) {
      clearTimer();
      setShowWarning(false);
      return;
    }

    const user = getAuthUser();
    if (!user) {
      clearTimer();
      return;
    }

    updateLastActivity();

    let mounted = true;

    const loadSettings = async () => {
      try {
        const settings = await api.ops.getSettings();
        if (!mounted) return;
        const minutes = settings.security.sessionTimeout || DEFAULT_TIMEOUT_MINUTES;
        timeoutMsRef.current = minutes * 60 * 1000;
      } catch {
        if (!mounted) return;
        timeoutMsRef.current = DEFAULT_TIMEOUT_MINUTES * 60 * 1000;
      } finally {
        if (mounted) {
          startTimer();
        }
      }
    };

    loadSettings();

    const handleActivity = () => {
      updateLastActivity();
    };

    const events = ["mousedown", "keydown", "mousemove", "scroll", "touchstart", "click"];
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    const handleStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) {
        const lastActivity = e.newValue ? parseInt(e.newValue, 10) : 0;
        const elapsed = Date.now() - lastActivity;
        if (elapsed < WARNING_BEFORE_SECONDS * 1000) {
          setShowWarning(false);
        }
      }
    };
    window.addEventListener("storage", handleStorage);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkTimeout();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      clearTimer();
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity);
      });
      window.removeEventListener("storage", handleStorage);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [clearTimer, startTimer, updateLastActivity, checkTimeout]);

  const extendSession = useCallback(() => {
    updateLastActivity();
  }, [updateLastActivity]);

  return { showWarning, remainingSeconds, extendSession, handleLogout: doLogout };
}
