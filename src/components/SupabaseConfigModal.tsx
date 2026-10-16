import React, { useState, useEffect } from 'react';
import { X, Database, CheckCircle2, AlertTriangle, Key, Link as LinkIcon, RefreshCw, Copy, Check, Terminal, Globe, ExternalLink, ShieldCheck } from 'lucide-react';
import { getSupabaseCredentials, saveSupabaseCredentials, clearSupabaseCredentials, checkSupabaseConnection } from '../lib/supabase';

interface SupabaseConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfigChanged: () => void;
}

export const SupabaseConfigModal: React.FC<SupabaseConfigModalProps> = ({
  isOpen,
  onClose,
  onConfigChanged,
}) => {
  const [url, setUrl] = useState(() => getSupabaseCredentials().url || 'https://umpakazcsoibdlbdyalp.supabase.co');
  const [anonKey, setAnonKey] = useState(() => getSupabaseCredentials().anonKey);
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<{ connected: boolean; message: string; hasSchema?: boolean } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedRedirect, setCopiedRedirect] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'oauth' | 'sql'>('config');

  const projectId = 'umpakazcsoibdlbdyalp';
  const redirectUri = `https://${projectId}.supabase.co/auth/v1/callback`;

  const runHealthCheck = async () => {
    setChecking(true);
    const res = await checkSupabaseConnection();
    setStatus(res);
    setChecking(false);
  };

  useEffect(() => {
    if (isOpen) {
      runHealthCheck();
    }
  }, [isOpen]);

  const handleSave = () => {
    saveSupabaseCredentials(url, anonKey);
    onConfigChanged();
    runHealthCheck();
  };

  const handleClear = () => {
    clearSupabaseCredentials();
    setUrl('https://umpakazcsoibdlbdyalp.supabase.co');
    setAnonKey('');
    onConfigChanged();
    setStatus({
      connected: false,
      message: 'ক্রেডেনশিয়াল মুছে ফেলা হয়েছে। স্থানীয় ডেমো মোড সক্রিয়।'
    });
  };

  const copySqlMigration = () => {
    const sql = `-- ChupiChupi SQL Migration
-- Run this in your Supabase SQL Editor:
-- Available in supabase/schema.sql`;
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopiedRedirect(true);
    setTimeout(() => setCopiedRedirect(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1200 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '640px', padding: '2rem' }}
        id="supabase-config-modal"
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '1rem',
          marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Database size={22} color="#fbbf24" />
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#fdf4ea' }}>
              Supabase ব্যাকএন্ড ও OAuth কনফিগারেশন
            </h3>
          </div>
          <button 
            onClick={onClose}
            id="close-supabase-modal-btn"
            style={{ background: 'transparent', border: 'none', color: '#c4b5a5', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('config')}
            id="modal-tab-config"
            className={`btn ${activeTab === 'config' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            কানেকশন সেটিংস
          </button>
          <button
            onClick={() => setActiveTab('oauth')}
            id="modal-tab-oauth"
            className={`btn ${activeTab === 'oauth' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Globe size={14} />
            <span>Google OAuth সেটআপ</span>
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            id="modal-tab-sql"
            className={`btn ${activeTab === 'sql' ? 'btn-secondary' : 'btn-ghost'}`}
            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
          >
            <Terminal size={14} />
            <span>SQL মাইগ্রেশন</span>
          </button>
        </div>

        {activeTab === 'config' && (
          <div>
            {/* Live Status Card */}
            <div style={{
              padding: '1rem',
              borderRadius: '12px',
              background: status?.connected ? 'rgba(34, 197, 94, 0.1)' : 'rgba(234, 179, 8, 0.1)',
              border: `1px solid ${status?.connected ? 'rgba(34, 197, 94, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem'
            }}>
              {status?.connected ? (
                <CheckCircle2 size={20} color="#4ade80" style={{ marginTop: '2px', flexShrink: 0 }} />
              ) : (
                <AlertTriangle size={20} color="#facc15" style={{ marginTop: '2px', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, fontSize: '0.88rem' }}>
                <div style={{ fontWeight: 600, color: status?.connected ? '#4ade80' : '#facc15', marginBottom: '0.2rem' }}>
                  {status?.connected ? 'Supabase ব্যাকএন্ড সক্রিয়' : 'সরাসরি ব্যাকএন্ড অনুপস্থিত (ডেমো সক্রিয়)'}
                </div>
                <div style={{ color: '#c4b5a5', lineHeight: 1.5 }}>
                  {checking ? 'কানেকশন পরীক্ষা করা হচ্ছে...' : status?.message}
                </div>
              </div>
              <button
                onClick={runHealthCheck}
                disabled={checking}
                className="btn btn-ghost"
                title="পুনরায় পরীক্ষা করুন"
                style={{ padding: '0.4rem', color: '#fbbf24' }}
              >
                <RefreshCw size={15} className={checking ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Inputs */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <LinkIcon size={14} />
                <span>Supabase Project URL</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="https://umpakazcsoibdlbdyalp.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Key size={14} />
                <span>Supabase Anon Public Key (Publishable)</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={anonKey}
                onChange={(e) => setAnonKey(e.target.value)}
              />
              <div style={{ fontSize: '0.75rem', color: '#a8998b', marginTop: '0.35rem', lineHeight: 1.5 }}>
                🔑 Supabase ড্যাশবোর্ডে গিয়ে <strong>Project Settings &gt; API &gt; Project API keys &gt; anon public</strong> কী কপি করে এখানে পেস্ট করুন।
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={handleClear} className="btn btn-ghost" style={{ fontSize: '0.85rem' }}>
                মুছে ফেলুন (Clear)
              </button>
              <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.6rem 1.4rem' }}>
                সংরক্ষণ ও কানেক্ট করুন
              </button>
            </div>
          </div>
        )}

        {activeTab === 'oauth' && (
          <div>
            <div style={{ fontSize: '0.9rem', color: '#c4b5a5', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              <p style={{ marginBottom: '0.75rem', color: '#fdf4ea' }}>
                <strong style={{ color: '#fbbf24' }}>Supabase-এ Google Sign-In চালু করার নিয়ম:</strong>
              </p>
              <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <li>
                  Supabase ড্যাশবোর্ডে প্রবেশ করুন: <br />
                  <a 
                    href="https://supabase.com/dashboard/project/umpakazcsoibdlbdyalp/auth/providers" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    style={{ color: '#fbbf24', textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                  >
                    <span>Authentication &gt; Providers &gt; Google</span>
                    <ExternalLink size={12} />
                  </a>
                </li>
                <li>
                  <strong>Enable Google provider</strong> টগলটি <strong>ON</strong> করুন।
                </li>
                <li>
                  <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" style={{ color: '#f472b6' }}>
                    Google Cloud Console
                  </a> থেকে প্রাপ্ত <strong>Client ID</strong> এবং <strong>Client Secret</strong> বসিয়ে দিন।
                </li>
                <li>
                  Google Cloud Console-এর OAuth Client-এ Authorized Redirect URI হিসেবে নিচের লিঙ্কটি দিন:
                </li>
              </ol>
            </div>

            {/* Redirect URI Box with 1-click copy */}
            <div style={{
              background: '#0a050d',
              borderRadius: '12px',
              padding: '0.85rem 1rem',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem'
            }}>
              <div style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: '#4ade80', wordBreak: 'break-all' }}>
                {redirectUri}
              </div>
              <button
                type="button"
                onClick={copyRedirectUri}
                className="btn btn-secondary"
                style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', flexShrink: 0 }}
              >
                {copiedRedirect ? <Check size={14} color="#4ade80" /> : <Copy size={14} />}
                <span>{copiedRedirect ? 'কপি হয়েছে' : 'কপি URI'}</span>
              </button>
            </div>

            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '10px',
              background: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.25)',
              fontSize: '0.82rem',
              color: '#93c5fd',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <ShieldCheck size={16} style={{ flexShrink: 0 }} />
              <span>Google সাইন-ইন সক্রিয় হলে দর্শনার্থীরা ১-ক্লিকেই তাদের চিঠি বাক্স তৈরি করতে পারবেন।</span>
            </div>
          </div>
        )}

        {activeTab === 'sql' && (
          <div>
            <div style={{ fontSize: '0.88rem', color: '#c4b5a5', lineHeight: 1.6, marginBottom: '1rem' }}>
              <p style={{ marginBottom: '0.75rem' }}>
                আপনার Supabase প্রজেক্টে <strong style={{ color: '#fbbf24' }}>SQL Editor</strong> ওপেন করুন এবং <code style={{ color: '#fca5a5' }}>supabase/schema.sql</code> ফাইলের সম্পূর্ণ কোড চালিয়ে টেবিল, আরএলএস এবং ফাংশন তৈরি করুন:
              </p>
              <ul style={{ paddingLeft: '1.25rem', marginBottom: '1rem', color: '#e2d7ce' }}>
                <li><strong>profiles:</strong> ব্যবহারকারীর প্রোফাইল ও ইউজারনেম</li>
                <li><strong>messages:</strong> গোপন চিঠিসমূহ (শুধুমাত্র প্রাপকের RLS প্রবেশাধিকার)</li>
                <li><strong>message_abuse_metadata:</strong> প্রেরকের গোপনীয়তা বজায় রেখে অপব্যবহার রোধক মেটাডেটা</li>
                <li><strong>submit_anonymous_message:</strong> গেস্ট-ফার্স্ট নিরাপদ RPC ফাংশন</li>
              </ul>
            </div>

            <div style={{
              background: '#0a050d',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              color: '#4ade80',
              maxHeight: '180px',
              overflowY: 'auto',
              marginBottom: '1rem'
            }}>
              -- ফাইলের অবস্থান: supabase/schema.sql<br />
              -- সম্পন্ন স্কিমা, সিকিউরিটি ও RLS পলিসি অন্তর্ভুক্ত আছে।
            </div>

            <button
              onClick={copySqlMigration}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '0.6rem 1rem' }}
            >
              {copiedSql ? <Check size={16} /> : <Copy size={16} />}
              <span>{copiedSql ? 'পাথ কপি হয়েছে!' : 'স্কিমা নির্দেশিকা কপি করুন'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
