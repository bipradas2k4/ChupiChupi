import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, Heart, Eye, ArrowRight, RotateCcw } from 'lucide-react';

interface EnvelopeDemoProps {
  onWriteLetter?: (username: string) => void;
}

const DEMO_LETTERS = [
  {
    id: 1,
    title: 'গোপন কথা • না বলা প্রেম',
    recipient: 'aditi',
    sender: 'এক গোপন শুভাকাঙ্ক্ষী 🤫',
    content: 'প্রিয় অদিতি, তুমি হয়তো কখনো জানবে না এই চিঠিটা কার... তবে জেনে রাখো, ক্যাম্পাসের লাইব্রেরিতে যেদিন তুমি বই ফেরত দিতে গিয়ে হেসেছিলে, সেদিন থেকেই তোমার এই স্নিগ্ধ হাসিটায় একটা মায়া খুঁজে পাই। খুব ভালো থেকো।',
    category: 'গোপন কথা',
    postmark: 'ঢাকা জিপিও • ১৫ আগস্ট',
    reaction: '❤️'
  },
  {
    id: 2,
    title: 'কৃতজ্ঞতা ও অনুপ্রেরণা',
    recipient: 'anirban',
    sender: 'অপরিচিত শুভাকাঙ্ক্ষী ✨',
    content: 'অনির্বাণ দা, তোমার প্রতিটি আবৃত্তি ও লেখা আমার মতো অনেক তরুণকে নতুন করে বাঁচতে শেখায়। যখন খুব হতাশ থাকি, তোমার কণ্ঠস্বর সাহস জোগায়। দূর থেকেই এই সম্মান আর ভালোবাসাটুকু জানিয়ে রাখলাম।',
    category: 'মিষ্টি প্রশংসা',
    postmark: 'কোলকাতা ডাকঘর • ৫ সেপ্টেম্বর',
    reaction: '🌸'
  },
  {
    id: 3,
    title: 'মজার স্মৃতি ও খুনসুটি',
    recipient: 'priya',
    sender: 'পেছনের বেঞ্চের কেউ 😂',
    content: 'প্রিয়া, ক্লাসের সময় লুকিয়ে আচার খাওয়ার সময় তোমার মুখের ভঙ্গিটা আজও চোখে ভাসে! এত গম্ভীর ভাব ধরে থাকো কিন্তু আসলে তুমি যে কতটা চঞ্চল তা আমরা সবাই জানি। হাহা ভালো থেকো!',
    category: 'মজার কথা',
    postmark: 'চট্টগ্রাম সদর ডাকঘর • ১২ জুলাই',
    reaction: '😂'
  }
];

