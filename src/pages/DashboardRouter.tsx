import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';
import Dashboard from './Dashboard';
import CoordinatorDashboard from './CoordinatorDashboard';

const DashboardRouter = () => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return role === 'student' ? <Dashboard /> : <CoordinatorDashboard />;
};

export default DashboardRouter;
