import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Check, ChevronDown, KeyRound, Mail, Pencil, RefreshCw, Save, Search, ShieldCheck, User, UserCog, UserPlus, X } from 'lucide-react';
import axiosInstance from '../../plugin/axios';

type UserAccount = {
  id: number;
  name: string;
  username?: string | null;
  email: string;
  role?: string | null;
  avatar?: string | null;
  google_id?: string | null;
  created_at?: string | null;
};

const formatRole = (role: string) =>
  role
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const getRoleBadgeClass = (role?: string | null) => {
  if (role === 'admin') return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300';
  if (role === 'viewer') return 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';
  if (role === 'staff') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300';
  return 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300';
};

export default function Users() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [roleSearch, setRoleSearch] = useState('');
  const [isRolePickerOpen, setIsRolePickerOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 5;
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editingUserForm, setEditingUserForm] = useState({
    name: '',
    username: '',
    email: '',
    role: 'staff',
  });
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [isLoadingRoles, setIsLoadingRoles] = useState(false);
  const [rolesError, setRolesError] = useState('');
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [usersError, setUsersError] = useState('');
  const filteredRoles = roles.filter((roleOption) =>
    formatRole(roleOption).toLowerCase().includes(roleSearch.toLowerCase())
    || roleOption.toLowerCase().includes(roleSearch.toLowerCase()),
  );
  const filteredUsers = users.filter((account) => {
    const query = userSearchQuery.trim().toLowerCase();
    if (!query) return true;

    return [
      account.name,
      account.email,
      account.username || '',
      account.role || '',
      account.google_id ? 'google' : 'local',
    ].some((value) => value.toLowerCase().includes(query));
  });
  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage));
  const paginatedUsers = filteredUsers.slice((currentPage - 1) * usersPerPage, currentPage * usersPerPage);

  const getErrorMessage = (err: any) => {
    const errors = err?.response?.data?.errors;
    if (errors) {
      const firstKey = Object.keys(errors)[0];
      return errors[firstKey]?.[0] || 'Unable to create user account.';
    }

    return err?.response?.data?.message || 'Unable to create user account.';
  };

  const fetchUsers = useCallback(async () => {
    setIsLoadingUsers(true);
    setUsersError('');

    try {
      const response = await axiosInstance.get('auth/users');
      setUsers(response.data.users || []);
    } catch (err: any) {
      setUsersError(err?.response?.data?.message || 'Unable to load users.');
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    setIsLoadingRoles(true);
    setRolesError('');

    try {
      const response = await axiosInstance.get('auth/roles');
      const nextRoles = response.data.roles || [];
      setRoles(nextRoles);
      setRole((currentRole) => {
        if (nextRoles.includes(currentRole)) return currentRole;
        if (nextRoles.includes('staff')) return 'staff';
        return nextRoles[0] || 'staff';
      });
    } catch (err: any) {
      setRolesError(err?.response?.data?.message || 'Unable to load roles.');
    } finally {
      setIsLoadingRoles(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, [fetchRoles, fetchUsers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [userSearchQuery]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please complete the required fields.');
      return;
    }

    if (password !== passwordConfirm) {
      setError('Password confirmation does not match.');
      return;
    }

    setIsCreating(true);

    try {
      await axiosInstance.post('auth/register', {
        name: name.trim(),
        username: username.trim() || null,
        email: email.trim(),
        role,
        password,
        password_confirmation: passwordConfirm,
      });

      setSuccess('User account created successfully.');
      setName('');
      setUsername('');
      setEmail('');
      setRole(roles.includes('staff') ? 'staff' : roles[0] || 'staff');
      setPassword('');
      setPasswordConfirm('');
      fetchUsers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsCreating(false);
    }
  };

  const startEditUserRole = (account: UserAccount) => {
    setUsersError('');
    setEditingUserId(account.id);
    setEditingUserForm({
      name: account.name,
      username: account.username || '',
      email: account.email,
      role: account.role || (roles.includes('staff') ? 'staff' : roles[0] || 'staff'),
    });
  };

  const cancelEditUserRole = () => {
    setEditingUserId(null);
    setEditingUserForm({
      name: '',
      username: '',
      email: '',
      role: roles.includes('staff') ? 'staff' : roles[0] || 'staff',
    });
  };

  const handleSaveUser = async (account: UserAccount) => {
    if (!editingUserForm.name.trim() || !editingUserForm.email.trim()) {
      setUsersError('Name and email are required.');
      return;
    }

    setSavingUserId(account.id);
    setUsersError('');

    try {
      const response = await axiosInstance.put(`auth/users/${account.id}`, {
        name: editingUserForm.name.trim(),
        username: editingUserForm.username.trim() || null,
        email: editingUserForm.email.trim(),
        role: editingUserForm.role,
      });
      const updatedUser = response.data.user;
      setUsers((currentUsers) => currentUsers.map((item) => (
        item.id === account.id ? { ...item, ...updatedUser } : item
      )));
      cancelEditUserRole();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const firstKey = errors ? Object.keys(errors)[0] : null;
      setUsersError(firstKey ? errors[firstKey]?.[0] : err?.response?.data?.message || 'Unable to update user.');
    } finally {
      setSavingUserId(null);
    }
  };

  return (
    <div className="mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="mb-8 flex flex-col gap-2 border-b border-zinc-200 pb-6 dark:border-zinc-800">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          <UserPlus className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          User Management
        </h1>
        <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
          Manage users, roles, and permissions for the system.
        </p>
      </div>

      <section id="users" className="scroll-mt-6 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800/50 dark:bg-zinc-900/40 md:p-8">
        <div className="mb-6">
          <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
            User Registration
          </h2>
          <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
            New users can sign in with their email or username after the account is created.
          </p>
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

        {rolesError && (
          <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            {rolesError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2">
            <span className="ml-1 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Full Name</span>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950">
              <User className="h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Media Operator"
                className="w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="ml-1 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Username</span>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950">
              <UserPlus className="h-4 w-4 text-zinc-400" />
              <input
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="optional"
                className="w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="ml-1 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Email Address</span>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950">
              <Mail className="h-4 w-4 text-zinc-400" />
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="operator@jamc.church"
                className="w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="ml-1 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Role</span>
            <div
              className="relative"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setIsRolePickerOpen(false);
                  setRoleSearch('');
                }
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setIsRolePickerOpen((current) => !current);
                  setRoleSearch('');
                }}
                disabled={isLoadingRoles || roles.length === 0}
                className="flex w-full items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <UserCog className="h-4 w-4 text-zinc-400" />
                <span className="flex-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {roles.length === 0 ? (isLoadingRoles ? 'Loading roles...' : 'No roles available') : formatRole(role)}
                </span>
                <ChevronDown className={`h-4 w-4 text-zinc-400 transition-transform ${isRolePickerOpen ? 'rotate-180' : ''}`} />
              </button>

              {isRolePickerOpen && (
                <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl shadow-zinc-900/10 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="flex items-center gap-3 border-b border-zinc-100 px-4 py-3 dark:border-zinc-800">
                    <Search className="h-4 w-4 text-zinc-400" />
                    <input
                      type="text"
                      value={roleSearch}
                      onChange={(event) => setRoleSearch(event.target.value)}
                      placeholder="Search role..."
                      autoFocus
                      className="w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
                    />
                  </div>

                  <div className="max-h-56 overflow-y-auto p-2">
                    {filteredRoles.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm font-semibold text-zinc-500">
                        No roles found.
                      </div>
                    ) : (
                      filteredRoles.map((roleOption) => {
                        const isSelected = roleOption === role;

                        return (
                          <button
                            type="button"
                            key={roleOption}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setRole(roleOption);
                              setRoleSearch('');
                              setIsRolePickerOpen(false);
                            }}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                              isSelected
                                ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                                : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-900'
                            }`}
                          >
                            <span>{formatRole(roleOption)}</span>
                            {isSelected && <Check className="h-4 w-4" />}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>
          </label>

          <label className="space-y-2">
            <span className="ml-1 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Password</span>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950">
              <KeyRound className="h-4 w-4 text-zinc-400" />
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="minimum 8 characters"
                className="w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>
          </label>

          <label className="space-y-2">
            <span className="ml-1 text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Confirm Password</span>
            <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950">
              <KeyRound className="h-4 w-4 text-zinc-400" />
              <input
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                placeholder="repeat password"
                className="w-full bg-transparent text-sm font-semibold text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100"
              />
            </div>
          </label>

          <div className="flex justify-end md:col-span-2">
            <button
              type="submit"
              disabled={isCreating}
              className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isCreating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {isCreating ? 'Creating...' : 'Add User'}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800/50 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-3 border-b border-zinc-200 p-6 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
              Registered Users
            </h2>
            <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
              View accounts that can access the management system.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(event) => setUserSearchQuery(event.target.value)}
                placeholder="Search users..."
                className="min-h-10 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-9 pr-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 sm:w-64"
              />
            </div>
            <button
              type="button"
              onClick={fetchUsers}
              disabled={isLoadingUsers}
              className="flex items-center justify-center gap-2 rounded-xl border border-zinc-200 px-4 py-2.5 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-50 active:scale-95 disabled:opacity-60 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingUsers ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {usersError && (
          <div className="m-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {usersError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left">
            <thead className="bg-zinc-50 text-[10px] font-black uppercase tracking-[0.18em] text-zinc-400 dark:bg-zinc-950/60 dark:text-zinc-500">
              <tr>
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Provider</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoadingUsers && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-zinc-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-sm font-semibold text-zinc-500">
                    {userSearchQuery ? 'No matching users found.' : 'No users found.'}
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((account) => (
                  <tr key={account.id} className="transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-600 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-300">
                          {account.avatar ? (
                            <img src={account.avatar} alt={account.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        {editingUserId === account.id ? (
                          <div className="grid min-w-60 gap-2">
                            <input
                              type="text"
                              value={editingUserForm.name}
                              onChange={(event) => setEditingUserForm((current) => ({ ...current, name: event.target.value }))}
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              placeholder="Full name"
                            />
                            <input
                              type="email"
                              value={editingUserForm.email}
                              onChange={(event) => setEditingUserForm((current) => ({ ...current, email: event.target.value }))}
                              className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                              placeholder="Email address"
                            />
                          </div>
                        ) : (
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-zinc-900 dark:text-zinc-100">{account.name}</p>
                            <p className="truncate text-xs font-semibold text-zinc-500 dark:text-zinc-400">{account.email}</p>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-zinc-600 dark:text-zinc-300">
                      {editingUserId === account.id ? (
                        <input
                          type="text"
                          value={editingUserForm.username}
                          onChange={(event) => setEditingUserForm((current) => ({ ...current, username: event.target.value }))}
                          className="w-40 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-900 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                          placeholder="optional"
                        />
                      ) : (
                        account.username || '-'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingUserId === account.id ? (
                        <select
                          value={editingUserForm.role}
                          onChange={(event) => setEditingUserForm((current) => ({ ...current, role: event.target.value }))}
                          className="min-w-36 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold text-zinc-700 outline-none focus:border-indigo-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200"
                        >
                          {roles.map((roleOption) => (
                            <option key={roleOption} value={roleOption}>
                              {formatRole(roleOption)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${getRoleBadgeClass(account.role)}`}>
                          <UserCog className="h-3.5 w-3.5" />
                          {formatRole(account.role || 'staff')}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-wider ${
                        account.google_id
                          ? 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300'
                          : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'
                      }`}>
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {account.google_id ? 'Google' : 'Local'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-zinc-500 dark:text-zinc-400">
                      {account.created_at ? new Date(account.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {editingUserId === account.id ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveUser(account)}
                              disabled={savingUserId === account.id}
                              className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white transition-all hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                              title="Save user"
                            >
                              {savingUserId === account.id ? (
                                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditUserRole}
                              className="grid h-9 w-9 place-items-center rounded-xl border border-zinc-200 text-zinc-500 transition-all hover:bg-zinc-50 active:scale-95 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditUserRole(account)}
                            className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600 transition-all hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-600 active:scale-95 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-300"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-zinc-200 px-6 py-4 dark:border-zinc-800 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400">
            Showing {filteredUsers.length === 0 ? 0 : ((currentPage - 1) * usersPerPage) + 1}
            {' - '}
            {Math.min(currentPage * usersPerPage, filteredUsers.length)}
            {' of '}
            {filteredUsers.length} users
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Previous
            </button>
            <span className="rounded-xl bg-zinc-100 px-3 py-2 text-xs font-black text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
              {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-zinc-200 px-4 py-2 text-xs font-bold text-zinc-600 transition-all hover:bg-zinc-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
