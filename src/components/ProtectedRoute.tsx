import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Require2FASetup } from "@/components/Require2FASetup";
import { useRolePermissions } from "@/hooks/useRolePermissions";

export const ProtectedRoute = ({ children, requireAdmin }: { children: React.ReactNode; requireAdmin?: boolean }) => {
  const { user, loading } = useAuth();
  const { isSuperAdmin, hasRole } = useRolePermissions();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && !isSuperAdmin && !hasRole("admin")) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <Require2FASetup>
      {children}
    </Require2FASetup>
  );
};

export const AdminProtectedPage = ({ children }: { children: React.ReactNode }) => (
  <ProtectedRoute requireAdmin>
    {children}
  </ProtectedRoute>
);
