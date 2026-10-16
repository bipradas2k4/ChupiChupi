import React, { useState, useEffect } from 'react';
import { 
  Mail, Star, Trash2, ShieldAlert, Reply, CheckCircle2, 
  Settings, RefreshCw, Eye, EyeOff, PauseCircle, PlayCircle,
  Download, Copy, Check, Sparkles
} from 'lucide-react';
import { CATEGORIES } from '../types/database';
import type { Message, Profile, ReportPayload, MessageCategory } from '../types/database';
import { getInboxMessages, updateMessage, deleteMessage, reportMessage, updateProfileSettings } from '../lib/letterApi';
import { LetterBoxCard } from '../components/LetterBoxCard';

interface DashboardViewProps {
  profile: Profile;
  onRefreshProfile: () => void;
  onSignOut?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  profile,
  onRefreshProfile,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'starred' | 'settings'>('all');

  // Reporting modal
  const [reportingMessageId, setReportingMessageId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<ReportPayload['reason']>('harassment');
  const [reportDetails, setReportDetails] = useState('');
  const [reportingSuccess, setReportingSuccess] = useState(false);

  // Replying modal
  const [replyingMessage, setReplyingMessage] = useState<Message | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [copiedReplyId, setCopiedReplyId] = useState<string | null>(null);

  const handleDownloadReplyStory = async (msg: Message) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1350;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Preload official seal logo
    const sealImg = new Image();
    sealImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      sealImg.onload = () => resolve();
      sealImg.onerror = () => resolve();
      sealImg.src = '/assets/chupichupi_seal_logo.png';
    });

    // 1. Background gradient
    const grad = ctx.createLinearGradient(0, 0, 1080, 1350);
    grad.addColorStop(0, '#2e0854');
    grad.addColorStop(0.5, '#5b1236');
    grad.addColorStop(1, '#9f1239');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1350);

    // Subtle background glowing circles
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.beginPath();
    ctx.arc(180, 180, 240, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(900, 1150, 320, 0, Math.PI * 2);
    ctx.fill();

    // Top branding badge with logo
    if (sealImg.complete && sealImg.naturalWidth > 0) {
      ctx.save();
      ctx.shadowColor = 'rgba(190, 18, 60, 0.5)';
      ctx.shadowBlur = 15;
      ctx.drawImage(sealImg, 540 - 45, 30, 90, 90);
      ctx.restore();

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 34px serif';
      ctx.textAlign = 'center';
      ctx.fillText('চুপিচুপি • CHUPICHUPI', 540, 155);
      ctx.fillStyle = '#fdf4ea';
      ctx.font = '22px sans-serif';
      ctx.fillText(`@${profile.username} এর চিঠি ও উত্তর`, 540, 190);
    } else {
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 36px serif';
      ctx.textAlign = 'center';
      ctx.fillText('চুপিচুপি • CHUPICHUPI', 540, 130);
      ctx.fillStyle = '#fdf4ea';
      ctx.font = '24px sans-serif';
      ctx.fillText(`@${profile.username} এর চিঠি ও উত্তর`, 540, 175);
    }

    // 2. Anonymous Letter White Card
    const cardX = 90;
    const cardY = 230;
    const cardW = 900;
    const cardH = 430;
    const radius = 36;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(cardX, cardY, cardW, cardH, radius);
    ctx.fill();
    ctx.restore();

    // Letter badge inside card
    ctx.fillStyle = '#be123c';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('গোপন চিঠি 🤫', cardX + 50, cardY + 65);

    // Bengali quote letter text
    ctx.fillStyle = '#1e293b';
    ctx.font = '500 32px serif';
    const letterWords = msg.content.split(' ');
    let lLine = '';
    let lY = cardY + 130;
    for (let i = 0; i < letterWords.length; i++) {
      const test = lLine + letterWords[i] + ' ';
      if (ctx.measureText(test).width > cardW - 100 && i > 0) {
        ctx.fillText(lLine, cardX + 50, lY);
        lLine = letterWords[i] + ' ';
        lY += 46;
        if (lY > cardY + cardH - 55) {
          lLine += '...';
          break;
        }
      } else {
        lLine = test;
      }
    }
    ctx.fillText(lLine, cardX + 50, lY);

    // 3. User's Reply Card (Dark Slate / Golden Border Card)
    const replyY = 700;
    const replyH = 430;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 35;
    ctx.shadowOffsetY = 15;
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(cardX, replyY, cardW, replyH, radius);
    ctx.fill();

    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();

    // Reply Header
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${profile.display_name} এর মিষ্টি উত্তর ✨:`, cardX + 50, replyY + 65);

    // Reply text
    ctx.fillStyle = '#f8fafc';
    ctx.font = '500 34px serif';
    const rWords = (msg.reply_text || '❤️').split(' ');
    let rLine = '';
    let rY = replyY + 135;
    for (let j = 0; j < rWords.length; j++) {
      const testR = rLine + rWords[j] + ' ';
      if (ctx.measureText(testR).width > cardW - 100 && j > 0) {
        ctx.fillText(rLine, cardX + 50, rY);
        rLine = rWords[j] + ' ';
        rY += 48;
        if (rY > replyY + replyH - 55) {
          rLine += '...';
          break;
        }
      } else {
        rLine = testR;
      }
    }
    ctx.fillText(rLine, cardX + 50, rY);

    // 4. Bottom footer prompt
    const displayHost = window.location.host || 'chupichupi-app.vercel.app';
    ctx.fillStyle = '#fde047';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`তুমিও বেনামে চিঠি পাঠাও 👉 ${displayHost}/u/${profile.username}`, 540, 1230);

    const link = document.createElement('a');
    link.download = `chupichupi-reply-${profile.username}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopyReplyText = async (msg: Message) => {
    const shareText = `💌 চুপিচুপি গোপন চিঠি:\n"${msg.content}"\n\n🗣️ ${profile.display_name} এর উত্তর:\n"${msg.reply_text || '❤️'}"\n\n👉 আমাকেও বেনামে চিঠি পাঠাতে ক্লিক করো:\n${window.location.origin}/u/${profile.username}`;
    try {
      await navigator.clipboard.writeText(shareText);
      setCopiedReplyId(msg.id);
      setTimeout(() => setCopiedReplyId(null), 2500);
    } catch {
      // Fallback
    }
  };

  // Settings form state
  const [settingsForm, setSettingsForm] = useState({
    display_name: profile.display_name,
    prompt: profile.prompt,
    bio: profile.bio,
    inbox_paused: profile.inbox_paused,
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  const loadMessages = async () => {
    setLoading(true);
    const res = await getInboxMessages(profile.id);
    setMessages(res.messages);
    setLoading(false);
  };

  useEffect(() => {
    loadMessages();
  }, [profile.id]);

  const handleToggleRead = async (message: Message) => {
    const newStatus = !message.is_read;
    setMessages((prev: Message[]) => prev.map((m: Message) => m.id === message.id ? { ...m, is_read: newStatus } : m));
    await updateMessage(message.id, { is_read: newStatus });
  };

  const handleToggleStar = async (message: Message) => {
    const newStar = !message.is_favorite;
    setMessages((prev: Message[]) => prev.map((m: Message) => m.id === message.id ? { ...m, is_favorite: newStar } : m));
    await updateMessage(message.id, { is_favorite: newStar });
  };

  const handleReact = async (message: Message, emoji: string) => {
    const nextEmoji = message.reaction === emoji ? null : emoji;
    setMessages((prev: Message[]) => prev.map((m: Message) => m.id === message.id ? { ...m, reaction: nextEmoji } : m));
    await updateMessage(message.id, { reaction: nextEmoji });
  };

  const handleDelete = async (messageId: string) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই চিঠিটি মুছে ফেলতে চান? এটি পুনরুদ্ধার করা যাবে না।')) {
      return;
    }
    setMessages((prev: Message[]) => prev.filter((m: Message) => m.id !== messageId));
    await deleteMessage(messageId);
  };

  const handleSendReport = async () => {
    if (!reportingMessageId) return;
    await reportMessage({
      message_id: reportingMessageId,
      reason: reportReason,
      details: reportDetails,
    });
    setReportingSuccess(true);
    setTimeout(() => {
      setReportingMessageId(null);
      setReportingSuccess(false);
      setReportDetails('');
    }, 1500);
  };

  const handleSaveReply = async () => {
    if (!replyingMessage) return;
    setReplySaving(true);
    await updateMessage(replyingMessage.id, {
      reply_text: replyText.trim(),
      replied_at: new Date().toISOString(),
    });
    setMessages((prev: Message[]) => prev.map((m: Message) => m.id === replyingMessage.id ? { 
      ...m, 
      reply_text: replyText.trim(),
      replied_at: new Date().toISOString()
    } : m));
    setReplySaving(false);
    setReplyingMessage(null);
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    const res = await updateProfileSettings(profile.id, settingsForm);
    setSavingSettings(false);
    if (res.success) {
      setSettingsSuccess(true);
      onRefreshProfile();
      setTimeout(() => setSettingsSuccess(false), 2500);
    }
  };

  // Filter messages based on active tab
  const filteredMessages = messages.filter((m: Message) => {
    if (activeTab === 'unread') return !m.is_read;
    if (activeTab === 'starred') return m.is_favorite;
    return true;
  });

  const unreadCount = messages.filter((m: Message) => !m.is_read).length;
  const starredCount = messages.filter((m: Message) => m.is_favorite).length;

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', paddingTop: '1rem' }} id="dashboard-view-container">
      {/* Profile Welcome Banner */}
      <div className="glass-card" style={{
        padding: '1.75rem 2rem',
        marginBottom: '2rem',
        border: '1.5px solid rgba(245, 158, 11, 0.3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #be123c 0%, #701a2d 100%)',
            border: '2px solid #fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontFamily: 'var(--font-serif)',
            fontSize: '1.75rem',
            fontWeight: 700,
            boxShadow: '0 4px 15px rgba(190, 18, 60, 0.4)'
          }}>
            {profile.display_name.charAt(0)}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', color: '#fdf4ea', lineHeight: 1.2 }}>
                {profile.display_name}
              </h2>
              <span className="badge" style={{
                background: profile.inbox_paused ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                color: profile.inbox_paused ? '#fca5a5' : '#4ade80',
                border: `1px solid ${profile.inbox_paused ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`,
                fontSize: '0.78rem'
              }}>
                {profile.inbox_paused ? 'চিঠি গ্রহণ বন্ধ' : 'চিঠি গ্রহণ সক্রিয়'}
              </span>
            </div>
            <div style={{ fontSize: '0.9rem', color: '#fbbf24', marginTop: '0.2rem' }}>
              @{profile.username}
            </div>
          </div>
        </div>

        {/* Quick Stats Pill */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{
            background: 'rgba(15, 8, 20, 0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '0.6rem 1.1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fdf4ea' }}>{messages.length}</div>
            <div style={{ fontSize: '0.75rem', color: '#a8998b' }}>মোট চিঠি</div>
          </div>
          <div style={{
            background: 'rgba(15, 8, 20, 0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '0.6rem 1.1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#ef4444' }}>{unreadCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#a8998b' }}>অপঠিত</div>
          </div>
          <div style={{
            background: 'rgba(15, 8, 20, 0.75)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '0.6rem 1.1rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: '#fbbf24' }}>{starredCount}</div>
            <div style={{ fontSize: '0.75rem', color: '#a8998b' }}>প্রিয়</div>
          </div>
        </div>
      </div>

      {/* Social Story Sticker & Link Hub */}
      <LetterBoxCard profile={profile} />

      {/* Main Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '0.6rem',
        borderBottom: '1px solid var(--border-subtle)',
        paddingBottom: '0.85rem',
        marginBottom: '1.75rem',
        overflowX: 'auto'
      }} id="dashboard-tabs">
        <button
          onClick={() => setActiveTab('all')}
          id="tab-all-messages"
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.55rem 1.1rem', fontSize: '0.9rem' }}
        >
          <Mail size={16} />
          <span>সব চিঠি ({messages.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('unread')}
          id="tab-unread-messages"
          className={`btn ${activeTab === 'unread' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.55rem 1.1rem', fontSize: '0.9rem' }}
        >
          <EyeOff size={16} />
          <span>অপঠিত ({unreadCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('starred')}
          id="tab-starred-messages"
          className={`btn ${activeTab === 'starred' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.55rem 1.1rem', fontSize: '0.9rem' }}
        >
          <Star size={16} />
          <span>প্রিয় চিঠি ({starredCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          id="tab-box-settings"
          className={`btn ${activeTab === 'settings' ? 'btn-primary' : 'btn-ghost'}`}
          style={{ padding: '0.55rem 1.1rem', fontSize: '0.9rem' }}
        >
          <Settings size={16} />
          <span>চিঠির বাক্স সেটিংস</span>
        </button>

        <button
          onClick={loadMessages}
          className="btn btn-ghost"
          title="রিফ্রেশ করুন"
          style={{ padding: '0.55rem', marginLeft: 'auto' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tab 1, 2, 3: Messages List */}
      {activeTab !== 'settings' && (
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
              <div className="wax-seal animate-glow" style={{ margin: '0 auto 1rem' }}>ডাক</div>
              <p style={{ color: '#c4b5a5' }}>চিঠিপত্র লোড হচ্ছে...</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="glass-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(245, 158, 11, 0.1)',
                color: '#fbbf24',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <Mail size={28} />
              </div>
              <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#fdf4ea', marginBottom: '0.4rem' }}>
                কোনো চিঠি পাওয়া যায়নি
              </h4>
              <p style={{ color: '#a8998b', fontSize: '0.9rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
                {activeTab === 'unread'
                  ? 'আপনার কোনো অপঠিত চিঠি নেই।'
                  : activeTab === 'starred'
                  ? 'আপনি এখনও কোনো চিঠি প্রিয় তালিকায় যুক্ত করেননি।'
                  : 'আপনার চিঠির বাক্সে এখনো কোনো চিঠি আসেনি। উপরের লিঙ্কটি বন্ধুদের সাথে শেয়ার করুন!'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredMessages.map((msg: Message) => {
                const categoryMeta = CATEGORIES[msg.category as MessageCategory] || CATEGORIES.secret;
                return (
                  <div
                    key={msg.id}
                    id={`message-card-${msg.id}`}
                    className="glass-card"
                    style={{
                      padding: '1.5rem',
                      borderLeft: msg.is_read ? '4px solid rgba(245, 158, 11, 0.2)' : '4px solid #ef4444',
                      background: msg.is_read ? 'var(--bg-card)' : 'rgba(32, 16, 42, 0.95)',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {/* Message Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.5rem',
                      marginBottom: '1rem',
                      borderBottom: '1px solid var(--border-subtle)',
                      paddingBottom: '0.6rem'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span
                          className="badge"
                          style={{
                            background: categoryMeta.badgeBg,
                            color: categoryMeta.badgeColor,
                            border: `1px solid ${categoryMeta.badgeColor}40`,
                            fontSize: '0.82rem'
                          }}
                        >
                          <span>{categoryMeta.icon}</span>
                          <span>{categoryMeta.labelBn}</span>
                        </span>

                        {!msg.is_read && (
                          <span className="badge" style={{ background: '#ef4444', color: '#fff', fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}>
                            নতুন
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#a8998b' }}>
                        {new Date(msg.created_at).toLocaleString('bn-BD', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>

                    {/* Letter Content (Bengali calligraphy font) */}
                    <div style={{
                      fontFamily: 'var(--font-serif)',
                      fontSize: '1.12rem',
                      lineHeight: '1.7',
                      color: '#fdf4ea',
                      marginBottom: '1.25rem',
                      whiteSpace: 'pre-wrap',
                      padding: '0.5rem 0'
                    }}>
                      {msg.content}
                    </div>

                    {/* Existing Reply Display */}
                    {msg.reply_text && (
                      <div style={{
                        margin: '0.5rem 0 1.25rem',
                        padding: '0.9rem 1.15rem',
                        background: 'rgba(245, 158, 11, 0.08)',
                        borderLeft: '3px solid #fbbf24',
                        borderRadius: '8px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        flexWrap: 'wrap',
                        gap: '0.75rem'
                      }}>
                        <div style={{ flex: 1, minWidth: '240px' }}>
                          <div style={{ fontSize: '0.78rem', color: '#fbbf24', fontWeight: 600, marginBottom: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <Sparkles size={13} />
                            <span>আপনার উত্তর:</span>
                          </div>
                          <div style={{ fontSize: '0.95rem', color: '#fef3c7', fontStyle: 'italic', lineHeight: 1.5 }}>
                            "{msg.reply_text}"
                          </div>
                        </div>

                        {/* Story Export Buttons */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleDownloadReplyStory(msg)}
                            id={`download-reply-story-${msg.id}`}
                            className="btn btn-primary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', gap: '0.35rem' }}
                            title="ইনস্টাগ্রাম বা হোয়াটসঅ্যাপ স্টোরি কার্ড ডাউনলোড করুন"
                          >
                            <Download size={13} />
                            <span>স্টোরি PNG</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyReplyText(msg)}
                            id={`copy-reply-text-${msg.id}`}
                            className="btn btn-secondary"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', gap: '0.35rem' }}
                            title="শেয়ারের টেক্সট কপি করুন"
                          >
                            {copiedReplyId === msg.id ? <Check size={13} color="#4ade80" /> : <Copy size={13} />}
                            <span>{copiedReplyId === msg.id ? 'কপি হয়েছে!' : 'কপি টেক্সট'}</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Bar */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '0.75rem',
                      borderTop: '1px solid var(--border-subtle)',
                      paddingTop: '0.85rem'
                    }}>
                      {/* Emoji Reactions Picker */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        {['❤️', '🌸', '🤫', '🔥', '💌', '😂', '🥺'].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReact(msg, emoji)}
                            title={`প্রতিক্রিয়া জানান ${emoji}`}
                            style={{
                              background: msg.reaction === emoji ? 'rgba(245, 158, 11, 0.25)' : 'transparent',
                              border: msg.reaction === emoji ? '1px solid #fbbf24' : '1px solid transparent',
                              borderRadius: '8px',
                              padding: '0.25rem 0.45rem',
                              cursor: 'pointer',
                              fontSize: '1rem',
                              transform: msg.reaction === emoji ? 'scale(1.2)' : 'scale(1)',
                              transition: 'transform 0.15s ease'
                            }}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Utility Action Buttons */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {/* Toggle Read */}
                        <button
                          onClick={() => handleToggleRead(msg)}
                          className="btn btn-ghost"
                          title={msg.is_read ? 'অপঠিত হিসেবে চিহ্নিত করুন' : 'পঠিত হিসেবে চিহ্নিত করুন'}
                          style={{ padding: '0.45rem 0.65rem' }}
                        >
                          {msg.is_read ? <EyeOff size={16} /> : <Eye size={16} color="#fbbf24" />}
                        </button>

                        {/* Toggle Star */}
                        <button
                          onClick={() => handleToggleStar(msg)}
                          className="btn btn-ghost"
                          title={msg.is_favorite ? 'প্রিয় তালিকা থেকে সরান' : 'প্রিয় তালিকায় যুক্ত করুন'}
                          style={{ padding: '0.45rem 0.65rem', color: msg.is_favorite ? '#fbbf24' : '#c4b5a5' }}
                        >
                          <Star size={16} fill={msg.is_favorite ? '#fbbf24' : 'none'} />
                        </button>

                        {/* Reply Button */}
                        <button
                          onClick={() => {
                            setReplyingMessage(msg);
                            setReplyText(msg.reply_text || '');
                          }}
                          className="btn btn-secondary"
                          style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem' }}
                        >
                          <Reply size={14} />
                          <span>উত্তর দিন</span>
                        </button>

                        {/* Report Button */}
                        <button
                          onClick={() => setReportingMessageId(msg.id)}
                          className="btn btn-ghost"
                          title="রিপোর্ট বা অভিযোগ করুন"
                          style={{ padding: '0.45rem 0.65rem', color: '#f87171' }}
                        >
                          <ShieldAlert size={16} />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDelete(msg.id)}
                          className="btn btn-ghost"
                          title="মুছে ফেলুন"
                          style={{ padding: '0.45rem 0.65rem', color: '#f87171' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Letterbox Settings */}
      {activeTab === 'settings' && (
        <div className="glass-card" style={{ padding: '2rem' }}>
          <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', color: '#fdf4ea', marginBottom: '1.5rem' }}>
            চিঠির বাক্স ও প্রফাইল সেটিংস
          </h3>

          <form onSubmit={handleSaveSettings}>
            {/* Pause / Resume Letterbox Toggle */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '1.25rem',
              borderRadius: '14px',
              background: 'rgba(15, 8, 20, 0.75)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '1.5rem'
            }}>
              <div>
                <div style={{ fontWeight: 600, color: '#fdf4ea', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {settingsForm.inbox_paused ? <PauseCircle color="#f87171" size={18} /> : <PlayCircle color="#4ade80" size={18} />}
                  <span>চিঠি গ্রহণ সাময়িক বন্ধ / চালু</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#a8998b', marginTop: '0.2rem' }}>
                  {settingsForm.inbox_paused 
                    ? 'বর্তমানে আপনার চিঠি বাক্স বন্ধ আছে। কেউ চিঠি পাঠাতে পারবে না।'
                    : 'চিঠি গ্রহণ সক্রিয় আছে। যে কেউ বেনামে চিঠি পাঠাতে পারবে।'}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSettingsForm({ ...settingsForm, inbox_paused: !settingsForm.inbox_paused })}
                className={`btn ${settingsForm.inbox_paused ? 'btn-danger' : 'btn-secondary'}`}
                style={{ padding: '0.5rem 1.1rem', fontSize: '0.85rem' }}
              >
                {settingsForm.inbox_paused ? 'চিঠি গ্রহণ পুনরায় চালু করুন' : 'সাময়িক বন্ধ করুন'}
              </button>
            </div>

            {/* Display Name */}
            <div className="form-group">
              <label className="form-label">ডিসপ্লে নাম (Display Name)</label>
              <input
                type="text"
                className="form-input"
                value={settingsForm.display_name}
                onChange={(e) => setSettingsForm({ ...settingsForm, display_name: e.target.value })}
                required
              />
            </div>

            {/* Prompt */}
            <div className="form-group">
              <label className="form-label">ব্যক্তিগত আহ্বান / প্রম্পট (Prompt)</label>
              <input
                type="text"
                className="form-input"
                value={settingsForm.prompt}
                onChange={(e) => setSettingsForm({ ...settingsForm, prompt: e.target.value })}
                placeholder="আমাকে তোমার গোপন মনের কথা বলো... 🤫"
                required
              />
              <div style={{ fontSize: '0.78rem', color: '#a8998b', marginTop: '0.2rem' }}>
                এই প্রশ্নটি আপনার পাবলিক চিঠি বাক্সে ও স্টোরি কার্ডে বড় করে প্রদর্শিত হবে।
              </div>
            </div>

            {/* Bio */}
            <div className="form-group">
              <label className="form-label">চিঠির বাক্সের বিবরণ (Bio)</label>
              <textarea
                className="form-textarea"
                value={settingsForm.bio}
                onChange={(e) => setSettingsForm({ ...settingsForm, bio: e.target.value })}
                rows={3}
                placeholder="আমার সাথে গোপন চিঠি আদান-প্রদান করুন..."
              />
            </div>

            {settingsSuccess && (
              <div style={{
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: 'rgba(34, 197, 94, 0.15)',
                color: '#4ade80',
                fontSize: '0.88rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <CheckCircle2 size={16} />
                <span>সেটিংস সফলভাবে সংরক্ষিত হয়েছে!</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button
                type="submit"
                disabled={savingSettings}
                className="btn btn-primary"
                style={{ padding: '0.75rem 1.75rem' }}
              >
                {savingSettings ? 'সংরক্ষণ হচ্ছে...' : 'সেটিংস সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reply Modal */}
      {replyingMessage && (
        <div className="modal-overlay" onClick={() => setReplyingMessage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#fdf4ea', marginBottom: '0.75rem' }}>
              চিঠির উত্তর দিন
            </h3>

            <div style={{
              padding: '0.9rem',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              fontFamily: 'var(--font-serif)',
              fontSize: '0.95rem',
              color: '#c4b5a5',
              fontStyle: 'italic',
              marginBottom: '1.25rem',
              maxHeight: '120px',
              overflowY: 'auto'
            }}>
              "{replyingMessage.content}"
            </div>

            <div className="form-group">
              <label className="form-label">আপনার উত্তর (সোশ্যাল মিডিয়ায় শেয়ারযোগ্য)</label>
              <textarea
                className="form-textarea"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="এখানে আপনার মিষ্টি উত্তরটি লিখে ফেলুন..."
                maxLength={500}
                style={{ minHeight: '100px' }}
              />
              <div style={{ fontSize: '0.78rem', color: '#a8998b', textAlign: 'right' }}>
                {replyText.length}/৫০০
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button onClick={() => setReplyingMessage(null)} className="btn btn-ghost">
                বাতিল
              </button>
              <button onClick={handleSaveReply} disabled={replySaving} className="btn btn-primary">
                {replySaving ? 'সংরক্ষণ হচ্ছে...' : 'উত্তর সংরক্ষণ করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportingMessageId && (
        <div className="modal-overlay" onClick={() => setReportingMessageId(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', color: '#f87171', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <ShieldAlert size={20} />
              <span>চিঠি রিপোর্ট করুন</span>
            </h3>

            {reportingSuccess ? (
              <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                <CheckCircle2 size={36} color="#4ade80" style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ color: '#fdf4ea', fontWeight: 600 }}>আপনার অভিযোগ গ্রহণ করা হয়েছে।</p>
                <p style={{ color: '#a8998b', fontSize: '0.85rem' }}>আমরা এটি দ্রুত পর্যালোচনা করব।</p>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: '0.88rem', color: '#c4b5a5', marginBottom: '1rem' }}>
                  এই চিঠিতে কোনো অশোভন ভাষা, হুমকি বা হয়রানি থাকলে আমাদের জানান:
                </p>

                <div className="form-group">
                  <label className="form-label">অভিযোগের কারণ</label>
                  <select
                    className="form-select"
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value as any)}
                  >
                    <option value="harassment">হয়রানি বা কটূক্তি (Harassment)</option>
                    <option value="hate_speech">বিদ্বেষমূলক বক্তব্য (Hate Speech)</option>
                    <option value="threat">হুমকি বা ভীতি প্রদর্শন (Threat)</option>
                    <option value="spam">স্প্যাম বা অপ্রাসঙ্গিক বিজ্ঞাপন (Spam)</option>
                    <option value="inappropriate">অশ্লীল বা অনুপযুক্ত ভাষা (Inappropriate)</option>
                    <option value="other">অন্যান্য (Other)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">অতিরিক্ত বিবরণ (ঐচ্ছিক)</label>
                  <textarea
                    className="form-textarea"
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="কেন এই চিঠিটি ক্ষতিকর বলে মনে হচ্ছে..."
                    rows={3}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button onClick={() => setReportingMessageId(null)} className="btn btn-ghost">
                    বাতিল
                  </button>
                  <button onClick={handleSendReport} className="btn btn-danger">
                    অভিযোগ জমা দিন
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
