import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './lib/auth.jsx';
import SignIn from './pages/SignIn.jsx';
import Today from './pages/Today.jsx';
import Week from './pages/Week.jsx';
import Trends from './pages/Trends.jsx';
import Reports from './pages/Reports.jsx';
import Settings from './pages/Settings.jsx';
import Sidebar from './components/Sidebar.jsx';

export default function App() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted">
        <div className="animate-pulse">Loading…</div>
      </div>
    );
  }

  if (!session) return <SignIn />;

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/week" element={<Week />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
