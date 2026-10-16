import { useState, useEffect } from 'react';
import { 
  Mail, Lock, User, AtSign, Eye, EyeOff, CheckCircle2, 
  AlertCircle, Sparkles, RefreshCw, Send, ArrowRight
} from 'lucide-react';
import { signUpWithEmail, signInWithEmail, sendPasswordReset, resendVerificationEmail, USERNAME_REGEX } from '../lib/auth';
import type { Profile } from '../types/database';

interface AuthViewProps {
  initialMode?: 'signin' | 'signup';
  isSupabaseConfigured?: boolean;
  onSuccess: (user: any, profile: Profile) => void;
  onOpenConfigModal?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'signup',
  onSuccess,
}) => {
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);

  // Form inputs
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(true);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorField, setErrorField] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setErrorMessage(null);
    setErrorField(null);
  }, [initialMode]);

  // Email verification dedicated state
  const [isVerificationPending, setIsVerificationPending] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendStatus, setResendStatus] = useState<{ success: boolean; text: string } | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [needsVerificationNotice, setNeedsVerificationNotice] = useState(false);

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<string | null>(null);

  // Google Auth Coming Soon Modal
  const [showGoogleModal, setShowGoogleModal] = useState(false);

  const cleanUsername = username.trim().toLowerCase().replace(/^@/, '');

  const handleFieldChange = (field: string, setter: (val: any) => void, val: any) => {
    setter(val);
    if (errorField === field) setErrorField(null);
    if (errorMessage) setErrorMessage(null);
  };

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleResendVerification = async (targetEmail?: string) => {
    const toSend = (targetEmail || verificationEmail || email).trim();
    if (!toSend) return;
    setResendingVerification(true);
    setResendStatus(null);
    const res = await resendVerificationEmail(toSend);
    setResendingVerification(false);
    if (res.success) {
      setResendStatus({ success: true, text: res.message || 'ভেরিফিকেশন লিঙ্ক সফলভাবে পাঠানো হয়েছে।' });
      setResendCooldown(60);
    } else {
      setResendStatus({ success: false, text: res.error || 'ভেরিফিকেশন লিঙ্ক পাঠানো যায়নি।' });
    }
  };

  const handleSignUp = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMessage(null);
    setInfoMessage(null);
    setErrorField(null);
    setResendStatus(null);

    const trimmedDisplayName = displayName.trim();
    const cleanUser = cleanUsername;
    const trimmedEmail = email.trim();

    if (!trimmedDisplayName) {
      setErrorMessage('অনুগ্রহ করে আপনার ডিসপ্লে নাম লিখুন (যেমন: অনির্বাণ)');
      setErrorField('displayName');
      const el = document.getElementById('signup-displayname-input');
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!cleanUser) {
      setErrorMessage('অনুগ্রহ করে একটি ইউজারনেম লিখুন (যেমন: anirban_m)');
      setErrorField('username');
      const el = document.getElementById('signup-username-input');
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!USERNAME_REGEX.test(cleanUser)) {
      setErrorMessage('ইউজারনেম ৩ থেকে ৩০ অক্ষরের হতে হবে এবং কেবল ইংরেজি অক্ষর, সংখ্যা এবং আন্ডারস্কোর (_) ব্যবহারযোগ্য।');
      setErrorField('username');
      const el = document.getElementById('signup-username-input');
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setErrorMessage('অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন (যেমন: name@example.com)');
      setErrorField('email');
      const el = document.getElementById('signup-email-input');
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!password) {
      setErrorMessage('অনুগ্রহ করে একটি পাসওয়ার্ড দিন (কমপক্ষে ৬ অক্ষর)');
      setErrorField('password');
      const el = document.getElementById('signup-password-input');
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (password.length < 6) {
      setErrorMessage('পাসওয়ার্ড ন্যূনতম ৬ অক্ষরের হতে হবে।');
      setErrorField('password');
      const el = document.getElementById('signup-password-input');
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Only validate confirmPassword if user typed something in it
    if (confirmPassword.trim() && password !== confirmPassword.trim()) {
      setErrorMessage('পাসওয়ার্ড এবং কনফার্ম পাসওয়ার্ড মিলছে না। অনুগ্রহ করে সঠিক পাসওয়ার্ড লিখুন।');
      setErrorField('confirmPassword');
      const el = document.getElementById('signup-confirm-password-input');
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // Auto-accept terms upon submitting
    if (!acceptTerms) {
      setAcceptTerms(true);
    }

    setLoading(true);
    try {
      const res = await signUpWithEmail(trimmedEmail, password, cleanUser, trimmedDisplayName);
      setLoading(false);

      if (res.success) {
        if (res.requiresEmailVerification) {
          setVerificationEmail(trimmedEmail);
          setIsVerificationPending(true);
          setErrorMessage(null);
          setNeedsVerificationNotice(false);
        } else if (res.profile) {
          onSuccess(res.user, res.profile);
        } else {
          setInfoMessage(res.message || 'নিবন্ধন সম্পন্ন হয়েছে! আপনার চিঠির বাক্স প্রস্তুত।');
        }
      } else {
        setErrorMessage(res.error || 'নিবন্ধন সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
        const alertEl = document.getElementById('signup-submit-btn');
        alertEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'একটি সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  const handleSignIn = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setErrorMessage(null);
    setInfoMessage(null);
    setErrorField(null);
    setResendStatus(null);

    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      setErrorMessage('অনুগ্রহ করে আপনার ইমেইল অথবা ইউজারনেম দিন।');
      setErrorField('signinEmail');
      const el = document.getElementById('signin-email-input');
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (!password) {
      setErrorMessage('অনুগ্রহ করে পাসওয়ার্ড লিখুন।');
      setErrorField('signinPassword');
      const el = document.getElementById('signin-password-input');
      el?.focus();
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setLoading(true);
    try {
      const res = await signInWithEmail(trimmedEmail, password);
      setLoading(false);

      if (res.success && res.user && res.profile) {
        onSuccess(res.user, res.profile);
      } else if (res.requiresEmailVerification) {
        setVerificationEmail(res.unverifiedEmail || trimmedEmail);
        setNeedsVerificationNotice(true);
        setErrorMessage(res.error || 'আপনার ইমেইলটি এখনও ভেরিফাই করা হয়নি।');
        const alertEl = document.getElementById('signin-submit-btn');
        alertEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (res.success && res.user) {
        // Create minimal profile fallback if trigger hasn't fired yet
        const fallbackProf: Profile = {
          id: res.user.id,
          username: res.user.user_metadata?.username || 'user_' + res.user.id.substring(0, 6),
          display_name: res.user.user_metadata?.display_name || 'আমার চিঠি বাক্স',
          avatar_url: null,
          prompt: 'আমাকে তোমার গোপন মনের কথা বলো... 🤫',
          bio: 'আমার সাথে গোপন চিঠি আদান-প্রদান করুন',
          inbox_paused: false,
          is_banned: false,
          role: 'user',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        onSuccess(res.user, fallbackProf);
      } else {
        setNeedsVerificationNotice(false);
        setErrorMessage(res.error || 'লগইন ব্যর্থ হয়েছে। ইমেইল ও পাসওয়ার্ড সঠিক কিনা পরীক্ষা করুন।');
        const alertEl = document.getElementById('signin-submit-btn');
        alertEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err?.message || 'লগইন ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    }
  };

  const handleGoogleAuth = () => {
    setShowGoogleModal(true);
  };



  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setLoading(true);
    const res = await sendPasswordReset(resetEmail);
    setLoading(false);
    if (res.success) {
      setResetStatus('পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে।');
    } else {
      setResetStatus(res.error || 'রিসেট লিংক পাঠানো যায়নি।');
    }
  };

  return (
    <div style={{ maxWidth: '480px', margin: '2rem auto', paddingTop: '1rem' }} id="auth-container">

      {/* Main Glass Card */}
      <div className="glass-card" style={{ padding: '2.25rem 2rem' }}>
        {/* Top Seal Stamp */}
        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
          <div className="wax-seal" style={{ width: '48px', height: '48px', margin: '0 auto 0.75rem' }}>
            চুপি
          </div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', color: '#fdf4ea', marginBottom: '0.25rem' }}>
            {mode === 'signup' ? 'চিঠির বাক্স তৈরি করুন' : 'চিঠির বাক্সে প্রবেশ করুন'}
          </h2>
          <p style={{ fontSize: '0.88rem', color: '#a8998b' }}>
            {mode === 'signup' 
              ? 'ব্যক্তিগত লিঙ্ক পান এবং বেনামী চিঠি সংগ্রহ শুরু করুন' 
              : 'আপনার ইনবক্স ও বার্তা ব্যবস্থাপনা করুন'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 8, 20, 0.8)',
          borderRadius: '12px',
          padding: '0.3rem',
          marginBottom: '1.5rem',
          border: '1px solid var(--border-subtle)'
        }}>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMessage(null); setErrorField(null); }}
            id="auth-tab-signup"
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '9px',
              border: 'none',
              background: mode === 'signup' ? 'var(--color-primary)' : 'transparent',
              color: mode === 'signup' ? '#ffffff' : '#a8998b',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            চিঠির বাক্স বানাও (Sign Up)
          </button>

          <button
            type="button"
            onClick={() => { setMode('signin'); setErrorMessage(null); setErrorField(null); }}
            id="auth-tab-signin"
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '9px',
              border: 'none',
              background: mode === 'signin' ? 'var(--color-primary)' : 'transparent',
              color: mode === 'signin' ? '#ffffff' : '#a8998b',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.9rem',
              transition: 'all 0.2s ease'
            }}
          >
            লগইন (Sign In)
          </button>
        </div>

        {/* Top Feedback Alerts */}
        {/* Top Feedback Alerts */}
        {errorMessage && (
          <div style={{
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            fontSize: '0.85rem',
            marginBottom: '1.25rem'
          }} id="auth-error-alert">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: needsVerificationNotice ? '0.6rem' : 0 }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMessage}</span>
            </div>
            {mode === 'signin' && (
              <div style={{
                marginTop: '0.6rem',
                borderTop: '1px solid rgba(239, 68, 68, 0.25)',
                paddingTop: '0.6rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#fecaca' }}>
                  আপনার কি কোনো অ্যাকাউন্ট নেই?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setMode('signup');
                    setErrorMessage(null);
                    setErrorField(null);
                  }}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: 'rgba(190, 18, 60, 0.4)', borderColor: '#be123c' }}
                >
                  নতুন চিঠি বাক্স বানাও (Sign Up) 👉
                </button>
              </div>
            )}
            {needsVerificationNotice && (
              <div style={{
                marginTop: '0.6rem',
                borderTop: '1px solid rgba(239, 68, 68, 0.25)',
                paddingTop: '0.6rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.5rem'
              }}>
                <span style={{ fontSize: '0.8rem', color: '#fecaca' }}>
                  ইমেইল পাননি? স্প্যাম ফোল্ডার চেক করুন অথবা:
                </span>
                <button
                  type="button"
                  onClick={() => handleResendVerification(verificationEmail)}
                  disabled={resendingVerification || resendCooldown > 0}
                  className="btn btn-secondary"
                  style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                >
                  {resendingVerification ? 'পাঠানো হচ্ছে...' : resendCooldown > 0 ? `অপেক্ষা (${resendCooldown}s)` : 'ভেরিফিকেশন লিঙ্ক পাঠান'}
                </button>
              </div>
            )}
          </div>
        )}

        {infoMessage && (
          <div style={{
            padding: '0.8rem 1rem',
            borderRadius: '10px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid rgba(34, 197, 94, 0.35)',
            color: '#4ade80',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }} id="auth-info-alert">
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{infoMessage}</span>
          </div>
        )}

        {/* Form Body */}
        {isVerificationPending ? (
          <div style={{ textAlign: 'center', padding: '0.75rem 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '2px solid rgba(245, 158, 11, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              color: '#fbbf24'
            }}>
              <Mail size={32} />
            </div>

            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: '#fdf4ea', marginBottom: '0.5rem' }}>
              ইমেইল ভেরিফিকেশন লিঙ্ক পাঠানো হয়েছে! ✉️
            </h3>

            <p style={{ fontSize: '0.9rem', color: '#c4b5a5', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              আমরা আপনার দেওয়া ইমেইল ঠিকানায় একটি যাচাইকরণ লিঙ্ক পাঠিয়েছি:
            </p>

            <div style={{
              background: 'rgba(15, 8, 20, 0.9)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: '10px',
              padding: '0.75rem 1rem',
              color: '#fbbf24',
              fontFamily: 'monospace',
              fontSize: '0.95rem',
              fontWeight: 600,
              marginBottom: '1.5rem',
              wordBreak: 'break-all'
            }}>
              {verificationEmail}
            </div>

            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '12px',
              padding: '1rem',
              textAlign: 'left',
              fontSize: '0.85rem',
              color: '#e2d7ce',
              lineHeight: 1.6,
              marginBottom: '1.5rem',
              border: '1px solid var(--border-subtle)'
            }}>
              <p style={{ fontWeight: 600, color: '#fdf4ea', marginBottom: '0.4rem' }}>পরবর্তী করণীয়:</p>
              <ol style={{ paddingLeft: '1.25rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <li>আপনার ইমেইল ইনবক্স (Inbox) ওপেন করুন।</li>
                <li>ইনবক্সে না পেলে <strong>স্প্যাম (Spam / Junk)</strong> ফোল্ডারটি চেক করুন।</li>
                <li>Supabase থেকে পাঠানো <strong>Confirm your signup</strong> লিঙ্কে ক্লিক করুন।</li>
              </ol>
            </div>

            {resendStatus && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                background: resendStatus.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                border: `1px solid ${resendStatus.success ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                color: resendStatus.success ? '#4ade80' : '#fca5a5',
                fontSize: '0.82rem',
                marginBottom: '1.25rem',
                textAlign: 'center'
              }}>
                {resendStatus.text}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleResendVerification(verificationEmail)}
                disabled={resendingVerification || resendCooldown > 0}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
              >
                {resendingVerification ? (
                  <>
                    <RefreshCw size={16} className="spin" />
                    <span>পাঠানো হচ্ছে...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <span>পুনরায় পাঠাতে অপেক্ষা করুন ({resendCooldown}s)</span>
                ) : (
                  <>
                    <Send size={16} />
                    <span>ভেরিফিকেশন লিঙ্ক পুনরায় পাঠান</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVerificationPending(false);
                  setMode('signin');
                  setInfoMessage('ইমেইল নিশ্চিত করার পর আপনার পাসওয়ার্ড দিয়ে লগইন করুন।');
                }}
                className="btn btn-primary"
                style={{ width: '100%', padding: '0.75rem', justifyContent: 'center' }}
              >
                <span>ভেরিফাই করেছি, লগইন পেজে যান</span>
                <ArrowRight size={16} />
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsVerificationPending(false);
                  setMode('signup');
                }}
                className="btn btn-ghost"
                style={{ fontSize: '0.82rem', color: '#a8998b' }}
              >
                ভুল ইমেইল দিয়েছেন? পুনরায় তথ্য দিন
              </button>
            </div>
          </div>
        ) : mode === 'signup' ? (
          <form onSubmit={handleSignUp} id="signup-form" noValidate>
            {/* Display Name */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <User size={14} />
                <span>ডিসপ্লে নাম (Display Name)</span>
              </label>
              <input
                type="text"
                id="signup-displayname-input"
                className="form-input"
                placeholder="যেমন: অনির্বাণ মুখোপাধ্যায়"
                value={displayName}
                onChange={(e) => handleFieldChange('displayName', setDisplayName, e.target.value)}
                style={{
                  borderColor: errorField === 'displayName' ? '#ef4444' : undefined,
                  boxShadow: errorField === 'displayName' ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                }}
              />
            </div>

            {/* Unique Username */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <AtSign size={14} />
                <span>অনন্য ইউজারনেম (Unique Username)</span>
              </label>
              <input
                type="text"
                id="signup-username-input"
                className="form-input"
                placeholder="যেমন: anirban_m"
                value={username}
                onChange={(e) => handleFieldChange('username', setUsername, e.target.value)}
                style={{
                  borderColor: errorField === 'username' ? '#ef4444' : undefined,
                  boxShadow: errorField === 'username' ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                }}
              />
              <div style={{ fontSize: '0.75rem', color: '#fbbf24', marginTop: '0.3rem' }}>
                {cleanUsername ? `আপনার লিঙ্ক হবে: chupichupi.app/u/${cleanUsername}` : '৩-৩০ অক্ষরের ইংরেজি ও সংখ্যা'}
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} />
                <span>ইমেইল ঠিকানা (Email)</span>
              </label>
              <input
                type="email"
                id="signup-email-input"
                className="form-input"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => handleFieldChange('email', setEmail, e.target.value)}
                style={{
                  borderColor: errorField === 'email' ? '#ef4444' : undefined,
                  boxShadow: errorField === 'email' ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                }}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Lock size={14} />
                <span>পাসওয়ার্ড (Password)</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="signup-password-input"
                  className="form-input"
                  placeholder="কমপক্ষে ৬ অক্ষরের পাসওয়ার্ড"
                  value={password}
                  onChange={(e) => handleFieldChange('password', setPassword, e.target.value)}
                  style={{
                    borderColor: errorField === 'password' ? '#ef4444' : undefined,
                    boxShadow: errorField === 'password' ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#c4b5a5',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <label className="form-label">
                কনফার্ম পাসওয়ার্ড <span style={{ fontSize: '0.75rem', color: '#a8998b' }}>(ঐচ্ছিক)</span>
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                id="signup-confirm-password-input"
                className="form-input"
                placeholder="পাসওয়ার্ডটি নিশ্চিত করতে পুনরায় লিখুন (ঐচ্ছিক)"
                value={confirmPassword}
                onChange={(e) => handleFieldChange('confirmPassword', setConfirmPassword, e.target.value)}
                style={{
                  borderColor: errorField === 'confirmPassword' ? '#ef4444' : undefined,
                  boxShadow: errorField === 'confirmPassword' ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                }}
              />
            </div>

            {/* Terms Checkbox */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: '#c4b5a5' }}>
              <input
                type="checkbox"
                id="signup-terms-checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ marginTop: '3px', cursor: 'pointer' }}
              />
              <label htmlFor="signup-terms-checkbox" style={{ cursor: 'pointer', lineHeight: 1.4 }}>
                আমি চুপিচুপি-র ব্যবহারবিধি ও গোপনীয়তা নীতি মেনে নিচ্ছি এবং অন্যের মর্যাদা ক্ষুণ্ন না করার প্রতিশ্রুতি দিচ্ছি।
              </label>
            </div>

            {/* Inline Error Message right above the submit button so user sees it regardless of scroll position! */}
            {errorMessage && (
              <div 
                id="signup-error-inline"
                style={{
                  padding: '0.75rem 0.95rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.18)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#fecaca',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  marginBottom: '1rem'
                }}
              >
                <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="signup-submit-btn"
              disabled={loading}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                padding: '0.9rem', 
                fontSize: '1.05rem', 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1
              }}
            >
              {loading ? (
                <>
                  <span className="wax-seal animate-glow" style={{ width: '20px', height: '20px', fontSize: '0.6rem' }}>চুপি</span>
                  <span>চিঠির বাক্স তৈরি হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>আমার চিঠির বাক্স বানাও</span>
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignIn} id="signin-form" noValidate>
            {/* Email or Username */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Mail size={14} />
                <span>ইমেইল অথবা ইউজারনেম (Email or Username)</span>
              </label>
              <input
                type="text"
                id="signin-email-input"
                className="form-input"
                placeholder="যেমন: name@example.com অথবা anirban"
                value={email}
                onChange={(e) => handleFieldChange('signinEmail', setEmail, e.target.value)}
                style={{
                  borderColor: errorField === 'signinEmail' ? '#ef4444' : undefined,
                  boxShadow: errorField === 'signinEmail' ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                }}
              />
            </div>

            {/* Password */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Lock size={14} />
                  <span>পাসওয়ার্ড</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  style={{ background: 'transparent', border: 'none', color: '#fbbf24', fontSize: '0.78rem', cursor: 'pointer' }}
                >
                  পাসওয়ার্ড মনে নেই?
                </button>
              </div>

              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="signin-password-input"
                  className="form-input"
                  placeholder="আপনার পাসওয়ার্ড লিখুন"
                  value={password}
                  onChange={(e) => handleFieldChange('signinPassword', setPassword, e.target.value)}
                  style={{
                    borderColor: errorField === 'signinPassword' ? '#ef4444' : undefined,
                    boxShadow: errorField === 'signinPassword' ? '0 0 0 2px rgba(239, 68, 68, 0.25)' : undefined
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '1rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    color: '#c4b5a5',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Inline Error Message right above the sign in button */}
            {errorMessage && (
              <div 
                id="signin-error-inline"
                style={{
                  padding: '0.75rem 0.95rem',
                  borderRadius: '10px',
                  background: 'rgba(239, 68, 68, 0.18)',
                  border: '1px solid rgba(239, 68, 68, 0.45)',
                  color: '#fecaca',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.55rem',
                  marginBottom: '1rem'
                }}
              >
                <AlertCircle size={16} color="#f87171" style={{ flexShrink: 0 }} />
                <span style={{ fontWeight: 500 }}>{errorMessage}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              id="signin-submit-btn"
              disabled={loading}
              className="btn btn-primary"
              style={{ 
                width: '100%', 
                padding: '0.9rem', 
                fontSize: '1.05rem', 
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.75 : 1
              }}
            >
              {loading ? (
                <>
                  <span className="wax-seal animate-glow" style={{ width: '20px', height: '20px', fontSize: '0.6rem' }}>চুপি</span>
                  <span>সাইন ইন হচ্ছে...</span>
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>লগইন করুন</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Divider */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          margin: '1.25rem 0',
          color: '#8b7d72',
          fontSize: '0.8rem'
        }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
          <span>অথবা</span>
          <div style={{ flex: 1, height: '1px', background: 'var(--border-subtle)' }} />
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleAuth}
          id="google-oauth-btn"
          className="btn btn-secondary"
          style={{
            width: '100%',
            padding: '0.8rem 1rem',
            fontSize: '0.95rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: '#ffffff',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>{mode === 'signup' ? 'Google দিয়ে সাইন আপ করুন' : 'Google দিয়ে সাইন ইন করুন'}</span>
        </button>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#fdf4ea', marginBottom: '0.5rem' }}>
              পাসওয়ার্ড পুনরুদ্ধার করুন
            </h3>
            <p style={{ fontSize: '0.88rem', color: '#c4b5a5', marginBottom: '1.25rem' }}>
              আপনার নিবন্ধিত ইমেইল ঠিকানা দিলে আমরা পাসওয়ার্ড রিসেট করার একটি নিরাপদ লিঙ্ক পাঠিয়ে দেব।
            </p>

            <form onSubmit={handleSendResetEmail} noValidate>
              <div className="form-group">
                <label className="form-label">ইমেইল ঠিকানা</label>
                <input
                  type="email"
                  className="form-input"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="name@example.com"
                />
              </div>

              {resetStatus && (
                <div style={{ fontSize: '0.82rem', color: '#fbbf24', marginBottom: '1rem' }}>
                  {resetStatus}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button type="button" onClick={() => setShowForgotModal(false)} className="btn btn-ghost">
                  বাতিল
                </button>
                <button type="submit" disabled={loading} className="btn btn-primary">
                  {loading ? 'পাঠানো হচ্ছে...' : 'রিসেট লিঙ্ক পাঠান'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Google Sign In / Sign Up "Coming Soon" Popup */}
      {showGoogleModal && (
        <div className="modal-overlay" onClick={() => setShowGoogleModal(false)} style={{ zIndex: 1200 }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px', padding: '2.25rem 2rem', textAlign: 'center' }} id="google-coming-soon-modal">
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
              boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
            </div>

            <div style={{
              display: 'inline-block',
              padding: '0.25rem 0.85rem',
              borderRadius: '20px',
              background: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#f59e0b',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '0.85rem'
            }}>
              🚀 শীঘ্রই আসছে (Coming Soon)
            </div>

            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', color: '#fdf4ea', marginBottom: '0.6rem' }}>
              গুগল সাইন-ইন খুব শীঘ্রই চালু হবে!
            </h3>

            <p style={{ fontSize: '0.9rem', color: '#c4b5a5', lineHeight: 1.6, marginBottom: '1.75rem' }}>
              গুগল সাইন-ইন ও সাইন-আপ সুবিধা খুব শীঘ্রই চুপিচুপি-তে চালু হতে যাচ্ছে।
              <br /><br />
              আপাতত আপনার <strong>ইমেইল ও পাসওয়ার্ড</strong> দিয়ে অনায়াসেই নতুন চিঠির বাক্স তৈরি করুন বা প্রবেশ করুন!
            </p>

            <button
              type="button"
              id="google-coming-soon-close-btn"
              onClick={() => setShowGoogleModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', padding: '0.85rem', fontSize: '1rem' }}
            >
              ঠিক আছে, বুঝতে পেরেছি
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
