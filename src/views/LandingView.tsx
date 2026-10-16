import React, { useState } from 'react';
import { Mail, Send, ShieldCheck, Heart, UserPlus, ArrowRight, Lock, Feather, Sparkles } from 'lucide-react';
import { EnvelopeDemo } from '../components/EnvelopeDemo';
import { QuickSendModal } from '../components/QuickSendModal';

interface LandingViewProps {
  onOpenLetterbox: (username: string) => void;
  onCreateLetterbox: () => void;
  onSignIn?: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onOpenLetterbox,
  onCreateLetterbox,
}) => {
  const [recipientInput, setRecipientInput] = useState('');
  const [inputError, setInputError] = useState('');
  const [isQuickSendOpen, setIsQuickSendOpen] = useState(false);

  const handleStartWriting = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = recipientInput.trim().replace(/^@/, '');
    if (!clean) {
      setInputError('অনুগ্রহ করে প্রাপকের ইউজারনেম লিখুন (e.g. anirban, priya)');
      return;
    }
    setInputError('');
    onOpenLetterbox(clean);
  };

  return (
    <div style={{ paddingTop: '1.5rem' }}>
      {/* Quick Send Recipient Modal */}
      <QuickSendModal
        isOpen={isQuickSendOpen}
        onClose={() => setIsQuickSendOpen(false)}
        onSelectRecipient={onOpenLetterbox}
      />

      {/* Hero Section */}
      <section style={{
        textAlign: 'center',
        padding: '3rem 1rem 4rem',
        position: 'relative'
      }}>
        {/* Floating Bengali Paper Lantern Glow */}
        <div style={{
          position: 'absolute',
          top: '5%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '180px',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
          filter: 'blur(30px)'
        }} />

        {/* Decorative Top Pill */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.45rem 1.25rem',
          background: 'rgba(153, 27, 27, 0.25)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '30px',
          color: '#fbbf24',
          fontSize: '0.88rem',
          fontWeight: 600,
          marginBottom: '1.5rem',
          boxShadow: '0 4px 15px rgba(153, 27, 27, 0.25)'
        }}>
          <Feather size={15} />
          <span>চিঠি লেখার আবহ • ১০০% পরিচয় গোপনীয়তা</span>
        </div>

        {/* Primary Bengali Headline */}
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 'clamp(2.4rem, 5.5vw, 4.4rem)',
          fontWeight: 800,
          color: '#fdf4ea',
          lineHeight: 1.18,
          marginBottom: '1.25rem',
          textShadow: '0 4px 25px rgba(0,0,0,0.85)'
        }}>
          না বলা কথাগুলো পৌঁছে যাক <br />
          <span style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #f59e0b 50%, #ec4899 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            display: 'inline-block'
          }}>
            চুপিচুপি।
          </span>
        </h1>

        {/* Subtitle */}
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: '#c4b5a5',
          maxWidth: '680px',
          margin: '0 auto 2.5rem',
          lineHeight: 1.6
        }}>
          সম্পূর্ণ বেনামে প্রিয়জনকে মনের কথা জানান। কোনো সাইন-আপ বা লগইন ছাড়াই চিঠি পাঠান প্রথম ক্লিকেই।
        </p>

        {/* Primary & Secondary Call to Actions */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          flexWrap: 'wrap',
          marginBottom: '3rem'
        }}>
          {/* Primary CTA - "চিঠি পাঠাও" (Opens Quick Send Modal) */}
          <button
            type="button"
            onClick={() => setIsQuickSendOpen(true)}
            id="hero-primary-send-btn"
            className="btn btn-primary"
            style={{
              padding: '0.95rem 2.2rem',
              fontSize: '1.15rem',
              borderRadius: '16px',
              boxShadow: '0 8px 30px rgba(225, 29, 72, 0.5)'
            }}
          >
            <Mail size={20} />
            <span>চিঠি পাঠাও (Send Anonymous Letter)</span>
          </button>

          {/* Secondary CTA - "আমার চিঠির বাক্স বানাও" */}
          <button
            type="button"
            onClick={onCreateLetterbox}
            id="hero-secondary-create-box-btn"
            className="btn btn-secondary"
            style={{
              padding: '0.95rem 1.8rem',
              fontSize: '1.05rem',
              borderRadius: '16px'
            }}
          >
            <UserPlus size={18} />
            <span>আমার চিঠির বাক্স বানাও</span>
          </button>
        </div>

        {/* Hero Interactive Envelope Demonstration */}
        <div style={{ margin: '1rem auto 3.5rem' }}>
          <EnvelopeDemo onWriteLetter={onOpenLetterbox} />
        </div>

        {/* Direct Letterbox Lookup / Guest Recipient Desk Search */}
        <div id="letter-lookup" className="glass-card" style={{
          maxWidth: '700px',
          margin: '0 auto',
          padding: '2.25rem 2rem',
          border: '1.5px solid rgba(245, 158, 11, 0.35)',
          boxShadow: '0 15px 45px rgba(0,0,0,0.7)',
          textAlign: 'left'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            marginBottom: '0.5rem',
            color: '#fbbf24',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            <Send size={16} />
            <span>কাকে চিঠি পাঠাতে চান?</span>
          </div>

          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.4rem',
            color: '#fdf4ea',
            marginBottom: '1rem'
          }}>
            প্রাপকের চিঠির বাক্সে প্রবেশ করুন
          </h3>

          <form onSubmit={handleStartWriting} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 280px', position: 'relative' }}>
              <input
                type="text"
                id="recipient-username-input"
                className="form-input"
                placeholder="ইউজারনেম লিখুন (যেমন: anirban, priya, aditi...)"
                value={recipientInput}
                onChange={(e) => {
                  setRecipientInput(e.target.value);
                  if (inputError) setInputError('');
                }}
                style={{
                  paddingLeft: '2.5rem',
                  fontSize: '1rem',
                  background: 'rgba(10, 5, 13, 0.9)'
                }}
              />
              <span style={{
                position: 'absolute',
                left: '1rem',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#f59e0b',
                fontWeight: 600
              }}>
                @
              </span>
            </div>

            <button
              type="submit"
              id="open-letterbox-submit-btn"
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.6rem', flexShrink: 0 }}
            >
              <span>চিঠি লিখুন</span>
              <ArrowRight size={16} />
            </button>
          </form>

          {inputError && (
            <div style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '0.5rem' }}>
              {inputError}
            </div>
          )}

          {/* Featured Sample Letterbox Cards with avatars and click handlers */}
          <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{
              fontSize: '0.82rem',
              color: '#a8998b',
              marginBottom: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem'
            }}>
              <Sparkles size={14} color="#fbbf24" />
              <span>নমুনা প্রাপক নির্বাচন করে সরাসরি চিঠি লিখুন:</span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
              gap: '0.75rem'
            }}>
              {[
                { username: 'anirban', name: 'অনির্বাণ মুখোপাধ্যায়', role: 'সাহিত্য ও আবৃত্তি' },
                { username: 'priya', name: 'প্রিয়া সেনগুপ্ত', role: 'চা ও বৃষ্টির গল্প' },
                { username: 'tashfeen', name: 'তাশফীন রহমান', role: 'ফটোগ্রাফি ও ভ্রমণ 🌿' },
              ].map((person) => (
                <div
                  key={person.username}
                  onClick={() => onOpenLetterbox(person.username)}
                  id={`featured-card-${person.username}`}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: '12px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#fbbf24';
                    e.currentTarget.style.background = 'rgba(245, 158, 11, 0.1)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: '#be123c',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    flexShrink: 0
                  }}>
                    {person.name.charAt(0)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.86rem', fontWeight: 600, color: '#fdf4ea', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      @{person.username}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#a8998b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {person.role}
                    </div>
                  </div>
                  <ArrowRight size={14} color="#fbbf24" style={{ flexShrink: 0 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Visual Showcase Section - Postcard & Story Card */}
      <section style={{
        padding: '3rem 0 4rem',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          alignItems: 'center'
        }}>
          {/* Bengali Postcard Aesthetic Feature */}
          <div className="glass-card" style={{
            padding: '1.75rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <img
              src="/assets/chupichupi_hero_bg.jpg"
              alt="Vintage Bengali Letter Aesthetic"
              style={{
                width: '100%',
                height: '240px',
                objectFit: 'cover',
                borderRadius: '14px',
                marginBottom: '1.25rem',
                border: '1px solid var(--border-subtle)'
              }}
            />
            <div className="postage-stamp" style={{ marginBottom: '0.75rem' }}>
              ডাকটিকিট ও সীলমোহর
            </div>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.4rem',
              color: '#fdf4ea',
              marginBottom: '0.6rem'
            }}>
              বাঙালির চিঠি লেখার নস্টালজিয়া
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#c4b5a5', lineHeight: 1.6, marginBottom: '1rem' }}>
              লাল মোমের সীলমোহর, খামের ভাঁজ ও কাঁচা হাতের লেখার আদলে তৈরি চিঠির প্যাড। মনের গভীরের কথাগুলো ফুটে উঠুক সম্পূর্ণ গোপনীয়তায়।
            </p>
            <button
              type="button"
              onClick={() => onOpenLetterbox('anirban')}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}
            >
              <span>নমুনা চিঠি দেখে আসুন</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Social Story Sticker Feature (like NGL / VibeBox) */}
          <div className="glass-card" style={{
            padding: '1.75rem',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <img
              src="/assets/letter_story_card.jpg"
              alt="Social Story Card Generator"
              style={{
                width: '100%',
                height: '240px',
                objectFit: 'cover',
                borderRadius: '14px',
                marginBottom: '1.25rem',
                border: '1px solid var(--border-subtle)'
              }}
            />
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              background: 'rgba(236, 72, 153, 0.15)',
              color: '#f472b6',
              padding: '0.2rem 0.6rem',
              borderRadius: '12px',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginBottom: '0.75rem'
            }}>
              <Sparkles size={12} />
              <span>Instagram & WhatsApp Story</span>
            </div>
            <h3 style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.4rem',
              color: '#fdf4ea',
              marginBottom: '0.6rem'
            }}>
              স্টোরি কার্ড দিয়ে চিঠি সংগ্রহ করুন
            </h3>
            <p style={{ fontSize: '0.92rem', color: '#c4b5a5', lineHeight: 1.6, marginBottom: '1rem' }}>
              নিজের ব্যক্তিগত লিঙ্ক দিয়ে এক ক্লিকে দৃষ্টিনন্দন স্টোরি কার্ড তৈরি ও ডাউনলোড করুন। বন্ধুদের কাছে সরাসরি গোপন চিঠি আহ্বান করুন!
            </p>
            <button
              type="button"
              onClick={onCreateLetterbox}
              className="btn btn-secondary"
              style={{ padding: '0.55rem 1.1rem', fontSize: '0.88rem' }}
            >
              <span>নিজের স্টোরি কার্ড বানাব</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </section>

      {/* 4 Pillars of ChupiChupi */}
      <section style={{
        padding: '2rem 0 4rem',
        maxWidth: '1100px',
        margin: '0 auto'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', color: '#fdf4ea', marginBottom: '0.5rem' }}>
            কেন চুপিচুপি সেরা?
          </h2>
          <p style={{ color: '#a8998b', fontSize: '1rem' }}>
            নিরাপত্তা, গোপনীয়তা এবং আন্তরিকতার এক অপূর্ব মেলবন্ধন
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '1.5rem'
        }}>
          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <ShieldCheck size={24} />
            </div>
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: '#fdf4ea', marginBottom: '0.5rem' }}>
              ১০০% পরিচয় গোপন
            </h4>
            <p style={{ fontSize: '0.88rem', color: '#c4b5a5', lineHeight: 1.5 }}>
              প্রাপক কখনো আপনার নাম, ইমেইল বা পরিচয় জানতে পারবে না। আপনি কি লিখেছেন কেবল সেটাই দেখতে পাবে।
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Mail size={24} />
            </div>
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: '#fdf4ea', marginBottom: '0.5rem' }}>
              গেস্ট-ফার্স্ট অভিজ্ঞতা
            </h4>
            <p style={{ fontSize: '0.88rem', color: '#c4b5a5', lineHeight: 1.5 }}>
              চিঠি পাঠাতে কোনো অ্যাকাউন্ট খোলার বাধ্যবাধকতা নেই। শুধু লিঙ্ক ওপেন করুন আর লিখে পাঠিয়ে দিন।
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(236, 72, 153, 0.15)',
              color: '#ec4899',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Heart size={24} />
            </div>
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: '#fdf4ea', marginBottom: '0.5rem' }}>
              অনুভূতির সাতটি বিভাগ
            </h4>
            <p style={{ fontSize: '0.88rem', color: '#c4b5a5', lineHeight: 1.5 }}>
              গোপন কথা, মনের অনুভূতি, মিষ্টি প্রশংসা, খুনসুটি কিংবা সদ্বিবেচনাপূর্ণ পরামর্শ—যথাযথ ক্যাটাগরি বেছে নিন।
            </p>
          </div>

          <div className="glass-card" style={{ padding: '1.75rem' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#3b82f6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem'
            }}>
              <Lock size={24} />
            </div>
            <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', color: '#fdf4ea', marginBottom: '0.5rem' }}>
              ব্যক্তিগত ইনবক্স সুরক্ষা
            </h4>
            <p style={{ fontSize: '0.88rem', color: '#c4b5a5', lineHeight: 1.5 }}>
              আধুনিক ক্রিপ্টোগ্রাফিক সুরক্ষা নিশ্চিত করে যে আপনার ইনবক্স কেবল আপনি ছাড়া অন্য কেউ কখনো দেখতে পারবে না।
            </p>
          </div>
        </div>
      </section>

      {/* Footer Call to Action */}
      <section style={{
        textAlign: 'center',
        padding: '3rem 1.5rem',
        background: 'linear-gradient(180deg, transparent 0%, rgba(153, 27, 27, 0.18) 100%)',
        borderRadius: '24px',
        border: '1px solid var(--border-subtle)',
        marginTop: '2rem'
      }}>
        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.8rem',
          color: '#fdf4ea',
          marginBottom: '0.75rem'
        }}>
          তুমিও কি নিজের একটি গোপন চিঠি বাক্স চাও?
        </h3>
        <p style={{ color: '#c4b5a5', maxWidth: '520px', margin: '0 auto 1.5rem' }}>
          মাত্র ৩০ সেকেন্ডে তৈরি করে নিন আপনার নিজস্ব চিঠি বাক্স এবং গ্রহণ করুন বন্ধুদের মিষ্টি সব বার্তা।
        </p>
        <button
          type="button"
          onClick={onCreateLetterbox}
          id="footer-create-letterbox-btn"
          className="btn btn-primary"
          style={{ padding: '0.9rem 2.2rem', fontSize: '1.05rem', borderRadius: '14px' }}
        >
          <UserPlus size={18} />
          <span>আমার চিঠির বাক্স বানাও (বিনামূল্যে)</span>
        </button>
      </section>
    </div>
  );
};
