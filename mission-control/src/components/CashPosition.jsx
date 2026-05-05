import { useLocalStorage } from './useLocalStorage.js';

function formatCurrency(val) {
  if (!val && val !== 0) return '$0';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(val));
}

export default function CashPosition() {
  const [data, setData] = useLocalStorage('alot-cash', { balance: '', burnRate: '' });

  const balance = Number(data.balance) || 0;
  const burnRate = Number(data.burnRate) || 0;

  const runwayDays = burnRate > 0 ? Math.floor((balance / burnRate) * 30) : null;
  const runwayMonths = runwayDays !== null ? (runwayDays / 30).toFixed(1) : null;

  const runwayColor =
    runwayDays === null ? 'text-zinc-500' :
    runwayDays < 30 ? 'text-red-400' :
    runwayDays < 90 ? 'text-amber-400' :
    'text-green-400';

  const balanceBarPct = burnRate > 0 ? Math.min(100, (balance / (burnRate * 6)) * 100) : 0;

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
      <h2 className="text-lg font-semibold text-white tracking-tight mb-4">Cash Position</h2>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">Current Balance</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
            <input
              type="number"
              value={data.balance}
              onChange={e => setData(d => ({ ...d, balance: e.target.value }))}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-zinc-500 mb-1.5 block">30-Day Burn Rate</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">$</span>
            <input
              type="number"
              value={data.burnRate}
              onChange={e => setData(d => ({ ...d, burnRate: e.target.value }))}
              placeholder="0"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        <div className="pt-1 border-t border-zinc-800 space-y-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-zinc-500">Balance</span>
            <span className="text-2xl font-bold text-white font-mono">{formatCurrency(balance)}</span>
          </div>

          {burnRate > 0 && (
            <>
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-xs text-zinc-500">Runway</span>
                  <span className={`text-sm font-semibold ${runwayColor}`}>
                    {runwayDays}d ({runwayMonths}mo)
                  </span>
                </div>
                <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      runwayDays < 30 ? 'bg-red-500' :
                      runwayDays < 90 ? 'bg-amber-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${balanceBarPct}%` }}
                  />
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-600">Daily burn</span>
                <span className="text-zinc-400 font-mono">{formatCurrency(burnRate / 30)}/day</span>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
