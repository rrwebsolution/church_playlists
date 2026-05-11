import { useCallback, useEffect, useState } from 'react';
import type { DragEvent, FormEvent } from 'react';
import { Check, GripVertical, Pencil, Plus, Save, ShieldCheck, Trash2, UserCog, X } from 'lucide-react';
import Swal from 'sweetalert2';
import axiosInstance from '../../plugin/axios';

const PERMISSION_OPTIONS = [
  { id: 'users.manage', label: 'Manage Users' },
  { id: 'roles.manage', label: 'Manage Roles' },
  { id: 'playlists.view', label: 'View Playlists' },
  { id: 'playlists.manage', label: 'Manage Playlists' },
  { id: 'presentations.view', label: 'View Presentations' },
  { id: 'presentations.manage', label: 'Manage Presentations' },
  { id: 'offerings.manage', label: 'Manage Offerings' },
  { id: 'announcements.manage', label: 'Manage Announcements' },
  { id: 'settings.manage', label: 'Manage Settings' },
];

const formatRole = (role: string) =>
  role
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export default function RoleManagement() {
  const [roles, setRoles] = useState<string[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({});
  const [newRoleName, setNewRoleName] = useState('');
  const [editingRole, setEditingRole] = useState('');
  const [editingRoleName, setEditingRoleName] = useState('');
  const [draggedRole, setDraggedRole] = useState('');
  const [dragOverRole, setDragOverRole] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);
  const [deletingRole, setDeletingRole] = useState('');
  const [error, setError] = useState('');
  const [roleError, setRoleError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchRolePermissions = useCallback(async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await axiosInstance.get('auth/role-permissions');
      const nextRoles = response.data.roles || [];
      const nextPermissions = response.data.permissions || {};

      setRoles(nextRoles);
      setRolePermissions(
        nextRoles.reduce((acc: Record<string, string[]>, role: string) => {
          acc[role] = nextPermissions[role] || [];
          return acc;
        }, {}),
      );
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to load role permissions.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRolePermissions();
  }, [fetchRolePermissions]);

  const togglePermission = (targetRole: string, permission: string) => {
    setSuccess('');
    setRolePermissions((current) => {
      const currentPermissions = current[targetRole] || [];
      const nextPermissions = currentPermissions.includes(permission)
        ? currentPermissions.filter((item) => item !== permission)
        : [...currentPermissions, permission];

      return {
        ...current,
        [targetRole]: nextPermissions,
      };
    });
  };

  const handleAddRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRoleError('');
    setError('');
    setSuccess('');

    if (!newRoleName.trim()) {
      setRoleError('Please enter a role name.');
      return;
    }

    setIsCreatingRole(true);

    try {
      const response = await axiosInstance.post('auth/roles', {
        name: newRoleName.trim(),
      });

      const createdRole = response.data.role;
      setRoles((current) => (current.includes(createdRole) ? current : [...current, createdRole]));
      setRolePermissions((current) => ({
        ...current,
        [createdRole]: response.data.permissions || [],
      }));
      setNewRoleName('');
      setSuccess('Role added successfully.');
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const firstKey = errors ? Object.keys(errors)[0] : null;
      setRoleError(firstKey ? errors[firstKey]?.[0] : err?.response?.data?.message || 'Unable to add role.');
    } finally {
      setIsCreatingRole(false);
    }
  };

  const handleSavePermissions = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await axiosInstance.put('auth/role-permissions', {
        permissions: rolePermissions,
      });
      setRoles(response.data.roles || roles);
      setRolePermissions(response.data.permissions);
      setSuccess('Role permissions updated successfully.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Unable to save role permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRole = async (role: string) => {
    const result = await Swal.fire({
      title: `Delete ${formatRole(role)} role?`,
      text: 'This role will be removed from role management.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#71717a',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    setDeletingRole(role);
    setRoleError('');
    setError('');
    setSuccess('');

    try {
      await axiosInstance.delete(`auth/roles/${encodeURIComponent(role)}`);
      setRoles((current) => current.filter((item) => item !== role));
      setRolePermissions((current) => {
        const next = { ...current };
        delete next[role];
        return next;
      });
      setSuccess('Role deleted successfully.');
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const firstKey = errors ? Object.keys(errors)[0] : null;
      setRoleError(firstKey ? errors[firstKey]?.[0] : err?.response?.data?.message || 'Unable to delete role.');
    } finally {
      setDeletingRole('');
    }
  };

  const startEditRole = (role: string) => {
    setRoleError('');
    setSuccess('');
    setEditingRole(role);
    setEditingRoleName(formatRole(role));
  };

  const cancelEditRole = () => {
    setEditingRole('');
    setEditingRoleName('');
  };

  const handleUpdateRole = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!editingRole) return;

    setRoleError('');
    setError('');
    setSuccess('');

    if (!editingRoleName.trim()) {
      setRoleError('Please enter a role name.');
      return;
    }

    setIsUpdatingRole(true);

    try {
      const response = await axiosInstance.put(`auth/roles/${encodeURIComponent(editingRole)}`, {
        name: editingRoleName.trim(),
      });
      const updatedRole = response.data.role;

      setRoles(response.data.roles || roles.map((role) => (role === editingRole ? updatedRole : role)));
      setRolePermissions((current) => {
        const next = { ...current };
        next[updatedRole] = next[editingRole] || response.data.permissions || [];
        if (updatedRole !== editingRole) delete next[editingRole];
        return next;
      });
      cancelEditRole();
      setSuccess('Role updated successfully.');
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const firstKey = errors ? Object.keys(errors)[0] : null;
      setRoleError(firstKey ? errors[firstKey]?.[0] : err?.response?.data?.message || 'Unable to update role.');
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const moveRole = (sourceRole: string, targetRole: string) => {
    if (!sourceRole || !targetRole || sourceRole === targetRole) return;

    setRoles((current) => {
      const sourceIndex = current.indexOf(sourceRole);
      const targetIndex = current.indexOf(targetRole);

      if (sourceIndex === -1 || targetIndex === -1) return current;

      const next = [...current];
      const [removedRole] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, removedRole);
      return next;
    });
  };

  const handleRoleDragStart = (role: string) => {
    setDraggedRole(role);
  };

  const handleRoleDragOver = (event: DragEvent<HTMLDivElement>, role: string) => {
    event.preventDefault();
    setDragOverRole(role);
  };

  const handleRoleDrop = (role: string) => {
    moveRole(draggedRole, role);
    setDraggedRole('');
    setDragOverRole('');
  };

  const handleRoleDragEnd = () => {
    setDraggedRole('');
    setDragOverRole('');
  };

  return (
    <div className="mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="mb-8 flex flex-col gap-2 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          <ShieldCheck className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          Role Management
        </h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Choose what each role can access in the management system.
        </p>
      </div>

      <section className="mb-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800/50 dark:bg-zinc-900/40 md:p-8">
        <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Roles
            </h2>
            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Add roles that can be assigned to registered users.
            </p>
          </div>

          <form onSubmit={handleAddRole} className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[360px] sm:flex-row">
            <input
              type="text"
              value={newRoleName}
              onChange={(event) => setNewRoleName(event.target.value)}
              placeholder="e.g. Treasurer"
              className="min-h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
            />
            <button
              type="submit"
              disabled={isCreatingRole}
              className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreatingRole ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {isCreatingRole ? 'Adding...' : 'Add Role'}
            </button>
          </form>
        </div>

        {roleError && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {roleError}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading && roles.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60">
              Loading roles...
            </div>
          ) : roles.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm font-semibold text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950/60">
              No roles found.
            </div>
          ) : (
            roles.map((role) => (
              <div
                key={role}
                draggable={editingRole !== role}
                onDragStart={() => handleRoleDragStart(role)}
                onDragOver={(event) => handleRoleDragOver(event, role)}
                onDrop={() => handleRoleDrop(role)}
                onDragEnd={handleRoleDragEnd}
                className={`rounded-2xl border bg-zinc-50 p-4 transition-all dark:bg-zinc-950/60 ${
                  dragOverRole === role && draggedRole !== role
                    ? 'border-indigo-400 ring-2 ring-indigo-500/20 dark:border-indigo-500'
                    : 'border-zinc-200 dark:border-zinc-800'
                } ${draggedRole === role ? 'opacity-60' : ''}`}
              >
                {editingRole === role ? (
                  <form onSubmit={handleUpdateRole} className="space-y-3">
                    <input
                      type="text"
                      value={editingRoleName}
                      onChange={(event) => setEditingRoleName(event.target.value)}
                      className="min-h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEditRole}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-all hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <button
                        type="submit"
                        disabled={isUpdatingRole}
                        className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isUpdatingRole ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-start gap-2">
                      <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-zinc-400 active:cursor-grabbing dark:text-zinc-500" />
                      <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4 shrink-0 text-indigo-500" />
                        <h3 className="truncate text-sm font-black text-zinc-900 dark:text-zinc-100">{formatRole(role)}</h3>
                      </div>
                      <p className="mt-1 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                        {rolePermissions[role]?.length || 0} permissions
                      </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startEditRole(role)}
                        title={`Edit ${formatRole(role)}`}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 bg-white text-zinc-500 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRole(role)}
                        disabled={deletingRole === role}
                        title={`Delete ${formatRole(role)}`}
                        className="grid h-9 w-9 place-items-center rounded-xl border border-red-100 bg-white text-red-500 transition-all hover:border-red-200 hover:bg-red-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-500/20 dark:bg-zinc-900 dark:text-red-300 dark:hover:bg-red-500/10"
                      >
                        {deletingRole === role ? (
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-red-300/30 border-t-red-500" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800/50 dark:bg-zinc-900/40 md:p-8">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Permissions Per Role
            </h2>
            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Tick the permissions allowed for each account role.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSavePermissions}
            disabled={isSaving || isLoading}
            className="flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-zinc-800 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white"
          >
            {isSaving ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white dark:border-zinc-950/30 dark:border-t-zinc-950" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
            {success}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 dark:bg-zinc-950/60 dark:text-zinc-500">
                <tr>
                  <th className="sticky left-0 z-10 min-w-[240px] bg-zinc-50 px-5 py-4 dark:bg-zinc-950">
                    Permission
                  </th>
                  {roles.map((role) => (
                    <th key={role} className="min-w-[150px] px-5 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <UserCog className="h-3.5 w-3.5 text-indigo-500" />
                        {formatRole(role)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {isLoading && roles.length === 0 ? (
                  <tr>
                    <td colSpan={Math.max(roles.length + 1, 2)} className="px-5 py-10 text-center text-sm font-semibold text-zinc-500">
                      Loading permissions...
                    </td>
                  </tr>
                ) : roles.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-5 py-10 text-center text-sm font-semibold text-zinc-500">
                      Add a role first to manage permissions.
                    </td>
                  </tr>
                ) : (
                  PERMISSION_OPTIONS.map((permission) => (
                    <tr key={permission.id} className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                      <td className="sticky left-0 z-10 bg-white px-5 py-4 dark:bg-zinc-900">
                        <div>
                          <p className="text-sm font-black text-zinc-900 dark:text-zinc-100">{permission.label}</p>
                          <p className="mt-0.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{permission.id}</p>
                        </div>
                      </td>
                      {roles.map((role) => {
                        const isChecked = rolePermissions[role]?.includes(permission.id);

                        return (
                          <td key={`${role}-${permission.id}`} className="px-5 py-4 text-center">
                            <button
                              type="button"
                              onClick={() => togglePermission(role, permission.id)}
                              title={`${isChecked ? 'Remove' : 'Allow'} ${permission.label} for ${formatRole(role)}`}
                              className={`mx-auto grid h-9 w-9 place-items-center rounded-xl border transition-all active:scale-95 ${
                                isChecked
                                  ? 'border-indigo-500 bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                  : 'border-zinc-200 bg-white text-transparent hover:border-indigo-300 hover:text-indigo-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-indigo-500/60'
                              }`}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
