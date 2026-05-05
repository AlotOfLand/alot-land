import { useState, useEffect } from 'react';
import Dashboard from './Dashboard.jsx';

function Spinner() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
    </div>
  );
}

function LoginScreen({ onLogin }) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-8">
          <img src="/images/alotdotland_sqLogo.png" alt="A Lot of Land" className="w-12 h-12 mx-auto mb-6 rounded-xl opacity-90" />
          <h1 className="text-2xl font-bold text-white tracking-tight">Mission Control</h1>
          <p className="text-sm text-zinc-500 mt-1.5">A Lot of Land LLC — Private Dashboard</p>
        </div>
        <button
          onClick={onLogin}
          className="w-full bg-amber-500 hover:bg-amber-400 text-black font-semibold py-3 rounded-xl text-sm transition-colors"
        >
          Log In
        </button>
        <p className="text-xs text-zinc-700 mt-6">Secured via Netlify Identity</p>
      </div>
    </div>
  );
}

export default function AuthGate() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ni = window.netlifyIdentity;
    if (!ni) { setReady(true); return; }

    ni.on('init', (u) => { setUser(u); setReady(true); });
    ni.on('login', (u) => { setUser(u); ni.close(); });
    ni.on('logout', () => setUser(null));
    ni.init({ APIUrl: 'https://alotofland.netlify.app/.netlify/identity' });
  }, []);

  const handleLogin = () => window.netlifyIdentity?.open('login');
  const handleLogout = () => window.netlifyIdentity?.logout();

  if (!ready) return <Spinner />;
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}
