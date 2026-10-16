import React, { useState } from 'react';
import { Copy, Check, Share2, QrCode, Download, Edit3 } from 'lucide-react';
import type { Profile } from '../types/database';

interface LetterBoxCardProps {
  profile: Profile;
}

const GRADIENT_THEMES = [
  { id: 'vibrant_magenta', name: 'ম্যাজেন্টা গ্লো', bg: 'linear-gradient(135deg, #c026d3 0%, #7e22ce 50%, #4338ca 100%)', c1: '#c026d3', c2: '#4338ca' },
  { id: 'sunset_crimson', name: 'লালচে গোধূলি', bg: 'linear-gradient(135deg, #e11d48 0%, #be123c 40%, #701a2d 100%)', c1: '#e11d48', c2: '#701a2d' },
  { id: 'royal_gold', name: 'রাজকীয় স্বর্ণালী', bg: 'linear-gradient(135deg, #f59e0b 0%, #b45309 50%, #451a03 100%)', c1: '#f59e0b', c2: '#451a03' },
  { id: 'midnight_velvet', name: 'মধ্যরাত ভেলভেট', bg: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 60%, #0f172a 100%)', c1: '#312e81', c2: '#0f172a' },
];

export const LetterBoxCard: React.FC<LetterBoxCardProps> = ({ profile }) => {
  const [copied, setCopied] = useState(false);
  const [activeGradient, setActiveGradient] = useState(GRADIENT_THEMES[0]);
  const [showQr, setShowQr] = useState(false);
  const [customPrompt, setCustomPrompt] = useState(profile.prompt || 'আমাকে তোমার গোপন মনের কথা বলো... 🤫');
  const [isEditingPrompt, setIsEditingPrompt] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const publicUrl = `${window.location.origin}/u/${profile.username}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = `আমাকে সম্পূর্ণ গোপনে ও বেনামে চিঠি পাঠান! কোনো নাম বা পরিচয় ছাড়া আপনার মনের কথা লিখুন:\n${publicUrl}`;

  const handleShareWhatsApp = () => {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  const handleShareFacebook = () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(publicUrl)}`, '_blank');
  };

  const handleShareTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
  };

  // Generate & Download PNG Image Card via HTML5 Canvas
  const handleDownloadCard = async () => {
    setDownloading(true);
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      setDownloading(false);
      return;
    }

    // Preload official seal logo
    const sealImg = new Image();
    sealImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      sealImg.onload = () => resolve();
      sealImg.onerror = () => resolve();
      sealImg.src = '/assets/chupichupi_seal_logo.png';
    });

    // 1. Draw Gradient Background
    const gradient = ctx.createLinearGradient(0, 0, 1080, 1350);
    gradient.addColorStop(0, activeGradient.c1);
    gradient.addColorStop(1, activeGradient.c2);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1080, 1350);

    // Decorative circles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(100, 150, 300, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(950, 1200, 400, 0, Math.PI * 2);
    ctx.fill();

    // 2. Draw Floating White Card
    const cardX = 100;
    const cardY = 250;
    const cardW = 880;
    const cardH = 800;
    const radius = 50;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.restore();

    // 3. User Badge / Avatar
    ctx.fillStyle = '#be123c';
    ctx.beginPath();
    ctx.arc(cardX + 90, cardY + 110, 45, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(profile.display_name.charAt(0), cardX + 90, cardY + 110);

    // Username
    ctx.fillStyle = '#3f3f46';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`@${profile.username}`, cardX + 160, cardY + 110);

    // Official Royal Wax Seal Stamp top right of card
    if (sealImg.complete && sealImg.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(190, 18, 60, 0.45)';
      ctx.shadowBlur = 20;
      ctx.drawImage(sealImg, cardX + cardW - 145, cardY + 50, 110, 110);
      ctx.restore();
    } else {
      // Fallback seal stamp if image fails to load
      ctx.save();
      ctx.strokeStyle = '#be123c';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cardX + cardW - 100, cardY + 105, 50, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#be123c';
      ctx.font = 'bold 24px serif';
      ctx.textAlign = 'center';
      ctx.fillText('চুপিচুপি', cardX + cardW - 100, cardY + 100);
      ctx.font = '18px sans-serif';
      ctx.fillText('গোপন বার্তা', cardX + cardW - 100, cardY + 125);
      ctx.restore();
    }

    // 4. Main Question / Prompt
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 52px serif';
    ctx.textAlign = 'center';

    // Simple word wrapping for prompt
    const words = customPrompt.split(' ');
    let line = '';
    let promptY = cardY + 320;
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > cardW - 140 && n > 0) {
        ctx.fillText(line, cardX + cardW / 2, promptY);
        line = words[n] + ' ';
        promptY += 75;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, cardX + cardW / 2, promptY);

    // Sub-reassurance
    ctx.fillStyle = '#71717a';
    ctx.font = '32px sans-serif';
    ctx.fillText('🔒 সম্পূর্ণ বেনামে চিঠি পাঠান • কোনো নাম প্রকাশ পাবে না', cardX + cardW / 2, cardY + cardH - 240);

    // Pill Link Box
    ctx.fillStyle = '#f4f4f5';
    ctx.beginPath();
    ctx.roundRect(cardX + 80, cardY + cardH - 160, cardW - 160, 90, 24);
    ctx.fill();

    const displayHost = window.location.host || 'chupichupi-app.vercel.app';
    ctx.fillStyle = '#18181b';
    ctx.font = 'bold 34px monospace';
    ctx.fillText(`${displayHost}/u/${profile.username}`, cardX + cardW / 2, cardY + cardH - 105);

    // Bottom Watermark & Branding
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('চুপিচুপি (ChupiChupi) • ইনস্টাগ্রাম বা হোয়াটসঅ্যাপ স্টোরিতে পোস্ট করুন!', 540, 1140);
    ctx.font = '28px sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText(`🔗 লিঙ্কে ট্যাপ করে আমাকে চিঠি পাঠাও: ${displayHost}/u/${profile.username}`, 540, 1195);

    // Trigger download
    const link = document.createElement('a');
    link.download = `chupichupi-${profile.username}-story-card.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    setDownloading(false);
  };

  return (
    <div className="glass-card" style={{ padding: '2rem', marginBottom: '2rem' }} id="social-story-hub">
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div>
          <h3 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.4rem',
            color: '#fdf4ea',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <Share2 size={20} color="#fbbf24" />
            <span>চিঠি বক্স শেয়ার কার্ড (Instagram & Social Story)</span>
          </h3>
          <p style={{ fontSize: '0.88rem', color: '#a8998b' }}>
            আপনার ব্যক্তিগত লিঙ্ক দিয়ে ইনস্টাগ্রাম ও হোয়াটসঅ্যাপ স্টোরি কার্ড তৈরি করুন
          </p>
        </div>

        {/* Theme Pill Picker */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: '#c4b5a5' }}>থিম:</span>
          {GRADIENT_THEMES.map((theme) => (
            <button
              key={theme.id}
              onClick={() => setActiveGradient(theme)}
              title={theme.name}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: theme.bg,
                border: activeGradient.id === theme.id ? '2.5px solid #ffffff' : '1px solid rgba(255,255,255,0.2)',
                cursor: 'pointer',
                transform: activeGradient.id === theme.id ? 'scale(1.18)' : 'scale(1)',
                boxShadow: activeGradient.id === theme.id ? '0 0 10px rgba(255,255,255,0.5)' : 'none',
                transition: 'all 0.2s ease'
              }}
            />
          ))}
        </div>
      </div>

      {/* Social Story Sticker Card Mockup (Inspired by NGL / VibeBox) */}
      <div style={{
        maxWidth: '430px',
        margin: '0 auto 1.75rem',
        borderRadius: '26px',
        padding: '2.5rem 1.75rem',
        background: activeGradient.bg,
        boxShadow: '0 20px 45px rgba(0,0,0,0.55), 0 0 30px rgba(0,0,0,0.3)',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center'
      }} id="shareable-story-sticker">
        {/* Floating rounded white card */}
        <div style={{
          background: '#ffffff',
          borderRadius: '20px',
          padding: '1.75rem 1.5rem',
          boxShadow: '0 15px 35px rgba(0,0,0,0.35)',
          color: '#18181b',
          textAlign: 'center',
          position: 'relative'
        }}>
          {/* Official Royal Wax Seal Stamp */}
          <div style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'default',
            filter: 'drop-shadow(0 4px 10px rgba(190, 18, 60, 0.4))'
          }}>
            <img 
              src="/assets/chupichupi_seal_logo.png" 
              alt="চুপিচুপি লোগো"
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                border: '1.5px solid rgba(254, 240, 138, 0.6)',
                transform: 'rotate(-6deg)',
                transition: 'transform 0.2s ease',
                display: 'block'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1) rotate(0deg)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1) rotate(-6deg)')}
              title="চুপিচুপি অফিসিয়াল সিল"
            />
          </div>

          {/* User Avatar / Header */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.35rem 0.85rem',
            background: 'rgba(244, 244, 245, 0.95)',
            borderRadius: '30px',
            marginBottom: '1rem'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: '#e11d48',
              color: '#fff',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}>
              {profile.display_name.charAt(0)}
            </div>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#27272a' }}>
              @{profile.username}
            </span>
          </div>

          {/* Main Question / Prompt with inline edit toggle */}
          {isEditingPrompt ? (
            <div style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                className="form-input"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                style={{
                  background: '#f4f4f5',
                  color: '#18181b',
                  fontSize: '1rem',
                  textAlign: 'center',
                  fontWeight: 600
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsEditingPrompt(false)}
                className="btn btn-primary"
                style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem', marginTop: '0.4rem' }}
              >
                ঠিক আছে
              </button>
            </div>
          ) : (
            <div 
              onClick={() => setIsEditingPrompt(true)}
              title="প্রশ্ন পরিবর্তন করতে ক্লিক করুন"
              style={{
                cursor: 'pointer',
                marginBottom: '0.6rem',
                position: 'relative'
              }}
            >
              <h4 style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '1.28rem',
                color: '#0f172a',
                lineHeight: 1.4,
                fontWeight: 700
              }}>
                {customPrompt}
              </h4>
              <span style={{ fontSize: '0.72rem', color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                <Edit3 size={11} /> প্রম্পট এডিট করতে ট্যাপ করুন
              </span>
            </div>
          )}

          <div style={{
            fontSize: '0.82rem',
            color: '#71717a',
            fontFamily: 'var(--font-sans)',
            marginBottom: '1.25rem'
          }}>
            🔒 সম্পূর্ণ বেনামে চিঠি পাঠান • কোনো নাম প্রকাশ পাবে না
          </div>

          {/* Link Pill */}
          <div style={{
            background: '#f4f4f5',
            borderRadius: '12px',
            padding: '0.65rem 1rem',
            fontSize: '0.84rem',
            color: '#27272a',
            fontFamily: 'monospace',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.4rem',
            border: '1px solid #e4e4e7'
          }}>
            <span>{(window.location.host || 'chupichupi-app.vercel.app')}/u/{profile.username}</span>
          </div>
        </div>

        {/* Sub-caption below sticker */}
        <div style={{
          marginTop: '1.25rem',
          color: 'rgba(255, 255, 255, 0.95)',
          fontSize: '0.88rem',
          fontWeight: 600,
          textShadow: '0 2px 4px rgba(0,0,0,0.5)'
        }}>
          ইনস্টাগ্রাম স্টোরি বা হোয়াটসঅ্যাপ স্ট্যাটাসে পোস্ট করুন!
        </div>
      </div>

      {/* Share & Download Action Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.75rem'
      }}>
        {/* Download Story Card Image Button */}
        <button
          onClick={handleDownloadCard}
          id="download-story-card-btn"
          disabled={downloading}
          className="btn btn-primary"
          style={{ padding: '0.65rem 1.4rem' }}
        >
          <Download size={16} />
          <span>{downloading ? 'ইমেজ তৈরি হচ্ছে...' : 'স্টোরি কার্ড ডাউনলোড (PNG)'}</span>
        </button>

        {/* Copy Link Button */}
        <button
          onClick={handleCopyLink}
          id="copy-public-link-btn"
          className="btn btn-secondary"
          style={{ padding: '0.65rem 1.3rem' }}
        >
          {copied ? <Check size={16} color="#4ade80" /> : <Copy size={16} />}
          <span>{copied ? 'লিঙ্ক কপি হয়েছে!' : 'লিঙ্ক কপি করুন'}</span>
        </button>

        {/* WhatsApp Share */}
        <button
          onClick={handleShareWhatsApp}
          id="share-whatsapp-btn"
          className="btn btn-secondary"
          style={{ padding: '0.65rem 1.1rem' }}
        >
          <span>WhatsApp-এ শেয়ার</span>
        </button>

        {/* Facebook Share */}
        <button
          onClick={handleShareFacebook}
          id="share-facebook-btn"
          className="btn btn-secondary"
          style={{ padding: '0.65rem 1.1rem' }}
        >
          <span>Facebook</span>
        </button>

        {/* Twitter Share */}
        <button
          onClick={handleShareTwitter}
          id="share-twitter-btn"
          className="btn btn-secondary"
          style={{ padding: '0.65rem 1.1rem' }}
        >
          <span>Twitter / X</span>
        </button>

        {/* QR Code Toggle */}
        <button
          onClick={() => setShowQr(!showQr)}
          id="toggle-qr-btn"
          className="btn btn-ghost"
          style={{ padding: '0.65rem 1rem' }}
        >
          <QrCode size={16} />
          <span>{showQr ? 'QR লুকান' : 'QR কোড'}</span>
        </button>
      </div>

      {/* QR Code Modal Display */}
      {showQr && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1.25rem',
          background: 'rgba(15, 8, 20, 0.9)',
          borderRadius: '16px',
          border: '1px solid var(--border-subtle)',
          textAlign: 'center',
          maxWidth: '300px',
          margin: '1.5rem auto 0'
        }}>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(publicUrl)}&color=701a2d`}
            alt="QR Code"
            style={{ borderRadius: '8px', marginBottom: '0.75rem', width: '180px', height: '180px' }}
          />
          <p style={{ fontSize: '0.8rem', color: '#c4b5a5' }}>
            ক্যামেরা দিয়ে স্ক্যান করে সরাসরি চিঠি পাঠান
          </p>
        </div>
      )}
    </div>
  );
};
