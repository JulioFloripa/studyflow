import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type AppRole = 'coordinator' | 'student';

export const useUserRole = () => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
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
        setRole(data.role as AppRole);
      } else {
        // Default to coordinator if no role found
        setRole('coordinator');
      }
      setLoading(false);
    };

    fetchRole();
  }, [user?.id]);

  const isCoordinator = role === 'coordinator';
  const isStudent = role === 'student';

  return { role, loading, isCoordinator, isStudent };
};
