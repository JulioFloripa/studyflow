import { useAuth } from '@/hooks/useAuth';
import Dashboard from '@/pages/Dashboard';

const DashboardRouter = () => {
  const { user } = useAuth();
  const role = (user as any)?.user_metadata?.role || 'student';
  if (role === 'coordinator') return <Dashboard />;
  return <Dashboard />;
};

export default DashboardRouter;
