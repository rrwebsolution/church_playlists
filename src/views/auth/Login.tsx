import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { ChevronDown, Eye, EyeOff, Laptop, LockKeyhole, LogIn, Moon, Sun, UserRound, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import heroImage from '../../assets/hero.png';
import axiosInstance from '../../plugin/axios';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              width?: number;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

export default function Login() {
  const navigate = useNavigate();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  const saveAuthSession = useCallback((payload: any) => {
    localStorage.setItem('jamc_auth_token', payload.token);
    localStorage.setItem(
      'jamc_auth_user',
      JSON.stringify({
        ...payload.user,
        role: payload.user?.role || 'System Administrator',
      }),
    );
    navigate('/app/playlist', { replace: true });
  }, [navigate]);

  const getErrorMessage = (err: any) => {
    return err?.response?.data?.message
      || err?.response?.data?.errors?.login?.[0]
      || err?.response?.data?.errors?.credential?.[0]
      || 'Unable to sign in. Please try again.';
  };

  useEffect(() => {
    if (localStorage.getItem('jamc_auth_user')) {
      navigate('/app/playlist', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    const root = window.document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = theme === 'dark' || (theme === 'system' && prefersDark);

    root.classList.toggle('dark', shouldUseDark);
    localStorage.setItem('theme', theme);
    setIsThemeOpen(false);
  }, [theme]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeRef.current && !themeRef.current.contains(event.target as Node)) {
        setIsThemeOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleGoogleCredential = useCallback(async (credential?: string) => {
    if (!credential) {
      setError('Google sign-in did not return a credential.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await axiosInstance.post('auth/google', {
        credential,
        device_name: 'web',
      });
      saveAuthSession(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }, [saveAuthSession]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const renderGoogleButton = () => {
      if (!window.google || !googleButtonRef.current) return;

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => handleGoogleCredential(response.credential),
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        shape: 'pill',
        text: 'signin_with',
        width: googleButtonRef.current.offsetWidth || 360,
        locale: 'en_US',
      });
    };

    const existingScript = document.getElementById('google-identity-services');
    if (existingScript) {
      if (!existingScript.getAttribute('src')?.includes('hl=en_US')) {
        existingScript.remove();
      } else {
        renderGoogleButton();
        return;
      }
    }

    const currentScript = document.getElementById('google-identity-services');
    if (currentScript) {
      renderGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-identity-services';
    script.src = 'https://accounts.google.com/gsi/client?hl=en_US';
    script.async = true;
    script.defer = true;
    script.onload = renderGoogleButton;
    document.head.appendChild(script);
  }, [googleClientId, handleGoogleCredential]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!loginId.trim() || !password.trim()) {
      setError('Please enter your email or username and password.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await axiosInstance.post('auth/login', {
        login: loginId.trim(),
        password,
        device_name: 'web',
      });
      saveAuthSession(response.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const themes = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
    { id: 'system', label: 'System', icon: Laptop },
  ];
  const CurrentThemeIcon = themes.find((item) => item.id === theme)?.icon || Laptop;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 flex items-center justify-center p-4">
      <div ref={themeRef} className="absolute right-4 top-4 z-20">
        <button
          type="button"
          onClick={() => setIsThemeOpen((current) => !current)}
          className="flex items-center gap-2 rounded-2xl border border-zinc-200 bg-white/90 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-zinc-600 shadow-lg backdrop-blur transition-all hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/90 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          <CurrentThemeIcon className="h-4 w-4" />
          <span className="hidden sm:inline">{themes.find((item) => item.id === theme)?.label || 'Theme'}</span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isThemeOpen ? 'rotate-180' : ''}`} />
        </button>

        {isThemeOpen && (
          <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            {themes.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTheme(id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-all ${
                  theme === id
                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="w-full max-w-6xl grid overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-2xl shadow-zinc-200/70 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative min-h-[22rem] overflow-hidden bg-zinc-950 p-8 text-white sm:p-10 lg:p-12">
          <img
            src={heroImage}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-45"
          />
          <div className="absolute inset-0 bg-linear-to-br from-zinc-950 via-zinc-950/70 to-indigo-950/60" />
          <div className="relative z-10 flex h-full flex-col justify-between gap-12">
            <div className="flex items-center gap-3">
              <img
                src="/logo.png"
                alt="JAMC Church"
                className="h-12 w-12 rounded-2xl border border-white/15 bg-white object-contain p-1.5 shadow-lg"
              />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.28em] text-white/70">JAMC Church</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">Management System</h1>
              </div>
            </div>

            <div className="max-w-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-200">Welcome back</p>
              <p className="mt-4 text-3xl font-black leading-tight sm:text-5xl">
                Manage songs, services, media, and ministry flow in one place.
              </p>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-10 lg:p-12">
          <div className="mx-auto flex h-full max-w-md flex-col justify-center">
            <div className="mb-8">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-indigo-600 dark:text-indigo-400">Login</p>
              <h2 className="mt-3 text-3xl font-black tracking-tight">Sign in to your account</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
                  <p className="flex-1">{error}</p>
                  <button
                    type="button"
                    onClick={() => setError('')}
                    className="-mr-1 rounded-lg p-1 text-red-500 transition-colors hover:bg-red-100 hover:text-red-700 dark:text-red-300 dark:hover:bg-red-500/20 dark:hover:text-red-100"
                    title="Dismiss error"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Email or Username</span>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-950">
                  <UserRound className="h-4 w-4 shrink-0 text-zinc-400" />
                  <input
                    type="text"
                    value={loginId}
                    onChange={(event) => {
                      setLoginId(event.target.value);
                      setError('');
                    }}
                    placeholder="admin@jamc.church or jamc-admin"
                    className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-zinc-400"
                  />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Password</span>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:border-zinc-800 dark:bg-zinc-950">
                  <LockKeyhole className="h-4 w-4 shrink-0 text-zinc-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => {
                      setPassword(event.target.value);
                      setError('');
                    }}
                    placeholder="Enter password"
                    className="w-full bg-transparent text-sm font-semibold outline-none placeholder:text-zinc-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    className="rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-200 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-xl shadow-indigo-500/25 transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {isSubmitting ? 'Signing In...' : 'Sign In'}
              </button>

              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-zinc-400">or</span>
                <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              </div>

              {googleClientId ? (
                <div className="flex justify-center rounded-2xl border border-zinc-200 px-3 py-2.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                  <div ref={googleButtonRef} className="w-full" />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setError('Google Client ID is missing. Add VITE_GOOGLE_CLIENT_ID in the frontend .env file.')}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-zinc-200 px-5 py-4 text-sm font-black text-zinc-700 shadow-sm transition-all hover:border-indigo-200 hover:bg-zinc-50 active:scale-[0.98] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-indigo-500/30 dark:hover:bg-zinc-900"
                >
                  <span className="grid h-5 w-5 place-items-center rounded-full text-sm font-black shadow-sm">
                    <span className="bg-linear-to-r from-blue-500 via-red-500 to-amber-500 bg-clip-text text-transparent">G</span>
                  </span>
                  Sign in with Google
                </button>
              )}
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
