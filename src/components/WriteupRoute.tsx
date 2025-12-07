// src/components/WriteupRoute.tsx
import { useAuthContext } from "../contexts/AuthContext";
import { Navigate } from "react-router-dom";

interface WriteupRouteProps {
  children: React.ReactNode;
}

const WriteupRoute = ({ children }: WriteupRouteProps) => {
  const { user, loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Allow all authenticated users (including admins) to access writeups
  return <>{children}</>;
};

export default WriteupRoute;