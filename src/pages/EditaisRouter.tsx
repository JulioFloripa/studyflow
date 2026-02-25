import React from 'react';
import { useUserRole } from '@/hooks/useUserRole';
import CoordinatorEditais from './CoordinatorEditais';
import StudentEditais from './StudentEditais';
import { Loader2 } from 'lucide-react';

const EditaisRouter = () => {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return role === 'coordinator' ? <CoordinatorEditais /> : <StudentEditais />;
};

export default EditaisRouter;
