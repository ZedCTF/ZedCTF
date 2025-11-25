// src/components/AdminOnlyRoute.tsx
import { useAdminContext } from "../contexts/AdminContext";
import { Navigate } from "react-router-dom";

interface AdminOnlyRouteProps {
  children: React.ReactNode;
}

const AdminOnlyRoute = ({ children }: AdminOnlyRouteProps) => {
  const { isAdmin, isModerator, loading } = useAdminContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // Redirect to home if not admin/moderator
  if (!isAdmin && !isModerator) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

export default AdminOnlyRoute;