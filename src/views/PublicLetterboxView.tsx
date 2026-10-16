import React, { useState, useEffect } from 'react';
import { Send, Shield, AlertCircle, ArrowLeft, UserX, PauseCircle, Sparkles, RotateCcw } from 'lucide-react';
import { CATEGORIES } from '../types/database';
import type { MessageCategory, Profile } from '../types/database';
import { getPublicProfile, sendAnonymousLetter } from '../lib/letterApi';
import { DeliveryAnimation } from '../components/DeliveryAnimation';

const PROMPT_STARTERS: Record<MessageCategory, string[]> = {
  secret: [
    'তুমি হয়তো কখনোই জানতে পারবে না...',
    'প্রথম যেদিন তোমাকে দেখেছিলাম...',
    'একটি গোপন সত্য আজ অকপটে বলতে চাই...'
  ],
  confession: [
    'হৃদয়ের গভীর থেকে বলছি...',
    'তোমার সাথে কথা বললে মন শান্ত হয়ে যায়...',
    'কখনো সরাসরি বলতে পারিনি...'
  ],
  compliment: [
    'তোমার মিষ্টি হাসিটায় এক অদ্ভুত মায়া আছে...',
    'তোমার একাগ্রতা ও কথা বলার ধরন সত্যিই সুন্দর...',
    'তুমি মানুষ হিসেবে সত্যিই অতুলনীয়...'
  ],
  fun: [
    'তোমার সেই মজার কাণ্ডটা আজও মনে পড়ে! 😂',
    'এত গম্ভীর সেজে থাকো কেন বলো তো...',
    'একদিন তোমাকে একটা বড় চমক দেব!'
  ],
  advice: [
    'নিজের স্বাস্থ্যের প্রতি একটু বেশি যত্ন নিও...',
    'অন্যের কথায় কান না দিয়ে নিজের লক্ষ্যে অবিচল থেকো...',
    'কাজের মাঝে মাঝে একটু বিশ্রাম নেওয়া খুব জরুরি...'
  ],
  friendship: [
    'তোমার মতো একজন ভালো বন্ধু পাওয়া ভাগ্যের ব্যাপার...',
    'দূরত্ব যতই হোক, বন্ধুত্ব সবসময় অম্লান থাকবে...',
    'যেকোনো প্রয়োজনে নির্দ্বিধায় আমাকে পাশে পাবে...'
  ],
  other: [
    'অনেকদিন ধরে ভাবছিলাম তোমাকে একটি চিঠি লিখব...',
    'কেমন আছো? আশা করি সব ভালো কাটছে...'
  ]
};

interface PublicLetterboxViewProps {
  username: string;
  onBackToHome: () => void;
  onCreateLetterbox: () => void;
  onSignIn: () => void;
}

