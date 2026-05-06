import { useLocalStorage } from './useLocalStorage.js';

export default function TodaysFocus() {
  const [focus, setFocus] = useLocalStorage('alot-focus', '');

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-white tracking-tight">Today's Focus</h2>
        <span className="text-xs text-zinc-600">{today}</span>
      </div>
      <textarea
        value={focus}
        onChange={e => setFocus(e.target.value)}
        placeholder="What's the one thing that moves the needle today?&#10;&#10;— Close the Smith County deal&#10;— Call back the AZ buyers&#10;— Review entitlement docs for Nashville parcel"
        className="flex-1 min-h-[160px] w-full bg-zinc-800/50 border border-zinc-700/60 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-500 resize-none leading-relaxed"
      />
      {focus && (
        <div className="flex justify-end mt-2">
          <button
            onClick={() => setFocus('')}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </section>
  );
}
