import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Building2, Home, Loader2 } from "lucide-react";
import { toast } from "@/shared/hooks/use-toast";
import { logError } from "@/shared/lib/errorLogger";

export default function RoleSelection() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'manager' | 'tenant' | null>(null);

  const handleRoleSelect = async (role: 'manager' | 'tenant') => {
    if (!user) return;
    
    setIsLoading(true);
    setSelectedRole(role);

    try {
      // Check if user already has this role
      const { data: existingRoles } = await supabase
        .from('user_roles')
        .select('role, approval_status')
        .eq('user_id', user.id);

      const hasRole = existingRoles?.find(r => r.role === role);
      
      if (hasRole) {
        // User already has this role, just redirect them
        toast({
          title: "Welcome back!",
          description: role === 'manager' 
            ? (hasRole.approval_status === 'pending' ? "Your manager account is pending approval." : "Redirecting to your dashboard...")
            : "Redirecting to your portal...",
        });
        
        await supabase.auth.refreshSession();
        setTimeout(() => {
          window.location.href = role === 'manager' ? '/' : '/portal';
        }, 500);
        return;
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: role,
          approval_status: role === 'manager' ? 'pending' : 'approved',
        });

      if (error) {
        logError('RoleSelection.handleRoleSelect', error);
        toast({
          title: "Error",
          description: "Failed to set your role. Please try again.",
          variant: "destructive",
        });
        setIsLoading(false);
        setSelectedRole(null);
        return;
      }

      // Notify webhosts of new manager signup
      if (role === 'manager') {
        supabase.functions.invoke('notify-new-manager-signup', {
          body: { 
            managerEmail: user.email, 
            managerName: user.user_metadata?.full_name || user.email 
          },
        }).catch((err) => logError('RoleSelection.notifyManager', err));
      }

      toast({
        title: "Role set successfully",
        description: role === 'manager' 
          ? "Your manager account is pending approval." 
          : "Welcome! Redirecting to your portal...",
      });

      // Refresh the session to trigger role re-fetch
      await supabase.auth.refreshSession();
      
      // Small delay to allow auth state to update
      setTimeout(() => {
        window.location.href = role === 'manager' ? '/' : '/portal';
      }, 500);

    } catch (err) {
      logError('RoleSelection.handleRoleSelect', err);
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
      setIsLoading(false);
      setSelectedRole(null);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/landlord');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Welcome to RentFlow</h1>
          <p className="text-muted-foreground">
            Choose how you'd like to use the platform
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedRole === 'manager' ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => !isLoading && handleRoleSelect('manager')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Building2 className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Property Manager</CardTitle>
              <CardDescription>
                Manage properties, tenants, and collect rent
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Add and manage properties</li>
                <li>• Track tenant payments</li>
                <li>• Generate invoices & contracts</li>
                <li>• Handle maintenance requests</li>
              </ul>
              <Button 
                className="mt-4 w-full" 
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoleSelect('manager');
                }}
              >
                {isLoading && selectedRole === 'manager' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...</>
                ) : (
                  'Continue as Manager'
                )}
              </Button>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:border-primary ${
              selectedRole === 'tenant' ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => !isLoading && handleRoleSelect('tenant')}
          >
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Home className="w-8 h-8 text-primary" />
              </div>
              <CardTitle>Tenant</CardTitle>
              <CardDescription>
                View your lease, pay rent, and submit requests
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• View lease details</li>
                <li>• Pay rent online</li>
                <li>• Submit maintenance requests</li>
                <li>• Download statements</li>
              </ul>
              <Button 
                className="mt-4 w-full" 
                disabled={isLoading}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRoleSelect('tenant');
                }}
              >
                {isLoading && selectedRole === 'tenant' ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Setting up...</>
                ) : (
                  'Continue as Tenant'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center">
          <Button variant="ghost" onClick={handleSignOut} disabled={isLoading}>
            Sign out and try a different account
          </Button>
        </div>
      </div>
    </div>
  );
}