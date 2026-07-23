import { useState } from 'react';
import { supabase, supabaseConfigured } from '../lib/supabase';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error | denied
  const [msg, setMsg] = useState('');

  async function send(e) {
    e.preventDefault();
    setStatus('sending');
    setMsg('');
    try {
      // Gate: founder or a live invite (server-side RPC).
      const { data: allowed, error: gateErr } = await supabase.rpc('is_email_allowed', {
        p_email: email,
      });
      if (gateErr) throw gateErr;
      if (!allowed) {
        setStatus('denied');
        setMsg('That email is not on the invite list. Ask an admin to invite you.');
        return;
      }
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin + '/deals' },
      });
      if (error) throw error;
      setStatus('sent');
    } catch (err) {
      setStatus('error');
      setMsg(err.message || 'Something went wrong.');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="font-display text-3xl font-semibold tracking-tight">
            MFDA<span className="text-gold">.</span>
          </div>
          <p className="text-muted text-sm mt-1">Multifamily Deal Analyzer · Alot Of Land</p>
        </div>

        {!supabaseConfigured && (
          <div className="card p-4 mb-4 text-sm text-danger">
            Supabase isn’t configured yet. Set <code>VITE_SUPABASE_URL</code> and{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code>.
          </div>
        )}

        {status === 'sent' ? (
          <div className="card p-6 text-center">
            <p className="font-medium">Check your email</p>
            <p className="text-muted text-sm mt-2">
              We sent a magic sign-in link to <span className="text-ink">{email}</span>.
            </p>
          </div>
        ) : (
          <form onSubmit={send} className="card p-6 space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <button className="btn-gold w-full" disabled={status === 'sending' || !supabaseConfigured}>
              {status === 'sending' ? 'Sending…' : 'Send magic link'}
            </button>
            {msg && <p className="text-sm text-danger">{msg}</p>}
          </form>
        )}
      </div>
    </div>
  );
}
