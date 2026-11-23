import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const AdminLoginPage: React.FC = () => {
  const {
    loading,
    needsInitialSetup,
    supabaseConfigured,
    isAuthenticated,
    setupFirstAdmin,
    login,
    requestPasswordReset,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPath = (location.state as { from?: string } | null)?.from || '/admin/dashboard';

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);

  const [forgotMode, setForgotMode] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate(fromPath, { replace: true });
    }
  }, [loading, isAuthenticated, navigate, fromPath]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (needsInitialSetup) {
      if (password.length < 8) {
        setError('Password must be at least 8 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setSubmitting(true);
      try {
        await setupFirstAdmin({ name, email, password });
        navigate(fromPath, { replace: true });
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Unable to claim Super Admin account.');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    setSubmitting(true);
    try {
      await login({ email, password, rememberSession });
      navigate(fromPath, { replace: true });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setSubmitting(true);
    try {
      const res = await requestPasswordReset(resetEmail);
      setResetMessage(res.message);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to process recovery request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md bg-white border border-[#D8C9B4] rounded overflow-hidden">
        <div className="bg-[#3B1422] px-8 py-7 text-center border-b border-[#C3A46C]/40">
          <p className="font-serif text-2xl tracking-[0.16em] text-white font-semibold">AARANYA</p>
          <p className="text-[10px] uppercase tracking-[0.22em] text-[#C3A46C] mt-1">
            The House of Indian Silks · Admin Portal
          </p>
        </div>

        <div className="p-8 space-y-5">
          {forgotMode ? (
            <>
              <div>
                <h1 className="font-serif text-xl font-semibold text-[#24211F]">Recover Administrator Access</h1>
                <p className="text-xs text-[#534245] mt-1">
                  Enter your verified staff email address to request a password reset link or Super Admin assistance.
                </p>
              </div>

              {error && (
                <div className="p-3 text-xs text-[#8B1E2D] bg-[#FBECEE] border border-[#E8A2AA] rounded">
                  {error}
                </div>
              )}
              {resetMessage && (
                <div className="p-3 text-xs text-[#1C4A3A] bg-[#EBF3EF] border border-[#95C1AE] rounded">
                  {resetMessage}
                </div>
              )}

              <form onSubmit={handlePasswordReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Staff Email</label>
                  <input
                    required
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="admin@aaranyasilks.in"
                    className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-2.5 px-4 bg-[#641E32] text-white text-sm font-semibold rounded hover:bg-[#3B1422] transition-colors cursor-pointer disabled:opacity-60"
                >
                  {submitting ? 'Submitting...' : 'Request Access Recovery'}
                </button>
              </form>

              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setError('');
                  setResetMessage('');
                }}
                className="text-xs font-semibold text-[#641E32] hover:underline cursor-pointer"
              >
                Back to Administrator Sign In
              </button>
            </>
          ) : (
            <>
              <div>
                <h1 className="font-serif text-xl font-semibold text-[#24211F]">
                  {needsInitialSetup ? 'Claim Primary Super Admin' : 'Administrator Sign In'}
                </h1>
                <p className="text-xs text-[#534245] mt-1">
                  {needsInitialSetup
                    ? 'Create the founding administrator credentials. Password is salted and hashed on the server.'
                    : 'Sign in with your verified AARANYA staff email and password.'}
                </p>
              </div>

              {error && (
                <div className="p-3 text-xs text-[#8B1E2D] bg-[#FBECEE] border border-[#E8A2AA] rounded">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {needsInitialSetup && (
                  <div>
                    <label className="block text-xs font-semibold text-[#534245] mb-1">Full Name</label>
                    <input
                      required
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Arundhati Kulkarni"
                      className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-[#534245] mb-1">Staff Email</label>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@aaranyasilks.in"
                    className="w-full px-3 py-2 text-sm border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-[#534245]">Password</label>
                    {!needsInitialSetup && (
                      <button
                        type="button"
                        onClick={() => {
                          setResetEmail(email);
                          setForgotMode(true);
                          setError('');
                        }}
                        className="text-[11px] font-medium text-[#641E32] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full pl-3 pr-10 py-2 text-sm border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#534245] hover:text-[#641E32] cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {needsInitialSetup ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#534245] mb-1">Confirm Password</label>
                    <div className="relative">
                      <input
                        required
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter password"
                        className="w-full pl-3 pr-10 py-2 text-sm border border-[#D8C9B4] rounded focus:outline-none focus:border-[#641E32]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#534245] hover:text-[#641E32] cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex items-center gap-2 text-xs text-[#534245] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rememberSession}
                      onChange={(e) => setRememberSession(e.target.checked)}
                      className="accent-[#641E32]"
                    />
                    Remember this session (extended 24-hour server validity)
                  </label>
                )}

                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="w-full py-2.5 px-4 bg-[#641E32] text-white text-sm font-semibold rounded hover:bg-[#3B1422] transition-colors inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  <Lock className="w-4 h-4" />
                  <span>
                    {submitting
                      ? 'Verifying...'
                      : needsInitialSetup
                        ? 'Claim Super Admin & Enter'
                        : 'Sign In to Atelier Portal'}
                  </span>
                </button>
              </form>
            </>
          )}

          <div className="pt-4 border-t border-[#EEE7E3] flex items-center justify-between text-[11px] text-[#534245]">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1C4A3A]" />
              {supabaseConfigured ? 'Supabase Auth + RBAC Active' : 'Server-Verified Session + RBAC'}
            </span>
            <span className="text-[#867275]">
              {supabaseConfigured ? 'Live Database' : 'Preview Sample Workspace'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
