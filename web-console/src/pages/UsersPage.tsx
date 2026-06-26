import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  User,
  Shield,
  ShieldAlert,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { api, type User as UserType } from "../services/api";

function RoleBadge({ role }: { role: UserType["role"] }) {
  const { t } = useTranslation();
  const roleConfig = {
    admin: { label: t("users.roles.admin"), icon: Shield, className: "role-admin" },
    operator: { label: t("users.roles.operator"), icon: ShieldAlert, className: "role-operator" },
    viewer: { label: t("users.roles.viewer"), icon: User, className: "role-viewer" },
  };
  const config = roleConfig[role];
  const Icon = config.icon;
  return (
    <span className={`role-badge ${config.className}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}

function StatusBadge({ status }: { status: UserType["status"] }) {
  const { t } = useTranslation();
  const statusConfig = {
    active: { label: t("users.status.active"), className: "status-active" },
    disabled: { label: t("users.status.disabled"), className: "status-disabled" },
  };
  const config = statusConfig[status];
  return (
    <span className={`status-badge ${config.className}`}>
      {status === "active" ? <Check size={12} /> : <X size={12} />}
      {config.label}
    </span>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

interface EditFormData {
  username: string;
  email: string;
  password: string;
  role: UserType["role"];
  status: UserType["status"];
}

interface AddFormData {
  username: string;
  email: string;
  password: string;
  role: UserType["role"];
}

export function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editFormData, setEditFormData] = useState<EditFormData>({
    username: "",
    email: "",
    password: "",
    role: "viewer",
    status: "active",
  });
  const [addFormData, setAddFormData] = useState<AddFormData>({
    username: "",
    email: "",
    password: "",
    role: "viewer",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    setLoading(true);
    try {
      const result = await api.users.list();
      setUsers(result);
    } catch (err) {
      console.error("Failed to load users:", err);
      setError(t("users.loadError"));
    } finally {
      setLoading(false);
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  async function handleDeleteUser() {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await api.users.delete(selectedUser.userId);
      setUsers((prev) => prev.filter((u) => u.userId !== selectedUser.userId));
    } catch (err) {
      console.error("Failed to delete user:", err);
      setError(t("users.deleteError"));
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
      setSelectedUser(null);
    }
  }

  function handleOpenEdit(user: UserType) {
    setEditingUser(user);
    setEditFormData({
      username: user.username,
      email: user.email || "",
      password: "",
      role: user.role,
      status: user.status,
    });
    setShowEditModal(true);
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setLoading(true);

    const updateBody: Record<string, unknown> = {
      username: editFormData.username,
      email: editFormData.email || undefined,
      role: editFormData.role,
      status: editFormData.status,
    };

    if (editFormData.password) {
      updateBody.password = editFormData.password;
    }

    try {
      const updatedUser = await api.users.update(editingUser.userId, updateBody);
      setUsers((prev) =>
        prev.map((u) => (u.userId === editingUser.userId ? updatedUser : u))
      );
    } catch (err) {
      console.error("Failed to update user:", err);
      setError(t("users.updateError"));
    } finally {
      setLoading(false);
      setShowEditModal(false);
      setEditingUser(null);
    }
  }

  async function handleSaveAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const newUser = await api.users.create({
        username: addFormData.username,
        email: addFormData.email || undefined,
        password: addFormData.password,
        role: addFormData.role,
      });
      setUsers((prev) => [newUser, ...prev]);
      setAddFormData({ username: "", email: "", password: "", role: "viewer" });
    } catch (err) {
      console.error("Failed to create user:", err);
      setError(t("users.createError"));
    } finally {
      setLoading(false);
      setShowAddModal(false);
    }
  }

  function handleOpenDeleteConfirm(user: UserType) {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  }

  return (
    <section className="users-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{t("users.title")}</h1>
          <p className="page-subtitle">{t("users.subtitle")}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          disabled={loading}
        >
          <Plus size={14} />
          {t("users.addUser")}
        </button>
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle size={14} />
          <span>{error}</span>
        </div>
      )}

      <div className="panel">
        <div className="panel-header">
          <div className="search-box">
            <Search size={14} />
            <input
              type="text"
              placeholder={t("users.searchPlaceholder")}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <span>{t("users.loading")}</span>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t("users.username")}</th>
                  <th>{t("users.email")}</th>
                  <th>{t("users.role")}</th>
                  <th>{t("users.status.label")}</th>
                  <th>{t("users.createdAt")}</th>
                  <th>{t("users.lastLogin")}</th>
                  <th className="actions-column">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      <User size={32} />
                      <span>{t("users.noUsers")}</span>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.userId}>
                      <td>
                        <div className="user-cell">
                          <div className="user-avatar">
                            <User size={16} />
                          </div>
                          <span>{user.username}</span>
                        </div>
                      </td>
                      <td>{user.email || "-"}</td>
                      <td>
                        <RoleBadge role={user.role} />
                      </td>
                      <td>
                        <StatusBadge status={user.status} />
                      </td>
                      <td>{formatDate(user.createdAt)}</td>
                      <td>{formatDate(user.lastLoginAt)}</td>
                      <td>
                        <div className="actions-menu">
                          <button
                            className="icon-btn"
                            onClick={() => handleOpenEdit(user)}
                            title={t("common.edit")}
                            disabled={loading}
                          >
                            <Edit size={14} />
                          </button>
                          <button
                            className="icon-btn"
                            onClick={() => handleOpenDeleteConfirm(user)}
                            title={t("common.delete")}
                            disabled={loading}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("users.addUser")}</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSaveAdd}>
              <div className="form-group">
                <label>{t("users.username")}</label>
                <input
                  type="text"
                  placeholder={t("users.usernamePlaceholder")}
                  value={addFormData.username}
                  onChange={(e) =>
                    setAddFormData((prev) => ({ ...prev, username: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>{t("users.email")}</label>
                <input
                  type="email"
                  placeholder={t("users.emailPlaceholder")}
                  value={addFormData.email}
                  onChange={(e) =>
                    setAddFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label>{t("users.password")}</label>
                <input
                  type="password"
                  placeholder={t("users.passwordPlaceholder")}
                  value={addFormData.password}
                  onChange={(e) =>
                    setAddFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>{t("users.role")}</label>
                <select
                  value={addFormData.role}
                  onChange={(e) =>
                    setAddFormData((prev) => ({
                      ...prev,
                      role: e.target.value as AddFormData["role"],
                    }))
                  }
                >
                  <option value="admin">{t("users.roles.admin")}</option>
                  <option value="operator">{t("users.roles.operator")}</option>
                  <option value="viewer">{t("users.roles.viewer")}</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {t("users.createUser")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingUser && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t("users.editUser")}</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}>
                <X size={16} />
              </button>
            </div>
            <form className="modal-form" onSubmit={handleSaveEdit}>
              <div className="form-group">
                <label>{t("users.username")}</label>
                <input
                  type="text"
                  value={editFormData.username}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, username: e.target.value }))
                  }
                  required
                />
              </div>
              <div className="form-group">
                <label>{t("users.email")}</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div className="form-group">
                <label>{t("users.password")}</label>
                <input
                  type="password"
                  placeholder={t("users.passwordEditPlaceholder")}
                  value={editFormData.password}
                  onChange={(e) =>
                    setEditFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                />
                <small className="form-hint">{t("users.passwordEditHint")}</small>
              </div>
              <div className="form-group">
                <label>{t("users.role")}</label>
                <select
                  value={editFormData.role}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      role: e.target.value as EditFormData["role"],
                    }))
                  }
                >
                  <option value="admin">{t("users.roles.admin")}</option>
                  <option value="operator">{t("users.roles.operator")}</option>
                  <option value="viewer">{t("users.roles.viewer")}</option>
                </select>
              </div>
              <div className="form-group">
                <label>{t("users.status.label")}</label>
                <select
                  value={editFormData.status}
                  onChange={(e) =>
                    setEditFormData((prev) => ({
                      ...prev,
                      status: e.target.value as EditFormData["status"],
                    }))
                  }
                >
                  <option value="active">{t("users.status.active")}</option>
                  <option value="disabled">{t("users.status.disabled")}</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                  {t("common.cancel")}
                </button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {t("common.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteConfirm && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="confirm-icon">
              <AlertCircle size={48} />
            </div>
            <h2>{t("users.deleteConfirmTitle")}</h2>
            <p>{t("users.deleteConfirmMessage", { username: selectedUser.username })}</p>
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                {t("common.cancel")}
              </button>
              <button type="button" className="btn btn-danger" onClick={handleDeleteUser} disabled={loading}>
                {t("common.delete")}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}