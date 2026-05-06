import { useState, useEffect } from 'react';
import ActiveDeals from './components/ActiveDeals.jsx';
import CashPosition from './components/CashPosition.jsx';
import TodaysFocus from './components/TodaysFocus.jsx';
import WeeklyTasks from './components/WeeklyTasks.jsx';

// ── Auth gate ────────────────────────────────────────────────────────────────

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
          <div className="w-12 h-12 mx-auto mb-6 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <span className="text-amber-400 text-xl">⚡</span>
          </div>
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

// ── Dashboard layout ─────────────────────────────────────────────────────────

function Dashboard({ user, onLogout }) {
  const weekday = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white font-body">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Header */}
        <header className="flex items-center justify-between pb-2 border-b border-zinc-800/60">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight text-white">Mission Control</h1>
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                A Lot of Land LLC
              </span>
            </div>
            <p className="text-sm text-zinc-500 mt-0.5">{weekday}, {dateStr}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-600">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
              Local — data stays on this device
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs text-zinc-600 truncate max-w-[180px]">{user?.email}</span>
              <button
                onClick={onLogout}
                className="text-xs text-zinc-500 hover:text-white border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        {/* Row 1: Today's Focus + Cash Position */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2"><TodaysFocus /></div>
          <div><CashPosition /></div>
        </div>

        {/* Row 2: Active Deals */}
        <ActiveDeals />

        {/* Row 3: Weekly Tasks */}
        <WeeklyTasks />

        <footer className="text-center text-xs text-zinc-700 pt-4 border-t border-zinc-800/40">
          A Lot of Land LLC · Private dashboard · Data stored locally in your browser
        </footer>
      </div>
    </div>
  );
}

// ── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ni = window.netlifyIdentity;
    if (!ni) { setReady(true); return; }

    ni.on('init', (u) => { setUser(u); setReady(true); });
    ni.on('login', (u) => { setUser(u); ni.close(); });
    ni.on('logout', () => setUser(null));
    ni.init();
  }, []);

  if (!ready) return <Spinner />;
  if (!user) return <LoginScreen onLogin={() => window.netlifyIdentity?.open('login')} />;
  return <Dashboard user={user} onLogout={() => window.netlifyIdentity?.logout()} />;
}
