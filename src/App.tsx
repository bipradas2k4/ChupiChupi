import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { SupabaseConfigModal } from './components/SupabaseConfigModal';
import { QuickSendModal } from './components/QuickSendModal';
import { LandingView } from './views/LandingView';
import { PublicLetterboxView } from './views/PublicLetterboxView';
import { DashboardView } from './views/DashboardView';
import { AuthView } from './views/AuthView';
import { getSupabaseClient, getSupabaseCredentials } from './lib/supabase';
import { signOutUser, getActiveLocalSession } from './lib/auth';
import { saveLocalProfile, getLocalProfiles } from './lib/letterApi';
import type { Profile } from './types/database';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'landing' | 'letterbox' | 'dashboard' | 'auth'>('landing');
  const [letterboxUsername, setLetterboxUsername] = useState<string>('anirban');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signup');
  const [isQuickSendOpen, setIsQuickSendOpen] = useState(false);

  // Supabase Auth and Session State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);
  const [isConfigured, setIsConfigured] = useState(() => getSupabaseCredentials().isConfigured);
  const [configModalOpen, setConfigModalOpen] = useState(false);

  const loadUserProfile = async (userId: string, userObj?: any) => {
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) {
          setCurrentProfile(data as Profile);
          return;
        }
      } catch {
        // Ignore
      }
    }

    // Check local profiles
    const profiles = getLocalProfiles();
    const local = Object.values(profiles).find(p => p.id === userId);
    if (local) {
      setCurrentProfile(local);
      return;
    }

    // Auto-create profile for Google OAuth / newly signed in users
    if (userObj) {
      const derivedUsername = (userObj.user_metadata?.username || userObj.email?.split('@')[0] || `user_${userId.substring(0, 6)}`)
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '');
      const fallback: Profile = {
        id: userId,
        username: derivedUsername,
        display_name: userObj.user_metadata?.full_name || userObj.user_metadata?.name || userObj.email?.split('@')[0] || 'চিঠির মালিক',
        avatar_url: userObj.user_metadata?.avatar_url || userObj.user_metadata?.picture || null,
        prompt: 'আমাকে তোমার গোপন মনের কথা বলো... 🤫',
        bio: 'আমার সাথে গোপন চিঠি আদান-প্রদান করুন',
        inbox_paused: false,
        is_banned: false,
        role: 'user',
        envelope_theme: 'vintage_burgundy',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      saveLocalProfile(fallback);
      setCurrentProfile(fallback);
    }
  };

  useEffect(() => {
    // 1. Parse URL for direct public letterbox links (e.g. /u/anirban or ?u=anirban)
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const uParam = searchParams.get('u');

    if (uParam) {
      setLetterboxUsername(uParam);
      setCurrentView('letterbox');
    } else if (path.startsWith('/u/')) {
      const parsedName = path.replace('/u/', '').replace(/\/$/, '');
      if (parsedName) {
        setLetterboxUsername(parsedName);
        setCurrentView('letterbox');
      }
    } else if (path === '/dashboard' || window.location.hash.includes('access_token=') || window.location.search.includes('code=')) {
      setCurrentView('dashboard');
    } else if (path === '/auth') {
      setCurrentView('auth');
    }

    if (searchParams.get('admin') === 'setup' || searchParams.get('setup') === 'admin') {
      setConfigModalOpen(true);
    }

    // 2. Listen to browser back/forward buttons
    const handlePopState = () => {
      const p = window.location.pathname;
      if (p.startsWith('/u/')) {
        const u = p.replace('/u/', '').replace(/\/$/, '');
        setLetterboxUsername(u);
        setCurrentView('letterbox');
      } else if (p === '/dashboard') {
        setCurrentView('dashboard');
      } else if (p === '/auth') {
        setCurrentView('auth');
      } else {
        setCurrentView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);

    // 3. Initialize Auth Session (Supabase or Local)
    const client = getSupabaseClient();
    if (client) {
      client.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setCurrentUser(session.user);
          loadUserProfile(session.user.id, session.user);
        } else {
          const local = getActiveLocalSession();
          if (local) {
            setCurrentUser(local.user);
            setCurrentProfile(local.profile);
          }
        }
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setCurrentUser(session.user);
          loadUserProfile(session.user.id, session.user);
        } else {
          const local = getActiveLocalSession();
          if (local) {
            setCurrentUser(local.user);
            setCurrentProfile(local.profile);
          } else {
            setCurrentUser(null);
            setCurrentProfile(null);
          }
        }
      });

      return () => {
        subscription.unsubscribe();
        window.removeEventListener('popstate', handlePopState);
      };
    } else {
      const local = getActiveLocalSession();
      if (local) {
        setCurrentUser(local.user);
        setCurrentProfile(local.profile);
      }
    }

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isConfigured]);

  const navigateTo = (view: 'landing' | 'letterbox' | 'dashboard' | 'auth', username?: string, mode?: 'signin' | 'signup') => {
    setCurrentView(view);
    if (view === 'auth' && mode) {
      setAuthMode(mode);
    }
    if (view === 'letterbox' && username) {
      setLetterboxUsername(username);
      window.history.pushState({}, '', `/u/${username}`);
    } else if (view === 'dashboard') {
      window.history.pushState({}, '', '/dashboard');
    } else if (view === 'auth') {
      window.history.pushState({}, '', '/auth');
    } else {
      window.history.pushState({}, '', '/');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSignOut = async () => {
    await signOutUser();
    setCurrentUser(null);
    setCurrentProfile(null);
    navigateTo('landing');
  };

  const handleAuthSuccess = (user: any, profile: Profile) => {
    setCurrentUser(user);
    setCurrentProfile(profile);
    navigateTo('dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        currentUser={currentUser}
        currentProfile={currentProfile}
        onSignOut={handleSignOut}
        onOpenQuickSend={() => setIsQuickSendOpen(true)}
      />

      {/* Global Quick Send Modal */}
      <QuickSendModal
        isOpen={isQuickSendOpen}
        onClose={() => setIsQuickSendOpen(false)}
        onSelectRecipient={(username) => navigateTo('letterbox', username)}
      />

      {/* Main Content Area */}
      <main className="app-container" style={{ flex: 1, width: '100%' }}>
        {currentView === 'landing' && (
          <LandingView
            onOpenLetterbox={(username) => navigateTo('letterbox', username)}
            onCreateLetterbox={() => {
              setAuthMode('signup');
              navigateTo('auth', undefined, 'signup');
            }}
            onSignIn={() => {
              setAuthMode('signin');
              navigateTo('auth', undefined, 'signin');
            }}
          />
        )}

        {currentView === 'letterbox' && (
          <PublicLetterboxView
            username={letterboxUsername}
            onBackToHome={() => navigateTo('landing')}
            onCreateLetterbox={() => {
              setAuthMode('signup');
              navigateTo('auth', undefined, 'signup');
            }}
            onSignIn={() => {
              setAuthMode('signin');
              navigateTo('auth', undefined, 'signin');
            }}
          />
        )}

        {currentView === 'dashboard' && (
          currentUser && currentProfile ? (
            <DashboardView
              profile={currentProfile}
              onRefreshProfile={() => loadUserProfile(currentUser.id)}
              onSignOut={handleSignOut}
            />
          ) : (
            // If user visits /dashboard without session, smoothly redirect to Auth view
            <AuthView
              initialMode="signin"
              onSuccess={handleAuthSuccess}
            />
          )
        )}

        {currentView === 'auth' && (
          <AuthView
            initialMode={authMode}
            onSuccess={handleAuthSuccess}
          />
        )}
      </main>

      {/* Supabase Connection & Configuration Modal */}
      <SupabaseConfigModal
        isOpen={configModalOpen}
        onClose={() => setConfigModalOpen(false)}
        onConfigChanged={() => {
          const creds = getSupabaseCredentials();
          setIsConfigured(creds.isConfigured);
          const client = getSupabaseClient();
          if (client) {
            client.auth.getSession().then(({ data: { session } }) => {
              if (session?.user) {
                setCurrentUser(session.user);
                loadUserProfile(session.user.id);
              }
            });
          }
        }}
      />

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(10, 5, 13, 0.95)',
        padding: '2.5rem 1.5rem',
        textAlign: 'center',
        marginTop: 'auto',
        color: '#a8998b',
        fontSize: '0.88rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
            fontFamily: 'var(--font-serif)',
            fontSize: '1.25rem',
            color: '#fdf4ea'
          }}>
            <div className="wax-seal" style={{ width: '28px', height: '28px', fontSize: '0.65rem' }}>
              চুপি
            </div>
            <span>চুপিচুপি (ChupiChupi)</span>
          </div>

          <p style={{ maxWidth: '540px', margin: '0 auto 1.25rem', lineHeight: 1.5 }}>
            বাঙালির চিঠি লেখার চিরন্তন আবেগ ও আধুনিক ডিজিটাল গোপনীয়তার সংমিশ্রণ। না বলা কথাগুলো নিরাপদে পৌঁছে যাক প্রিয় মানুষের কাছে।
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.82rem', color: '#c4b5a5' }}>
            <span>🔒 ১০০% প্রেরক গোপনীয়তা</span>
            <span>📬 সম্পূর্ণ সুরক্ষিত ও ব্যক্তিগত</span>
            <span>✨ সাইন-আপ ছাড়াই প্রথম চিঠি</span>
          </div>

          <div style={{ marginTop: '1.25rem', fontSize: '0.78rem', color: '#6b5e54' }}>
            © 2026 ChupiChupi. সকল অধিকার সংরক্ষিত।
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
