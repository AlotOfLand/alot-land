import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { isEmailAllowed } from '../lib/queries';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  async function send(e) {
    e.preventDefault();
    setError('');
    const v = email.toLowerCase().trim();
    if (!v) return;

    setStatus('checking');

    // Server-side allow-list check (Supabase RPC). Anyone whose email isn't on
    // the allowed_emails table gets a friendly bounce here — no magic link sent.
    try {
      const allowed = await isEmailAllowed(v);
      if (!allowed) {
        setError(
          'This email is not on the access list. Ask David to invite you.'
        );
        setStatus('idle');
        return;
      }
    } catch (err) {
      console.error('Allow-list check failed', err);
      setError('Could not verify access. Try again in a moment.');
      setStatus('idle');
      return;
    }

    setStatus('sending');
    const { error: signInError } = await supabase.auth.signInWithOtp({
      email: v,
      options: { emailRedirectTo: window.location.origin },
    });
    if (signInError) {
      setError(signInError.message);
      setStatus('idle');
    } else {
      setStatus('sent');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="mb-10 text-center">
          <img
            src="/favicon-192.png?v=4"
            alt=""
            width={72}
            height={72}
            className="mx-auto mb-4 rounded-2xl"
          />
          <div className="font-display text-3xl tracking-tight">Time Audit</div>
          <div className="mt-2 text-sm text-muted">Powered by Alot.Land · private</div>
        </div>

        {status === 'sent' ? (
          <div className="rounded-2xl border border-border bg-panel p-8 text-center">
            <div className="text-gold font-medium mb-2">Check your email</div>
            <div className="text-sm text-muted">
              We sent a magic link to <span className="text-text">{email}</span>. Click it on this
              device to sign in.
            </div>
            <button
              onClick={() => setStatus('idle')}
              className="mt-6 text-xs text-muted hover:text-text underline"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={send} className="rounded-2xl border border-border bg-panel p-8 space-y-4">
            <label className="block">
              <span className="text-xs uppercase tracking-wider text-muted">Email</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full bg-bg border border-border-hi rounded-xl px-4 py-3 outline-none focus:border-gold transition"
                placeholder="you@example.com"
              />
            </label>
            {error && <div className="text-sm text-danger">{error}</div>}
            <button
              type="submit"
              disabled={status === 'sending' || status === 'checking'}
              className="w-full rounded-xl bg-gold text-bg font-semibold py-3 hover:brightness-110 transition disabled:opacity-60"
            >
              {status === 'checking'
                ? 'Checking…'
                : status === 'sending'
                  ? 'Sending…'
                  : 'Send magic link'}
            </button>
            <p className="text-xs text-muted text-center">
              No password — we'll email you a one-click sign-in link.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
