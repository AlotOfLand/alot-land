import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useOrg } from '../lib/org';
import { listDeals } from '../lib/queries';
import { usd } from '../lib/format';

const STATUS_STYLES = {
  lead: 'bg-surface-2 text-ink-2',
  analyzing: 'bg-blue/15 text-blue',
  pursue: 'bg-green/15 text-green-deep',
  passed: 'bg-surface-2 text-muted',
  closed: 'bg-gold/20 text-warn',
};

export default function Deals() {
  const { org } = useOrg();
  const deals = useQuery({ queryKey: ['deals', org?.id], queryFn: () => listDeals(org.id), enabled: !!org });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl font-semibold">Deals</h1>
          <p className="text-muted text-sm">Underwrite, compare scenarios, and pursue the good ones.</p>
        </div>
        <Link to="/deals/new" className="btn-gold">+ New deal</Link>
      </div>

      {deals.isLoading && <div className="text-muted">Loading…</div>}
      {deals.error && <div className="text-danger text-sm">{String(deals.error.message)}</div>}

      {deals.data && deals.data.length === 0 && (
        <div className="card p-10 text-center">
          <p className="font-medium">No deals yet</p>
          <p className="text-muted text-sm mt-1">Enter your first deal to see it underwritten against real data.</p>
          <Link to="/deals/new" className="btn-gold mt-4 inline-flex">+ New deal</Link>
        </div>
      )}

      {deals.data && deals.data.length > 0 && (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="th">Property</th>
                <th className="th">Market</th>
                <th className="th text-right">Units</th>
                <th className="th text-right">Price</th>
                <th className="th">Status</th>
                <th className="th">Updated</th>
              </tr>
            </thead>
            <tbody>
              {deals.data.map((d) => (
                <tr key={d.id} className="hover:bg-surface-2/60">
                  <td className="td">
                    <Link to={`/deals/${d.id}`} className="font-medium hover:underline">
                      {d.address || 'Untitled deal'}
                    </Link>
                  </td>
                  <td className="td text-ink-2">{[d.city, d.state].filter(Boolean).join(', ') || '—'}</td>
                  <td className="td text-right">{d.units_count ?? '—'}</td>
                  <td className="td text-right">{usd(Number(d.price))}</td>
                  <td className="td">
                    <span className={`pill ${STATUS_STYLES[d.status] || 'bg-surface-2'}`}>{d.status}</span>
                  </td>
                  <td className="td text-muted text-xs">{new Date(d.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
