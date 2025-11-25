// src/components/UserOnlyRoute.tsx
import { useAdminContext } from "../contexts/AdminContext";
import { Navigate } from "react-router-dom";

interface UserOnlyRouteProps {
  children: React.ReactNode;
}

const UserOnlyRoute = ({ children }: UserOnlyRouteProps) => {
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

  // Redirect to admin panel if user is admin/moderator
  if (isAdmin || isModerator) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
};

export default UserOnlyRoute;