import { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { CheckCircle2, Sparkles, Mail, UserPlus, LogIn } from 'lucide-react';

interface DeliveryAnimationProps {
  recipientUsername: string;
  onSendAnother: () => void;
  onCreateLetterbox: () => void;
  onSignIn: () => void;
}

export const DeliveryAnimation: React.FC<DeliveryAnimationProps> = ({
  recipientUsername,
  onSendAnother,
  onCreateLetterbox,
  onSignIn,
}) => {
  useEffect(() => {
    // Fire festive Bengali celebration confetti
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#dc2626', '#f59e0b', '#ec4899', '#fef08a', '#10b981']
      });
    } catch {
      // ignore in test environments
    }
  }, []);

  return (
    <div className="glass-card" style={{
      maxWidth: '560px',
      margin: '2rem auto',
      padding: '2.5rem 2rem',
      textAlign: 'center',
      border: '1.5px solid rgba(34, 197, 94, 0.4)',
      boxShadow: '0 20px 50px rgba(0,0,0,0.6), 0 0 35px rgba(34, 197, 94, 0.15)',
      position: 'relative',
      overflow: 'hidden'
    }} id="letter-delivery-success">
      {/* Flying Envelope Stamp Graphic */}
      <div style={{
        margin: '0 auto 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative'
      }}>
        <div style={{
          width: '90px',
          height: '90px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div className="wax-seal" style={{ width: '64px', height: '64px', fontSize: '1.2rem' }}>
            পৌঁছেছে
          </div>
        </div>
      </div>

      {/* Main Delivery Confirmation */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.5rem',
        color: '#4ade80',
        background: 'rgba(34, 197, 94, 0.12)',
        padding: '0.4rem 1rem',
        borderRadius: '30px',
        fontSize: '0.9rem',
        fontWeight: 600,
        marginBottom: '1rem'
      }}>
        <CheckCircle2 size={16} />
        <span>সফলভাবে বিতরণ সম্পন্ন হয়েছে</span>
      </div>

      <h2 style={{
        fontFamily: 'var(--font-serif)',
        fontSize: '2rem',
        color: '#fdf4ea',
        marginBottom: '0.5rem'
      }} id="delivery-confirmation-heading">
        তোমার চিঠি পৌঁছে গেছে।
      </h2>

      <p style={{
        color: '#c4b5a5',
        fontSize: '1rem',
        maxWidth: '440px',
        margin: '0 auto 2rem',
        lineHeight: 1.6
      }}>
        <strong style={{ color: '#fbbf24' }}>@{recipientUsername}</strong>-এর চিঠির বাক্সে তোমার গোপন চিঠিটি নিরাপদে জমা হয়েছে। প্রাপক কখনো জানবে না এটি কে লিখেছে।
      </p>

      {/* Divider */}
      <div style={{
        height: '1px',
        background: 'linear-gradient(90deg, transparent, rgba(245, 158, 11, 0.3), transparent)',
        margin: '1.5rem 0 2rem'
      }} />

      {/* Secondary Invitation - "তুমিও কি নিজের চিঠির বাক্স চাও?" */}
      <div style={{
        background: 'rgba(15, 8, 20, 0.65)',
        border: '1px solid rgba(245, 158, 11, 0.25)',
        borderRadius: '16px',
        padding: '1.5rem',
        marginBottom: '2rem',
        textAlign: 'center'
      }} id="secondary-invitation-box">
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.4rem',
          color: '#fbbf24',
          fontSize: '0.85rem',
          fontWeight: 600,
          marginBottom: '0.4rem'
        }}>
          <Sparkles size={14} />
          <span>নতুন অভিজ্ঞতা</span>
        </div>

        <h3 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: '1.25rem',
          color: '#fdf4ea',
          marginBottom: '0.4rem'
        }}>
          তুমিও কি নিজের চিঠির বাক্স চাও?
        </h3>

        <p style={{
          fontSize: '0.88rem',
          color: '#a8998b',
          marginBottom: '1.25rem'
        }}>
          নিজের একটি গোপন লিঙ্ক তৈরি করুন এবং ইনস্টাগ্রাম বা হোয়াটসঅ্যাপে শেয়ার করে বন্ধুদের থেকে অচেনা চিঠি গ্রহণ করুন!
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          alignItems: 'center'
        }}>
          <button
            onClick={onCreateLetterbox}
            id="invitation-create-box-btn"
            className="btn btn-primary"
            style={{ width: '100%', maxWidth: '320px', padding: '0.75rem 1.25rem' }}
          >
            <UserPlus size={16} />
            <span>আমার চিঠির বাক্স বানাও</span>
          </button>

          <button
            onClick={onSignIn}
            id="invitation-signin-btn"
            className="btn btn-ghost"
            style={{ fontSize: '0.88rem', color: '#fbbf24' }}
          >
            <LogIn size={14} />
            <span>ইতিমধ্যে একাউন্ট আছে? সাইন ইন করুন</span>
          </button>
        </div>
      </div>

      {/* Button to send another letter */}
      <div>
        <button
          onClick={onSendAnother}
          id="send-another-letter-btn"
          className="btn btn-secondary"
          style={{ padding: '0.6rem 1.25rem', fontSize: '0.9rem' }}
        >
          <Mail size={15} />
          <span>আরেকটি চিঠি পাঠান</span>
        </button>
      </div>
    </div>
  );
};
