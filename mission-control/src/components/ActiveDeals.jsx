import { useState } from 'react';
import { useLocalStorage } from './useLocalStorage.js';

const DEAL_TYPES = ['Flip', 'Minor Subdivide', 'Major Entitlement', 'Wholesale', 'Seller Finance', 'Other'];
const STATUSES = ['Lead', 'Due Diligence', 'Under Contract', 'Closing', 'Active', 'On Hold', 'Closed/Won', 'Closed/Lost'];
const STATES = ['TN', 'AZ', 'AR', 'TX', 'FL', 'GA', 'Other / Nationwide'];

const EMPTY_DEAL = {
  address: '',
  state: 'TN',
  dealType: 'Flip',
  status: 'Due Diligence',
  projectedProfit: '',
  nextAction: '',
  nextActionDate: '',
};

function isOverdue(dateStr) {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(dateStr) < today;
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${m}/${d}/${y}`;
}

function formatProfit(val) {
  if (!val && val !== 0) return '—';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);
}

const STATUS_COLORS = {
  'Lead': 'bg-zinc-700 text-zinc-200',
  'Due Diligence': 'bg-amber-900/60 text-amber-300',
  'Under Contract': 'bg-blue-900/60 text-blue-300',
  'Closing': 'bg-purple-900/60 text-purple-300',
  'Active': 'bg-green-900/60 text-green-300',
  'On Hold': 'bg-zinc-700 text-zinc-400',
  'Closed/Won': 'bg-green-800/80 text-green-200',
  'Closed/Lost': 'bg-red-900/60 text-red-400',
};

export default function ActiveDeals() {
  const [deals, setDeals] = useLocalStorage('alot-deals', []);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_DEAL);
  const [sortField, setSortField] = useState('nextActionDate');
  const [sortDir, setSortDir] = useState('asc');

  const openAdd = () => {
    setForm(EMPTY_DEAL);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (deal) => {
    setForm({ ...deal });
    setEditingId(deal.id);
    setShowForm(true);
  };

  const save = () => {
    if (!form.address.trim()) return;
    if (editingId) {
      setDeals(deals.map(d => d.id === editingId ? { ...form, id: editingId } : d));
    } else {
      setDeals([...deals, { ...form, id: crypto.randomUUID() }]);
    }
    setShowForm(false);
  };

  const remove = (id) => {
    if (confirm('Remove this deal?')) setDeals(deals.filter(d => d.id !== id));
  };

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const sorted = [...deals].sort((a, b) => {
    let av = a[sortField] ?? '';
    let bv = b[sortField] ?? '';
    if (sortField === 'projectedProfit') { av = Number(av) || 0; bv = Number(bv) || 0; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const overdueCount = deals.filter(d => isOverdue(d.nextActionDate) && !['Closed/Won','Closed/Lost'].includes(d.status)).length;
  const totalProjected = deals.filter(d => d.projectedProfit && !['Closed/Lost'].includes(d.status))
    .reduce((sum, d) => sum + (Number(d.projectedProfit) || 0), 0);

  const SortIcon = ({ field }) => (
    <span className="ml-1 text-zinc-500 text-xs">
      {sortField === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  );

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-900/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
        <div>
          <h2 className="text-lg font-semibold text-white tracking-tight">Active Deals</h2>
          <div className="flex gap-4 mt-0.5">
            <span className="text-xs text-zinc-500">{deals.length} deal{deals.length !== 1 ? 's' : ''}</span>
            {overdueCount > 0 && (
              <span className="text-xs text-red-400 font-medium">{overdueCount} overdue</span>
            )}
            {totalProjected > 0 && (
              <span className="text-xs text-amber-400">{formatProfit(totalProjected)} projected</span>
            )}
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-black text-sm font-semibold px-3.5 py-1.5 rounded-lg transition-colors"
        >
          + Add Deal
        </button>
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="py-14 text-center text-zinc-600 text-sm">No deals yet — add your first one.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-zinc-500 uppercase tracking-wider border-b border-zinc-800">
                {[['address','Address'],['state','St'],['dealType','Type'],['status','Status'],['projectedProfit','Proj. Profit'],['nextAction','Next Action'],['nextActionDate','Due Date']].map(([field, label]) => (
                  <th
                    key={field}
                    className="px-4 py-2.5 cursor-pointer hover:text-zinc-300 transition-colors whitespace-nowrap"
                    onClick={() => toggleSort(field)}
                  >
                    {label}<SortIcon field={field} />
                  </th>
                ))}
                <th className="px-4 py-2.5 w-16"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(deal => {
                const overdue = isOverdue(deal.nextActionDate) && !['Closed/Won','Closed/Lost'].includes(deal.status);
                return (
                  <tr
                    key={deal.id}
                    className={`border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors ${overdue ? 'bg-red-950/20' : ''}`}
                  >
                    <td className={`px-4 py-3 font-medium max-w-[200px] truncate ${overdue ? 'text-red-300' : 'text-white'}`}>
                      {deal.address}
                    </td>
                    <td className="px-4 py-3 text-zinc-400 whitespace-nowrap">{deal.state}</td>
                    <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{deal.dealType}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[deal.status] ?? 'bg-zinc-700 text-zinc-300'}`}>
                        {deal.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-amber-400 whitespace-nowrap font-mono text-xs">
                      {formatProfit(deal.projectedProfit)}
                    </td>
                    <td className="px-4 py-3 text-zinc-300 max-w-[180px] truncate">{deal.nextAction || '—'}</td>
                    <td className={`px-4 py-3 whitespace-nowrap font-mono text-xs ${overdue ? 'text-red-400 font-bold' : 'text-zinc-400'}`}>
                      {overdue && '⚠ '}{formatDate(deal.nextActionDate)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(deal)} className="text-zinc-500 hover:text-amber-400 transition-colors text-xs">Edit</button>
                        <button onClick={() => remove(deal.id)} className="text-zinc-500 hover:text-red-400 transition-colors text-xs">Del</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
              <h3 className="text-white font-semibold">{editingId ? 'Edit Deal' : 'New Deal'}</h3>
              <button onClick={() => setShowForm(false)} className="text-zinc-500 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs text-zinc-500 mb-1 block">Address / Parcel</label>
                  <input
                    value={form.address}
                    onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    placeholder="123 Hollow Rd, Smith Co, TN"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">State</label>
                  <select
                    value={form.state}
                    onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {STATES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Deal Type</label>
                  <select
                    value={form.dealType}
                    onChange={e => setForm(f => ({ ...f, dealType: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {DEAL_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Status</label>
                  <select
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Projected Profit ($)</label>
                <input
                  type="number"
                  value={form.projectedProfit}
                  onChange={e => setForm(f => ({ ...f, projectedProfit: e.target.value }))}
                  placeholder="25000"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Next Action</label>
                <input
                  value={form.nextAction}
                  onChange={e => setForm(f => ({ ...f, nextAction: e.target.value }))}
                  placeholder="Send purchase agreement to seller"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Next Action Date</label>
                <input
                  type="date"
                  value={form.nextActionDate}
                  onChange={e => setForm(f => ({ ...f, nextActionDate: e.target.value }))}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-zinc-800">
              <button
                onClick={save}
                disabled={!form.address.trim()}
                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold py-2 rounded-lg text-sm transition-colors"
              >
                {editingId ? 'Save Changes' : 'Add Deal'}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-zinc-400 hover:text-white transition-colors">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
