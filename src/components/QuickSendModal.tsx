import React, { useState } from 'react';
import { X, Send, ArrowRight, Sparkles } from 'lucide-react';

interface QuickSendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRecipient: (username: string) => void;
}

export const QuickSendModal: React.FC<QuickSendModalProps> = ({
  isOpen,
  onClose,
  onSelectRecipient,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputVal.trim().replace(/^@/, '');
    if (!clean) {
      setError('অনুগ্রহ করে প্রাপকের ইউজারনেম লিখুন (যেমন: anirban, priya)');
      return;
    }
    setError('');
    onSelectRecipient(clean);
    onClose();
  };

  const handlePick = (username: string) => {
    onSelectRecipient(username);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '520px', padding: '2rem' }}
        id="quick-send-modal"
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
            <div className="wax-seal" style={{ width: '36px', height: '36px', fontSize: '0.8rem' }}>
              চিঠি
            </div>
            <div>
              <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#fdf4ea', lineHeight: 1.2 }}>
                কাকে চিঠি পাঠাতে চান?
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#a8998b' }}>
                প্রাপকের ইউজারনেম দিয়ে তাঁর গোপন চিঠি বাক্স খুলুন
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            id="close-quick-send-modal-btn"
            style={{ background: 'transparent', border: 'none', color: '#c4b5a5', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '1.5rem' }}>
          <div className="form-group" style={{ marginBottom: '0.75rem' }}>
            <label className="form-label">প্রাপকের ইউজারনেম লিখুন</label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                id="quick-send-username-input"
                className="form-input"
                placeholder="যেমন: anirban, priya, aditi..."
                value={inputVal}
                onChange={(e) => {
                  setInputVal(e.target.value);
                  if (error) setError('');
                }}
                autoFocus
                style={{ paddingLeft: '2.5rem', fontSize: '1rem' }}
              />
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#fbbf24',
                fontWeight: 600
              }}>
                @
              </span>
            </div>
            {error && (
              <div style={{ color: '#f87171', fontSize: '0.82rem', marginTop: '0.35rem' }}>
                {error}
              </div>
            )}
          </div>

          <button
            type="submit"
            id="quick-send-submit-btn"
            className="btn btn-primary"
            style={{ width: '100%', padding: '0.75rem', fontSize: '1rem' }}
          >
            <Send size={16} />
            <span>চিঠির বাক্স ওপেন করুন</span>
          </button>
        </form>

        {/* Community Sample Letterboxes */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
          <div style={{
            fontSize: '0.82rem',
            color: '#fbbf24',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            marginBottom: '0.75rem'
          }}>
            <Sparkles size={14} />
            <span>জনপ্রিয় কমিউনিটি চিঠি বাক্সসমূহ:</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[
              { username: 'anirban', name: 'অনির্বাণ মুখোপাধ্যায়', prompt: 'আমাকে তোমার গোপন মনের কথা বলো... 🤫', theme: 'vintage_burgundy' },
              { username: 'priya', name: 'প্রিয়া সেনগুপ্ত', prompt: 'কোনো মধুর স্মৃতি বা মিষ্টি প্রশংসা পাঠাতে পারো ✨', theme: 'emerald_green' },
              { username: 'tashfeen', name: 'তাশফীন রহমান', prompt: 'কোনো ভালোলাগা বা গোপন কথা থাকলে লিখুন 📬', theme: 'vintage_burgundy' },
            ].map((user) => (
              <div
                key={user.username}
                onClick={() => handlePick(user.username)}
                id={`quick-pick-${user.username}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.4)';
                  e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: '#991b1b',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: '1px solid #fbbf24'
                  }}>
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#fdf4ea' }}>
                      {user.name} <span style={{ color: '#fbbf24', fontSize: '0.8rem', fontWeight: 400 }}>@{user.username}</span>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#a8998b' }}>
                      {user.prompt}
                    </div>
                  </div>
                </div>
                <ArrowRight size={16} color="#fbbf24" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
