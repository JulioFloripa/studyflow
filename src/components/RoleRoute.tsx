import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface RoleRouteProps {
  children: React.ReactNode;
  allowedRoles: string[];
}

const RoleRoute: React.FC<RoleRouteProps> = ({ children, allowedRoles }) => {
  const { user } = useAuth();
  const role = (user as any)?.user_metadata?.role || 'student';
  if (!allowedRoles.includes(role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

export default RoleRoute;
