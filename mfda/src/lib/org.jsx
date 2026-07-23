import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

/**
 * Current-org context. A user may belong to several orgs; we keep the active
 * one in localStorage. Role drives admin-only UI (invites, market config).
 */
const OrgCtx = createContext({ orgs: [], org: null, role: null, loading: true, setOrg: () => {}, refresh: () => {} });

const LS_KEY = 'mfda.activeOrg';

export function OrgProvider({ children }) {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState([]);
  const [orgId, setOrgId] = useState(() => localStorage.getItem(LS_KEY) || null);
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) {
      setOrgs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('org_members')
      .select('role, org:orgs(id, name, plan, status)')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('org load', error);
      setOrgs([]);
    } else {
      const rows = (data || [])
        .filter((r) => r.org)
        .map((r) => ({ id: r.org.id, name: r.org.name, plan: r.org.plan, status: r.org.status, role: r.role }));
      setOrgs(rows);
      if (rows.length && (!orgId || !rows.some((o) => o.id === orgId))) {
        setOrgId(rows[0].id);
        localStorage.setItem(LS_KEY, rows[0].id);
      }
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const org = orgs.find((o) => o.id === orgId) || null;

  function setOrg(id) {
    setOrgId(id);
    localStorage.setItem(LS_KEY, id);
  }

  return (
    <OrgCtx.Provider value={{ orgs, org, role: org?.role ?? null, loading, setOrg, refresh: load }}>
      {children}
    </OrgCtx.Provider>
  );
}

export const useOrg = () => useContext(OrgCtx);
