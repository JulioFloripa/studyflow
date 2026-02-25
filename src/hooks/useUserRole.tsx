import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'coordinator' | 'student';

// Global override for testing
let roleOverride: AppRole | null = null;
const listeners = new Set<() => void>();

export const useUserRole = () => {
  const { user } = useAuth();
  const [dbRole, setDbRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [, forceUpdate] = useState(0);

  // Listen for override changes
  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }, []);

  useEffect(() => {
    if (!user) {
      setDbRole(null);
      setLoading(false);
      return;
    }

    const fetchRole = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setDbRole(data.role as AppRole);
      } else {
        setDbRole('coordinator');
      }
      setLoading(false);
    };

    fetchRole();
  }, [user?.id]);

  const role = roleOverride || dbRole;
  const isCoordinator = role === 'coordinator';
  const isStudent = role === 'student';

  const setRoleOverride = useCallback((newRole: AppRole | null) => {
    roleOverride = newRole;
    listeners.forEach(fn => fn());
  }, []);

  const isOverridden = roleOverride !== null;

  return { role, loading, isCoordinator, isStudent, setRoleOverride, isOverridden, dbRole };
};