export const EnvelopeDemo: React.FC<EnvelopeDemoProps> = ({ onWriteLetter }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeLetterIdx, setActiveLetterIdx] = useState(0);
  const [reacted, setReacted] = useState(false);

  const activeLetter = DEMO_LETTERS[activeLetterIdx];

  const handleReactDemo = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.65 },
        colors: ['#dc2626', '#f59e0b', '#ec4899', '#fef08a']
      });
    } catch {
      // ignore
    }
    setReacted(true);
    setTimeout(() => setReacted(false), 2000);
  };

  const nextLetter = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveLetterIdx((prev) => (prev + 1) % DEMO_LETTERS.length);
  };

  return (
    <div style={{
      maxWidth: '520px',
      margin: '0 auto',
      position: 'relative',
      perspective: '1200px'
    }}>
      {/* Top Banner Notice with interactive sample switcher */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        flexWrap: 'wrap',
        marginBottom: '1rem'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          padding: '0.35rem 0.85rem',
          background: 'rgba(245, 158, 11, 0.12)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '20px',
          color: '#fbbf24',
          fontSize: '0.82rem'
        }}>
          <Sparkles size={14} />
          <span>নমুনা খাম (Fictional Demo) — খামটি ছুঁয়ে দেখুন</span>
        </div>

        {isOpen && (
          <button
            type="button"
            onClick={nextLetter}
            className="badge"
            style={{
              background: 'rgba(236, 72, 153, 0.15)',
              border: '1px solid rgba(236, 72, 153, 0.35)',
              color: '#f472b6',
              cursor: 'pointer',
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem'
            }}
          >
            <RotateCcw size={12} />
            <span>অন্য নমুনা চিঠি পড়ুন ({activeLetterIdx + 1}/{DEMO_LETTERS.length})</span>
          </button>
        )}
      </div>

      {/* 3D Envelope Wrapper */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'relative',
          width: '100%',
          minHeight: isOpen ? '460px' : '260px',
          background: 'linear-gradient(145deg, #701a2d 0%, #4a0d1b 100%)',
          borderRadius: '18px',
          border: '1.5px solid rgba(245, 158, 11, 0.35)',
          boxShadow: '0 20px 45px rgba(0,0,0,0.65), 0 0 30px rgba(153, 27, 27, 0.25)',
          cursor: 'pointer',
          padding: '1.25rem',
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden'
        }}
        id="demo-envelope-card"
      >
        {/* Vintage postal stamp top right */}
        <div style={{
          position: 'absolute',
          top: '1rem',
          right: '1rem',
          zIndex: 5
        }}>
          <div className="postage-stamp">
            ডাকঘর ৳৫
          </div>
        </div>

        {/* Envelope Flap Accent / Diagonal fold lines */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '110px',
          background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.08) 0%, transparent 100%)',
          borderBottom: '1px dashed rgba(245, 158, 11, 0.2)',
          clipPath: isOpen ? 'polygon(0 0, 50% 15%, 100% 0)' : 'polygon(0 0, 50% 100%, 100% 0)',
          transition: 'clip-path 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          zIndex: 4
        }} />

        {/* Wax Seal Center */}
        <div style={{
          position: 'absolute',
          top: isOpen ? '15px' : '90px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
          transition: 'top 0.4s ease, transform 0.4s ease'
        }}>
          <div className="wax-seal" style={{ width: '54px', height: '54px', fontSize: '1.05rem' }}>
            চুপি
          </div>
        </div>

        {/* Inside Letter Content (Sliding up when open) */}
        <div style={{
          marginTop: isOpen ? '4.8rem' : '7.5rem',
          opacity: isOpen ? 1 : 0.4,
          transform: isOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.96)',
          transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
          zIndex: 3
        }}>
          {isOpen ? (
            <div className="parchment-sheet" style={{
              background: '#fcf8ec',
              borderRadius: '12px',
              padding: '1.25rem 1.5rem',
              color: '#1f1412',
              boxShadow: '0 8px 25px rgba(0,0,0,0.35)',
              textAlign: 'left'
            }}>
              {/* Letter Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '1px solid rgba(180, 58, 43, 0.2)',
                paddingBottom: '0.5rem',
                marginBottom: '0.75rem'
              }}>
                <span style={{
                  fontSize: '0.82rem',
                  fontFamily: 'var(--font-serif)',
                  fontWeight: 600,
                  color: '#991b1b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}>
                  <Heart size={14} fill="#991b1b" /> {activeLetter.title}
                </span>
                <span style={{ fontSize: '0.75rem', color: '#78350f' }}>
                  {activeLetter.postmark}
                </span>
              </div>

              {/* Letter Text */}
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.05rem',
                lineHeight: '1.75',
                color: '#291711',
                fontStyle: 'italic',
                marginBottom: '1rem'
              }}>
                "{activeLetter.content}"
              </p>

              {/* Letter Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.82rem',
                color: '#8c6b58',
                borderTop: '1px dashed rgba(180, 58, 43, 0.2)',
                paddingTop: '0.6rem',
                marginBottom: '0.75rem'
              }}>
                <span>প্রাপক: <strong>@{activeLetter.recipient}</strong></span>
                <span style={{ fontWeight: 600, color: '#991b1b' }}>— {activeLetter.sender}</span>
              </div>

              {/* Interactive Buttons inside Demo */}
              <div style={{
                display: 'flex',
                gap: '0.5rem',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                borderTop: '1px solid rgba(180, 58, 43, 0.15)',
                paddingTop: '0.75rem'
              }}>
                <button
                  type="button"
                  onClick={handleReactDemo}
                  className="badge"
                  style={{
                    background: reacted ? '#991b1b' : 'rgba(153, 27, 27, 0.15)',
                    border: '1px solid #991b1b',
                    color: reacted ? '#fff' : '#991b1b',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    padding: '0.35rem 0.75rem'
                  }}
                >
                  <Heart size={13} fill={reacted ? '#fff' : '#991b1b'} />
                  <span>{reacted ? 'ভালোবাসা পাঠানো হয়েছে!' : 'চিঠিটিতে ভালোবাসা দিন'}</span>
                </button>

                {onWriteLetter && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onWriteLetter(activeLetter.recipient);
                    }}
                    className="badge"
                    style={{
                      background: 'rgba(245, 158, 11, 0.18)',
                      border: '1px solid #b45309',
                      color: '#78350f',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      padding: '0.35rem 0.75rem'
                    }}
                  >
                    <span>@{activeLetter.recipient}-কে চিঠি লিখুন</span>
                    <ArrowRight size={13} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: '#fdf4ea',
              padding: '1rem 0'
            }}>
              <p style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.15rem',
                fontWeight: 600,
                color: '#fbbf24',
                marginBottom: '0.35rem'
              }}>
                চিঠিটি মোমের সীল দিয়ে আবদ্ধ...
              </p>
              <span style={{
                fontSize: '0.85rem',
                color: '#d1c3b5',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <Eye size={15} /> খাম খুলে চিঠিটি পড়তে ক্লিক করুন
              </span>
            </div>
          )}
        </div>

        {/* Envelope Bottom Decorative Accent */}
        <div style={{
          position: 'absolute',
          bottom: '0.75rem',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '0.75rem',
          color: 'rgba(251, 191, 36, 0.7)',
          pointerEvents: 'none'
        }}>
          {isOpen ? 'খাম বন্ধ করতে পুনরায় ট্যাপ করুন' : 'চুপিচুপি গোপন সীলমোহর • ট্যাপ করে খুলুন'}
        </div>
      </div>
    </div>
  );
};