export const PublicLetterboxView: React.FC<PublicLetterboxViewProps> = ({
  username,
  onBackToHome,
  onCreateLetterbox,
  onSignIn,
}) => {
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [, setIsRealBackend] = useState(false);

  // Letter Form State
  const [currentDate] = useState(() => new Date().toLocaleDateString('bn-BD'));
  const [category, setCategory] = useState<MessageCategory>('secret');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDelivered, setIsDelivered] = useState(false);

  const loadRecipient = async () => {
    setLoadingProfile(true);
    setProfileError(null);
    setIsDelivered(false);

    const res = await getPublicProfile(username);
    setIsRealBackend(res.isRealBackend);

    if (res.error || !res.profile) {
      setProfileError(res.error || 'প্রাপক খুঁজে পাওয়া যায়নি');
      setProfile(null);
    } else {
      setProfile(res.profile);
      document.title = `${res.profile.display_name} (@${res.profile.username}) — চুপিচুপি চিঠি বক্স 🤫`;
    }
    setLoadingProfile(false);
  };

  useEffect(() => {
    loadRecipient();
    return () => {
      document.title = 'চুপিচুপি (ChupiChupi) — বেনামী চিঠি ও মনের কথা আদান-প্রদান';
    };
  }, [username]);

  const handleSendLetter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const trimmed = content.trim();
    if (!trimmed) {
      setSubmitError('অনুগ্রহ করে চিঠিতে কিছু লিখুন (চিঠি ফাঁকা রাখা যাবে না)');
      return;
    }

    if (trimmed.length > 1000) {
      setSubmitError(`চিঠি সর্বোচ্চ ১০০০ অক্ষরের হতে পারে। আপনি ${trimmed.length} অক্ষর লিখেছেন।`);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const res = await sendAnonymousLetter({
      recipient_username: username,
      category,
      content: trimmed,
    });

    setIsSubmitting(false);

    if (res.success) {
      // Backend storage succeeded! Now show delivery animation
      setIsDelivered(true);
    } else {
      setSubmitError(res.error || 'চিঠি পাঠানো সম্ভব হয়নি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।');
    }
  };

  // If letter has been delivered successfully, display delivery animation & invitation
  if (isDelivered) {
    return (
      <DeliveryAnimation
        recipientUsername={profile?.username || username}
        onSendAnother={() => {
          setContent('');
          setIsDelivered(false);
          setSubmitError(null);
        }}
        onCreateLetterbox={onCreateLetterbox}
        onSignIn={onSignIn}
      />
    );
  }

  // Loading profile state
  if (loadingProfile) {
    return (
      <div style={{ textAlign: 'center', padding: '5rem 1rem' }}>
        <div className="wax-seal animate-glow" style={{ width: '56px', height: '56px', margin: '0 auto 1.5rem' }}>
          খাম
        </div>
        <p style={{ color: '#c4b5a5', fontFamily: 'var(--font-serif)', fontSize: '1.2rem' }}>
          চিঠির বাক্স খোলা হচ্ছে...
        </p>
      </div>
    );
  }

  // Profile not found state
  if (profileError || !profile) {
    return (
      <div className="glass-card" style={{ maxWidth: '520px', margin: '3rem auto', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(239, 68, 68, 0.15)',
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem'
        }}>
          <UserX size={32} />
        </div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: '#fdf4ea', marginBottom: '0.75rem' }}>
          চিঠির বাক্স পাওয়া যায়নি
        </h3>
        <p style={{ color: '#c4b5a5', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
          <strong style={{ color: '#fbbf24' }}>@{username}</strong> নামে কোনো সক্রিয় চিঠি বাক্স খুঁজে পাওয়া যায়নি। ইউজারনেম সঠিক কিনা পরীক্ষা করুন।
        </p>
        <button onClick={onBackToHome} className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
          <ArrowLeft size={16} />
          <span>নীড়ে ফিরে যান</span>
        </button>
      </div>
    );
  }

  // Inbox paused state
  if (profile.inbox_paused) {
    return (
      <div className="glass-card" style={{ maxWidth: '540px', margin: '3rem auto', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <div style={{
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem'
        }}>
          <PauseCircle size={32} />
        </div>
        <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: '#fdf4ea', marginBottom: '0.75rem' }}>
          চিঠি বাক্স সাময়িকভাবে বন্ধ আছে
        </h3>
        <p style={{ color: '#c4b5a5', fontSize: '0.95rem', marginBottom: '1.75rem' }}>
          <strong style={{ color: '#fbbf24' }}>@{profile.username}</strong> বর্তমানে কোনো নতুন চিঠি গ্রহণ করছেন না। কিছুক্ষণ পর আবার চেষ্টা করুন।
        </p>
        <button onClick={onBackToHome} className="btn btn-secondary" style={{ padding: '0.75rem 1.5rem' }}>
          <ArrowLeft size={16} />
          <span>অন্য কাউকে চিঠি লিখুন</span>
        </button>
      </div>
    );
  }

  const selectedCategoryMeta = CATEGORIES[category];

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', paddingTop: '1rem' }} id="public-letterbox-container">
      {/* Back button */}
      <div style={{ marginBottom: '1.25rem' }}>
        <button 
          onClick={onBackToHome}
          id="back-to-home-btn"
          className="btn btn-ghost"
          style={{ padding: '0.45rem 0.85rem', fontSize: '0.88rem' }}
        >
          <ArrowLeft size={15} />
          <span>নীড়ে ফিরুন</span>
        </button>
      </div>

      {/* Recipient Profile Header Card */}
      <div className="glass-card" style={{
        padding: '1.75rem',
        marginBottom: '1.5rem',
        border: '1.5px solid rgba(245, 158, 11, 0.3)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Postal Stamp Badge */}
        <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem' }}>
          <div className="postage-stamp">
            ডাকঘর সীল
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {/* Avatar / Monogram */}
          <div style={{
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #be123c 0%, #701a2d 100%)',
            border: '2px solid #fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'var(--font-serif)',
            fontSize: '1.5rem',
            fontWeight: 700,
            boxShadow: '0 4px 15px rgba(190, 18, 60, 0.4)'
          }}>
            {profile.display_name.charAt(0)}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', color: '#fdf4ea', lineHeight: 1.2 }}>
                {profile.display_name}
              </h2>
              <span style={{ fontSize: '0.85rem', color: '#fbbf24', fontWeight: 600 }}>
                @{profile.username}
              </span>
            </div>

            {profile.bio && (
              <p style={{ fontSize: '0.88rem', color: '#a8998b', marginTop: '0.25rem' }}>
                {profile.bio}
              </p>
            )}
          </div>
        </div>

        {/* Personalized Letterbox Prompt */}
        <div style={{
          marginTop: '1.25rem',
          padding: '0.9rem 1.25rem',
          background: 'rgba(15, 8, 20, 0.8)',
          borderRadius: '12px',
          borderLeft: '4px solid #f59e0b'
        }}>
          <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            প্রাপকের আহ্বান:
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', color: '#fdf4ea', marginTop: '0.2rem' }}>
            "{profile.prompt || 'আমাকে তোমার গোপন মনের কথা বলো... 🤫'}"
          </div>
        </div>
      </div>

      {/* Main Letter Composition Desk */}
      <form onSubmit={handleSendLetter}>
        {/* Category Selector Chips */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.88rem', color: '#c4b5a5', marginBottom: '0.6rem', fontWeight: 500 }}>
            চিঠির বিষয় বা অনুভূতি নির্বাচন করুন:
          </label>
          <div style={{
            display: 'flex',
            gap: '0.5rem',
            flexWrap: 'wrap'
          }} id="category-selector-group">
            {(Object.keys(CATEGORIES) as MessageCategory[]).map((catKey) => {
              const cat = CATEGORIES[catKey];
              const isSelected = category === catKey;
              return (
                <button
                  type="button"
                  key={catKey}
                  onClick={() => setCategory(catKey)}
                  id={`cat-btn-${catKey}`}
                  className="badge"
                  style={{
                    padding: '0.5rem 0.9rem',
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    background: isSelected ? cat.badgeBg : 'rgba(255, 255, 255, 0.05)',
                    border: `1.5px solid ${isSelected ? cat.badgeColor : 'rgba(255, 255, 255, 0.1)'}`,
                    color: isSelected ? '#ffffff' : '#c4b5a5',
                    fontWeight: isSelected ? 600 : 400,
                    transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                    boxShadow: isSelected ? `0 0 12px ${cat.badgeColor}40` : 'none',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.labelBn}</span>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#a8998b', marginTop: '0.4rem', fontStyle: 'italic', marginBottom: '0.75rem' }}>
            {selectedCategoryMeta.descriptionBn}
          </div>

          {/* Prompt Starters */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '12px',
            padding: '0.75rem 1rem',
            border: '1px dashed var(--border-subtle)',
            marginBottom: '1rem'
          }}>
            <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.4rem' }}>
              <Sparkles size={13} />
              <span>অনুপ্রেরণামূলক শুরুয়াত (ট্যাপ করে চিঠিতে যোগ করুন):</span>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {(PROMPT_STARTERS[category] || []).map((starter, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => {
                    setContent((prev) => prev ? `${prev} ${starter}` : `${starter} `);
                    if (submitError) setSubmitError(null);
                  }}
                  className="badge"
                  style={{
                    background: 'rgba(245, 158, 11, 0.1)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    color: '#fdf4ea',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    padding: '0.3rem 0.65rem'
                  }}
                >
                  + {starter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Parchment Letter Paper Desk */}
        <div className="parchment-sheet" style={{
          marginBottom: '1.25rem',
          position: 'relative'
        }} id="letter-writing-pad">
          {/* Top greeting on parchment */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.75rem',
            paddingBottom: '0.4rem',
            borderBottom: '1px solid rgba(180, 58, 43, 0.25)',
            fontSize: '0.88rem',
            fontFamily: 'var(--font-serif)',
            color: '#701a2d',
            fontWeight: 600
          }}>
            <span>শ্রদ্ধাস্পদেষু @{profile.username},</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {content && (
                <button
                  type="button"
                  onClick={() => setContent('')}
                  title="খসড়া চিঠি মুছে ফেলুন"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#991b1b',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.2rem'
                  }}
                >
                  <RotateCcw size={12} />
                  <span>মুছুন</span>
                </button>
              )}
              <span style={{ fontSize: '0.78rem', color: '#8c6b58', fontWeight: 400 }}>
                তারিখ: {currentDate}
              </span>
            </div>
          </div>

          {/* Letter Textarea */}
          <textarea
            id="anonymous-letter-textarea"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              if (submitError) setSubmitError(null);
            }}
            placeholder="এখানে তোমার না-বলা মনের কথাটি লিখে ফেলো... কোনো সংকোচ ছাড়াই। প্রাপক জানবে না কে পাঠিয়েছে।"
            style={{
              width: '100%',
              minHeight: '220px',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontFamily: 'var(--font-serif)',
              fontSize: '1.1rem',
              color: '#1a0e0a',
              lineHeight: '32px',
              resize: 'vertical'
            }}
            maxLength={1000}
            disabled={isSubmitting}
          />

          {/* Bottom character counter & sign-off */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.75rem',
            paddingTop: '0.5rem',
            borderTop: '1px dashed rgba(180, 58, 43, 0.25)',
            fontSize: '0.82rem',
            color: '#78350f'
          }}>
            <span style={{ fontStyle: 'italic' }}>— এক গোপন শুভাকাঙ্ক্ষী</span>
            <span id="char-counter" style={{
              fontWeight: 600,
              color: content.length > 900 ? '#dc2626' : '#78350f'
            }}>
              {content.length}/১০০০ অক্ষর
            </span>
          </div>
        </div>

        {/* Privacy Reassurance Banner */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '0.9rem 1.1rem',
          borderRadius: '12px',
          background: 'rgba(15, 8, 20, 0.65)',
          border: '1px solid var(--border-subtle)',
          marginBottom: '1.5rem',
          fontSize: '0.85rem',
          color: '#c4b5a5'
        }}>
          <Shield size={18} color="#4ade80" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#fdf4ea' }}>সম্পূর্ণ বেনামী নিশ্চয়তা:</strong>{' '}
            প্রাপক আপনার আইপি, ইমেইল, অথবা পরিচয় কোনোভাবেই দেখতে পাবেন না। চিঠি পাঠাতে কোনো অ্যাকাউন্ট বা লগইন করার প্রয়োজন নেই।
          </div>
        </div>

        {/* Error Message */}
        {submitError && (
          <div style={{
            padding: '0.85rem 1.1rem',
            borderRadius: '12px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#fca5a5',
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }} id="submission-error-alert">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{submitError}</span>
          </div>
        )}

        {/* Primary Action Button - "চিঠি পাঠাও" */}
        <div style={{ textAlign: 'center' }}>
          <button
            type="submit"
            id="send-letter-submit-btn"
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.95rem 1.5rem',
              fontSize: '1.15rem',
              borderRadius: '14px',
              opacity: isSubmitting ? 0.7 : 1,
              cursor: isSubmitting ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? (
              <>
                <span className="wax-seal" style={{ width: '24px', height: '24px', fontSize: '0.6rem' }}>...</span>
                <span>চিঠি পাঠানো হচ্ছে...</span>
              </>
            ) : (
              <>
                <Send size={18} />
                <span>চিঠি পাঠাও (Send Anonymous Letter)</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
