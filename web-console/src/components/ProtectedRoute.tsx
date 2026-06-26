import { Navigate, useLocation } from "react-router-dom";
import { getAuthUser, isLoggedIn } from "../utils/session";
import { canAccessRoute } from "../utils/permissions";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();

  if (!isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const user = getAuthUser();
  const role = user?.role as "admin" | "operator" | "viewer" || "viewer";

  if (!canAccessRoute(role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}