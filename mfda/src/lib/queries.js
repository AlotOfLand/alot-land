import { supabase } from './supabase';

/** Canonical property key = APN + county FIPS, fallback normalized address hash. */
export function dedupeKey({ apn, county_fips, address, city, state, zip }) {
  if (apn && county_fips) return `apn:${county_fips}:${apn}`.toLowerCase();
  const norm = [address, city, state, zip]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return `addr:${norm}`;
}

// ---- Deals ----------------------------------------------------------------
export async function listDeals(orgId) {
  const { data, error } = await supabase
    .from('deals')
    .select('*')
    .eq('org_id', orgId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function getDeal(id) {
  const { data, error } = await supabase.from('deals').select('*').eq('id', id).single();
  if (error) throw error;
  return data;
}

export async function upsertDeal(orgId, userId, deal) {
  const row = {
    org_id: orgId,
    apn: deal.apn || null,
    county_fips: deal.county_fips || null,
    dedupe_key: dedupeKey(deal),
    address: deal.address || null,
    city: deal.city || null,
    state: deal.state || null,
    zip: deal.zip || null,
    status: deal.status || 'analyzing',
    units_count: deal.units_count ?? null,
    year_built: deal.year_built ?? null,
    price: deal.price ?? null,
    source: deal.source || 'manual',
    notes: deal.notes || null,
  };
  if (deal.id) {
    const { data, error } = await supabase.from('deals').update(row).eq('id', deal.id).select().single();
    if (error) throw error;
    return data;
  }
  const { data, error } = await supabase
    .from('deals')
    .insert({ ...row, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---- Units ----------------------------------------------------------------
export async function getUnits(dealId) {
  const { data, error } = await supabase
    .from('units')
    .select('*')
    .eq('deal_id', dealId)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data;
}

export async function replaceUnits(orgId, dealId, units) {
  await supabase.from('units').delete().eq('deal_id', dealId);
  if (!units.length) return [];
  const rows = units.map((u, i) => ({
    org_id: orgId,
    deal_id: dealId,
    type: u.type,
    count: u.count,
    sqft: u.sqft,
    actual_rent: u.actual_rent,
    market_rent: u.market_rent,
    sort_order: i,
  }));
  const { data, error } = await supabase.from('units').insert(rows).select();
  if (error) throw error;
  return data;
}

// ---- Scenarios (immutable) ------------------------------------------------
export async function listScenarios(dealId) {
  const { data, error } = await supabase
    .from('scenarios')
    .select('*')
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveScenario(orgId, userId, dealId, { label, inputs, outputs, calc_version }) {
  const { data, error } = await supabase
    .from('scenarios')
    .insert({ org_id: orgId, deal_id: dealId, label, inputs, outputs, calc_version, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ---- Markets --------------------------------------------------------------
export async function listMarkets(orgId) {
  const { data, error } = await supabase
    .from('markets')
    .select('*')
    .eq('org_id', orgId)
    .order('state', { ascending: true });
  if (error) throw error;
  return data;
}

// ---- Cost ledger ----------------------------------------------------------
export async function logCost(orgId, userId, { deal_id, kind, provider, description, amount_usd }) {
  const { error } = await supabase.from('cost_ledger').insert({
    org_id: orgId,
    deal_id: deal_id || null,
    kind,
    provider: provider || null,
    description: description || null,
    amount_usd: amount_usd || 0,
    created_by: userId,
  });
  if (error) console.error('cost_ledger', error);
}

// ---- Invites (admin) ------------------------------------------------------
export async function listInvites(orgId) {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createInvite(orgId, userId, { email, role }) {
  const { data, error } = await supabase
    .from('invites')
    .insert({ org_id: orgId, email: email.toLowerCase().trim(), role, invited_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function revokeInvite(id) {
  const { error } = await supabase.from('invites').delete().eq('id', id);
  if (error) throw error;
}

export async function listMembers(orgId) {
  const { data, error } = await supabase
    .from('org_members')
    .select('role, created_at, user_id')
    .eq('org_id', orgId);
  if (error) throw error;
  return data;
}
