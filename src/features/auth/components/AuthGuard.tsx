/**
 * AuthGuard - Centralized Authentication Guard for Protected Routes
 * 
 * Provides role-based route protection with proper security practices:
 * - Session validation
 * - Role verification
 * - Suspicious activity monitoring
 * - Secure redirects
 * 
 * Usage:
 *   <AuthGuard requiredRole="manager" fallback="/login">
 *     <ProtectedContent />
 *   </AuthGuard>
 * 
 * Or with multiple roles:
 *   <AuthGuard requiredRoles={['manager', 'submanager']} fallback="/login">
 *     <ProtectedContent />
 *   </AuthGuard>
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth, type AppRole } from '@/features/auth/AuthContext';
import { logWarning, logError } from '@/shared/lib/errorLogger';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredRole?: AppRole;
  requiredRoles?: AppRole[];
  fallback?: string;
  /** Show loading spinner while authenticating */
  showLoader?: boolean;
  /** Custom loading component */
  loadingComponent?: React.ReactNode;
}

interface AuthState {
  isAuthenticated: boolean;
  hasRequiredRole: boolean;
  isLoading: boolean;
  error: string | null;
}

// Default loading spinner
const DefaultLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="h-8 w-8 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
      <p className="text-muted-foreground text-sm">Verifying session...</p>
    </div>
  </div>
);

/**
 * Hook to detect suspicious authentication activity
 */
function useAuthSecurityMonitor() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (user) {
      // Log session info for security audit (without sensitive data)
      const sessionAge = Date.now() - (user.created_at ? new Date(user.created_at).getTime() : 0);
      
      // Flag suspicious patterns (session created in the future or too old)
      if (sessionAge < 0 || sessionAge > 30 * 24 * 60 * 60 * 1000) {
        logWarning('AuthSecurity', `Unusual session age detected: ${sessionAge}ms`);
      }
    }
  }, [user]);
}

/**
 * AuthGuard component - protects routes based on role requirements
 */
export const AuthGuard: React.FC<AuthGuardProps> = ({
  children,
  requiredRole,
  requiredRoles,
  fallback = '/',
  showLoader = true,
  loadingComponent,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, userRole, loading } = useAuth();
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    hasRequiredRole: false,
    isLoading: true,
    error: null,
  });

  // Security monitoring
  useAuthSecurityMonitor();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Still loading - wait
        if (loading) {
          setAuthState(prev => ({ ...prev, isLoading: true }));
          return;
        }

        // Not authenticated
        if (!user) {
          logWarning('AuthGuard', `Unauthenticated access attempt to ${location.pathname}`);
          setAuthState({
            isAuthenticated: false,
            hasRequiredRole: false,
            isLoading: false,
            error: 'Authentication required',
          });
          
          // Redirect to fallback with return URL
          navigate(`${fallback}?returnUrl=${encodeURIComponent(location.pathname)}`, { replace: true });
          return;
        }

        // Check role requirements
        let hasRole = true;
        if (requiredRole) {
          hasRole = userRole?.role === requiredRole;
        } else if (requiredRoles && requiredRoles.length > 0) {
          hasRole = userRole ? requiredRoles.includes(userRole.role) : false;
        }

        // Check if account is suspended
        const isSuspended = userRole?.approval_status === 'suspended';
        if (isSuspended) {
          logWarning('AuthGuard', `Suspended account access attempt: ${user.id}`);
          setAuthState({
            isAuthenticated: true,
            hasRequiredRole: false,
            isLoading: false,
            error: 'Account suspended',
          });
          navigate('/?error=account_suspended', { replace: true });
          return;
        }

        if (!hasRole) {
          logWarning('AuthGuard', `Insufficient privileges: required ${requiredRole || requiredRoles?.join(', ')}, got ${userRole?.role}`);
          setAuthState({
            isAuthenticated: true,
            hasRequiredRole: false,
            isLoading: false,
            error: 'Insufficient privileges',
          });
          
          // Redirect to appropriate dashboard based on role
          const roleDashboard: Record<string, string> = {
            manager: '/',
            tenant: '/portal',
            landlord: '/landlord/dashboard',
            webhost: '/webhost',
            agency: '/agency',
            submanager: '/',
          };
          const redirectTo = userRole?.role ? roleDashboard[userRole.role] || '/' : '/';
          navigate(redirectTo, { replace: true });
          return;
        }

        setAuthState({
          isAuthenticated: true,
          hasRequiredRole: true,
          isLoading: false,
          error: null,
        });

      } catch (error) {
        logError('AuthGuard', `Auth check failed: ${error}`);
        setAuthState({
          isAuthenticated: false,
          hasRequiredRole: false,
          isLoading: false,
          error: 'Authentication check failed',
        });
      }
    };

    checkAuth();
  }, [user, userRole, loading, requiredRole, requiredRoles, fallback, navigate, location.pathname]);

  // Show loader while checking auth
  if (authState.isLoading || loading) {
    if (showLoader) {
      return loadingComponent ? <>{loadingComponent}</> : <DefaultLoader />;
    }
    return null;
  }

  // Not authorized
  if (!authState.isAuthenticated || !authState.hasRequiredRole) {
    return null;
  }

  return <>{children}</>;
};

/**
 * HOC version of AuthGuard for class components or advanced use
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requiredRole?: AppRole;
    requiredRoles?: AppRole[];
    fallback?: string;
  }
) {
  return function GuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

/**
 * Hook for programmatic auth checking
 */
export function useAuthCheck() {
  const { user, userRole, loading } = useAuth();
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    hasRequiredRole: false,
    isLoading: loading,
    error: null,
  });

  useEffect(() => {
    setState({
      isAuthenticated: !!user,
      hasRequiredRole: !!user && !!userRole,
      isLoading: loading,
      error: null,
    });
  }, [user, userRole, loading]);

  return {
    ...state,
    isManager: userRole?.role === 'manager',
    isTenant: userRole?.role === 'tenant',
    isLandlord: userRole?.role === 'landlord',
    isWebhost: userRole?.role === 'webhost',
    isAgency: userRole?.role === 'agency',
    isSubmanager: userRole?.role === 'submanager',
    isApproved: userRole?.approval_status === 'approved',
    isSuspended: userRole?.approval_status === 'suspended',
  };
}
