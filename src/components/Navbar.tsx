import React from 'react';
import { Mail, User, LogOut, Sparkles } from 'lucide-react';
import type { Profile } from '../types/database';

interface NavbarProps {
  currentView: 'landing' | 'letterbox' | 'dashboard' | 'auth';
  onNavigate: (view: 'landing' | 'letterbox' | 'dashboard' | 'auth', username?: string, authMode?: 'signin' | 'signup') => void;
  currentUser: any;
  currentProfile: Profile | null;
  onSignOut: () => void;
  onOpenQuickSend: () => void;
  isSupabaseConfigured?: boolean;
  onOpenConfigModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  currentUser,
  currentProfile,
  onSignOut,
  onOpenQuickSend,
}) => {
  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      background: 'rgba(10, 5, 13, 0.88)',
      borderBottom: '1px solid rgba(245, 158, 11, 0.15)',
      padding: '0.85rem 1.5rem',
      transition: 'all 0.3s ease'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        {/* Brand / Logo */}
        <div 
          onClick={() => onNavigate('landing')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          id="nav-logo"
        >
          <div className="wax-seal" style={{ width: '40px', height: '40px', fontSize: '0.85rem' }}>
            চুপি
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#fdf4ea',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              lineHeight: 1.1
            }}>
              চুপিচুপি <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontFamily: 'var(--font-accent)', fontWeight: 600 }}>ChupiChupi</span>
            </div>
            <div style={{ fontSize: '0.74rem', color: '#a8998b', letterSpacing: '0.02em' }}>
              বেনামী চিঠি ও মনের কথা
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Primary CTA - Guest First "চিঠি পাঠাও" */}
          <button
            onClick={onOpenQuickSend}
            id="nav-send-letter-btn"
            className="btn btn-primary"
            style={{ padding: '0.55rem 1.1rem', fontSize: '0.9rem' }}
          >
            <Mail size={16} />
            <span>চিঠি পাঠাও</span>
          </button>

          {currentUser ? (
            <>
              <button
                onClick={() => onNavigate('dashboard')}
                id="nav-dashboard-btn"
                className={`btn ${currentView === 'dashboard' ? 'btn-secondary' : 'btn-ghost'}`}
                style={{ padding: '0.55rem 1rem', fontSize: '0.9rem' }}
              >
                <User size={16} />
                <span>আমার ইনবক্স {currentProfile?.username ? `(@${currentProfile.username})` : ''}</span>
              </button>
              <button
                onClick={onSignOut}
                id="nav-signout-btn"
                className="btn btn-ghost"
                title="লগআউট"
                style={{ padding: '0.55rem 0.75rem' }}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onNavigate('auth', undefined, 'signup')}
                id="nav-create-box-btn"
                className="btn btn-secondary"
                style={{ padding: '0.55rem 1rem', fontSize: '0.9rem' }}
              >
                <Sparkles size={15} />
                <span>চিঠির বাক্স বানাও</span>
              </button>
              <button
                onClick={() => onNavigate('auth', undefined, 'signin')}
                id="nav-login-btn"
                className="btn btn-ghost"
                style={{ padding: '0.55rem 0.85rem', fontSize: '0.9rem' }}
              >
                সাইন ইন
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

