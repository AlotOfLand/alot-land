import { useAuth, signOut } from '../lib/auth.jsx';

export default function MobileHeader() {
  const { user } = useAuth();
  return (
    <header
      className="md:hidden sticky top-0 z-30 bg-panel/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-3"
      style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.75rem)' }}
    >
      <img src="/brand-mark.png?v=4" alt="" width={32} height={32} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-display text-base leading-none">Time Audit</div>
        <div className="text-[10px] tracking-wider text-muted truncate">{user?.email}</div>
      </div>
      <button
        onClick={signOut}
        className="text-[11px] text-muted hover:text-text px-2 py-1"
      >
        Sign out
      </button>
    </header>
  );
}
