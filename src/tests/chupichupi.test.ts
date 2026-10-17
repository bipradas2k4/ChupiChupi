import { describe, it, expect } from 'vitest';
import { sendAnonymousLetter, getPublicProfile, getInboxMessages } from '../lib/letterApi';
import { USERNAME_REGEX, signUpWithEmail, signInWithEmail, signUpOrSignInWithGoogleAccount, resendVerificationEmail, signOutUser } from '../lib/auth';
import { CATEGORIES } from '../types/database';
import type { MessageCategory } from '../types/database';

describe('ChupiChupi (চুপিচুপি) - Guest-First Anonymous Messaging & Security Tests', () => {

  // ==========================================================================
  // TEST A: Guest sends a letter without signing in
  // ==========================================================================
  describe('TEST A: Guest sends an anonymous letter', () => {
    it('allows a visitor to fetch recipient public profile without authentication', async () => {
      const res = await getPublicProfile('anirban');
      expect(res.profile).not.toBeNull();
      expect(res.profile?.username).toBe('anirban');
      expect(res.profile?.display_name).toBe('অনির্বাণ মুখোপাধ্যায়');
      // Must NOT contain sensitive private fields
      expect((res.profile as any)?.email).toBeUndefined();
    });

    it('submits an anonymous letter successfully without requiring user session or login', async () => {
      const payload = {
        recipient_username: 'anirban',
        category: 'secret' as MessageCategory,
        content: 'এটি একটি গোপন চিঠি — পরীক্ষা ১।',
      };

      const result = await sendAnonymousLetter(payload);
      expect(result.success).toBe(true);
      expect(result.message_id).toBeDefined();
      expect(result.recipient_username).toBe('anirban');
      expect(result.delivered_at).toBeDefined();

      // Verify recipient receives it in their inbox
      const prof = await getPublicProfile('anirban');
      const inbox = await getInboxMessages(prof.profile!.id);
      const found = inbox.messages.find(m => m.id === result.message_id);
      expect(found).toBeDefined();
      expect(found?.content).toBe(payload.content);
      expect(found?.category).toBe('secret');
      expect(found?.is_read).toBe(false);
    });

    it('supports all seven Bengali message categories', async () => {
      const categories: MessageCategory[] = ['secret', 'confession', 'compliment', 'fun', 'advice', 'friendship', 'other'];
      for (const cat of categories) {
        expect(CATEGORIES[cat]).toBeDefined();
        expect(CATEGORIES[cat].labelBn).toBeTruthy();
        
        const result = await sendAnonymousLetter({
          recipient_username: 'priya',
          category: cat,
          content: `টেস্ট বার্তা: ${cat}`,
        });
        expect(result.success).toBe(true);
      }
    });
  });

  // ==========================================================================
  // TEST B: Guest creates their own letterbox
  // ==========================================================================
  describe('TEST B: Letterbox creation and validation', () => {
    it('validates unique username format according to security rules', () => {
      // Valid usernames
      expect(USERNAME_REGEX.test('anirban')).toBe(true);
      expect(USERNAME_REGEX.test('priya_s')).toBe(true);
      expect(USERNAME_REGEX.test('bengali_poet_2026')).toBe(true);

      // Invalid usernames (special chars, too short, spaces, injection)
      expect(USERNAME_REGEX.test('an')).toBe(false); // < 3 chars
      expect(USERNAME_REGEX.test('anirban@mail')).toBe(false);
      expect(USERNAME_REGEX.test('priya sen')).toBe(false); // space
      expect(USERNAME_REGEX.test('user;DROP TABLE--')).toBe(false); // SQL injection
    });

    it('rejects registration with invalid email or weak password', async () => {
      const emptyEmailRes = await signUpWithEmail('', 'password123', 'testuser', 'Test User');
      expect(emptyEmailRes.success).toBe(false);
      expect(emptyEmailRes.error).toContain('ইমেইল এবং পাসওয়ার্ড আবশ্যক');

      const weakPassRes = await signUpWithEmail('test@example.com', '123', 'testuser', 'Test User');
      expect(weakPassRes.success).toBe(false);
      expect(weakPassRes.error).toContain('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের');
    });
  });

  // ==========================================================================
  // TEST C: Returning user authentication
  // ==========================================================================
  describe('TEST C: Authentication and Session Restoration', () => {
    it('validates required fields on sign in', async () => {
      const res = await signInWithEmail('', '');
      expect(res.success).toBe(false);
      expect(res.error).toContain('ইমেইল এবং পাসওয়ার্ড প্রদান করুন');
    });

    it('successfully signs up a new user and allows immediate sign in', async () => {
      const uniqueUsername = 'test_' + Date.now().toString(36);
      const uniqueEmail = `${uniqueUsername}@example.com`;
      const pass = 'secret123';

      const signupRes = await signUpWithEmail(uniqueEmail, pass, uniqueUsername, 'পরীক্ষামূলক ব্যবহারকারী');
      expect(signupRes.success).toBe(true);
      expect(signupRes.user).toBeDefined();
      expect(signupRes.profile?.username).toBe(uniqueUsername);

      // Sign in with the newly registered user
      const signinRes = await signInWithEmail(uniqueEmail, pass);
      expect(signinRes.success).toBe(true);
      expect(signinRes.user?.email).toBe(uniqueEmail);
      expect(signinRes.profile?.username).toBe(uniqueUsername);

      // Sign out to clean up session state
      await signOutUser();
    });

    it('rejects sign in with incorrect password', async () => {
      const res = await signInWithEmail('anirban@example.com', 'wrong_password_999');
      expect(res.success).toBe(false);
      expect(res.error).toContain('পাসওয়ার্ডটি সঠিক নয়');
    });

    it('supports Google Sign Up and automatic account creation', async () => {
      const googleEmail = `google_${Date.now()}@gmail.com`;
      const googleName = 'বিপ্র দাস';
      const res = await signUpOrSignInWithGoogleAccount(googleEmail, googleName);
      expect(res.success).toBe(true);
      expect(res.user?.email).toBe(googleEmail);
      expect(res.profile?.display_name).toBe(googleName);
      expect(res.profile?.username).toBeDefined();

      // Subsequent Google Sign In with the same email restores the account
      const signinRes = await signUpOrSignInWithGoogleAccount(googleEmail, googleName);
      expect(signinRes.success).toBe(true);
      expect(signinRes.user?.id).toBe(res.user?.id);
    });
  });

  // ==========================================================================
  // TEST D: Privacy and security access rules
  // ==========================================================================
  describe('TEST D: Privacy and RLS Data Isolation', () => {
    it('ensures recipient inbox letters do NOT expose sender email or sender identity metadata', async () => {
      const inbox = await getInboxMessages('demo-anirban-id');
      expect(inbox.messages.length).toBeGreaterThan(0);

      for (const msg of inbox.messages) {
        // Recipient must only see content, category, dates, and recipient_id
        expect((msg as any).sender_id).toBeUndefined();
        expect((msg as any).sender_email).toBeUndefined();
        expect((msg as any).sender_ip).toBeUndefined();
        expect((msg as any).client_ip_hash).toBeUndefined();
        expect((msg as any).user_agent_hash).toBeUndefined();
      }
    });

    it('isolates inboxes so User A cannot read User B private messages', async () => {
      const anirbanInbox = await getInboxMessages('demo-anirban-id');
      const priyaInbox = await getInboxMessages('demo-priya-id');

      // None of Priya's specific letters should appear in Anirban's inbox
      const anirbanMessageIds = anirbanInbox.messages.map(m => m.id);
      const priyaMessageIds = priyaInbox.messages.map(m => m.id);

      for (const id of priyaMessageIds) {
        expect(anirbanMessageIds).not.toContain(id);
      }

      // Verify that recipient IDs match their respective owners
      for (const msg of anirbanInbox.messages) {
        expect(msg.recipient_id).toBe('demo-anirban-id');
      }
      for (const msg of priyaInbox.messages) {
        expect(msg.recipient_id).toBe('demo-priya-id');
      }
    });
  });

  // ==========================================================================
  // TEST E: Error handling, edge cases & rate limits
  // ==========================================================================
  describe('TEST E: Error cases and validation', () => {
    it('rejects empty message submission with descriptive Bengali error', async () => {
      const res = await sendAnonymousLetter({
        recipient_username: 'anirban',
        category: 'secret',
        content: '   ',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('চিঠি ফাঁকা রাখা যাবে না');
    });

    it('rejects message exceeding 1000 characters limit', async () => {
      const longText = 'ক'.repeat(1005);
      const res = await sendAnonymousLetter({
        recipient_username: 'anirban',
        category: 'secret',
        content: longText,
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('সর্বোচ্চ ১০০০ অক্ষর');
    });

    it('rejects sending letter to non-existent username', async () => {
      const res = await sendAnonymousLetter({
        recipient_username: 'non_existent_ghost_user_9999',
        category: 'secret',
        content: 'হ্যালো, কেউ আছেন?',
      });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/চিঠি বাক্স পাওয়া যায়নি|প্রাপক খুঁজে পাওয়া যায়নি/);
    });

    it('rejects submission when recipient has paused their inbox', async () => {
      // tashfeen has inbox_paused = true
      const res = await sendAnonymousLetter({
        recipient_username: 'tashfeen',
        category: 'secret',
        content: 'আপনার চিঠি বাক্স খোলা থাকলে এই চিঠি পেতেন।',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('চিঠি বাক্সটি বর্তমানে সাময়িকভাবে বন্ধ আছে');
    });

    it('rejects invalid category selection', async () => {
      const res = await sendAnonymousLetter({
        recipient_username: 'anirban',
        category: 'invalid_malicious_category' as any,
        content: 'পরীক্ষামূলক চিঠি',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('অবৈধ চিঠির বিভাগ');
    });

    it('correctly handles @-prefixed recipient username during profile lookup and sending', async () => {
      const profileRes = await getPublicProfile('@anirban');
      expect(profileRes.profile).not.toBeNull();
      expect(profileRes.profile?.username).toBe('anirban');

      const sendRes = await sendAnonymousLetter({
        recipient_username: '@anirban',
        category: 'compliment',
        content: 'আপনার কাজ অসাধারণ!',
      });
      expect(sendRes.success).toBe(true);
      expect(sendRes.recipient_username).toBe('anirban');
    });

    it('handles email verification resend flow correctly', async () => {
      const invalidRes = await resendVerificationEmail('not-an-email');
      expect(invalidRes.success).toBe(false);
      expect(invalidRes.error).toContain('অনুগ্রহ করে সঠিক ইমেইল ঠিকানা দিন');

      const validRes = await resendVerificationEmail('user@example.com');
      expect(validRes.success).toBe(true);
      expect(validRes.message).toBeDefined();
    });
  });
});
