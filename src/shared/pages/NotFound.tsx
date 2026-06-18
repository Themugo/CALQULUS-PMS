import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { logError } from "@/shared/lib/errorLogger";
import { useAuth } from "@/features/auth/AuthContext";
import { Button } from "@/shared/components/ui/button";
import { Home, ArrowLeft, Search } from "lucide-react";
import calqulusLogo from "@/assets/calqulus-logo-new.png";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { userRole } = useAuth();

  useEffect(() => {
    logError('404', location.pathname);
  }, [location.pathname]);

  const homeLink = () => {
    if (!userRole) return '/landlord';
    switch (userRole.role) {
      case 'tenant':     return '/portal';
      case 'landlord':   return '/landlord/dashboard';
      case 'webhost':    return '/webhost';
      case 'submanager': return '/';
      case 'agency':     return '/agency';
      default:           return '/';
    }
  };

  const roleLabel = () => {
    if (!userRole) return null;
    const map: Record<string, string> = {
      tenant: 'Tenant Portal', landlord: 'Landlord Portal',
      webhost: 'Admin Portal', submanager: 'Dashboard',
      agency: 'Agency Portal', manager: 'Dashboard',
    };
    return map[userRole.role] ?? 'Dashboard';
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center hero-gradient px-4">
      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{
        backgroundImage: `linear-gradient(hsl(42 51% 55% / 0.5) 1px, transparent 1px),
                          linear-gradient(90deg, hsl(42 51% 55% / 0.5) 1px, transparent 1px)`,
        backgroundSize: '48px 48px',
      }} />

      <div className="relative z-10 text-center max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src={calqulusLogo} alt="CALQULUS PMS" className="h-12 w-auto object-contain opacity-80" />
        </div>

        {/* 404 number */}
        <div className="relative mb-6">
          <p className="font-heading text-[120px] sm:text-[160px] font-bold leading-none select-none"
            style={{
              background: 'linear-gradient(135deg, hsl(42 73% 67% / 0.15) 0%, hsl(42 51% 55% / 0.08) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-amber-400/12 border border-amber-400/20 flex items-center justify-center shadow-lg shadow-amber-400/5">
              <Search className="h-8 w-8 text-amber-400/60" />
            </div>
          </div>
        </div>

        {/* Message */}
        <h1 className="font-heading text-2xl font-bold text-white mb-3">Page not found</h1>
        <p className="text-white/50 text-sm mb-2 leading-relaxed">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-8">
          <code className="text-amber-400/70 text-xs font-mono">{location.pathname}</code>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="outline"
            className="border-white/15 text-white/70 hover:bg-white/8 hover:text-white gap-2"
            onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
            Go back
          </Button>
          <Button
            className="btn-brand font-semibold gap-2"
            onClick={() => navigate(homeLink())}>
            <Home className="h-4 w-4" />
            {roleLabel() ? `Back to ${roleLabel()}` : 'Return to home'}
          </Button>
        </div>

        {/* Footer */}
        <p className="mt-12 text-white/20 text-xs">
          calquluspms.com · If this keeps happening, contact your administrator.
        </p>
      </div>
    </div>
  );
};

export default NotFound;
