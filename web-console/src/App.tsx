import { Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppShell } from "./components/AppShell";
import { DashboardPage } from "./pages/DashboardPage";
import { StoragePage } from "./pages/StoragePage";
import { ResourcesPage } from "./pages/ResourcesPage";
import { ResourceManagePage } from "./pages/ResourceManagePage";
import { TargetsPage } from "./pages/TargetsPage";
import { UsersPage } from "./pages/UsersPage";
import { AboutPage } from "./pages/AboutPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SystemSettingsPage } from "./pages/SystemSettingsPage";
import { AuditPage } from "./pages/AuditPage";
import { LoginPage } from "./pages/LoginPage";
import { isLoggedIn } from "./utils/session";

export function App() {
  return (
    <Routes>
      <Route path="/login" element={
        isLoggedIn() ? <Navigate to="/" replace /> : <LoginPage />
      } />
      
      <Route path="/" element={
        <ProtectedRoute>
          <AppShell />
        </ProtectedRoute>
      }>
        <Route index element={<DashboardPage />} />
        <Route path="storage" element={<StoragePage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="resources/:libraryId/manage" element={<ResourceManagePage />} />
        <Route path="targets" element={<TargetsPage />} />
        <Route path="users" element={<UsersPage />} />
        <Route path="system-settings" element={<SystemSettingsPage />} />
        <Route path="audit" element={<AuditPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}