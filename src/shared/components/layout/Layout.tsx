import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useViewOnly } from "@/shared/contexts/ViewOnlyContext";
import { AlertCircle } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export function Layout({ children, title, subtitle, headerActions }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isViewOnly } = useViewOnly();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="lg:pl-64 transition-all duration-300 min-h-screen flex flex-col">
        {isViewOnly && (
          <div className="bg-amber-400/8 border-b border-amber-400/20 px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              <span>View-only mode — browsing as Webhost admin. Changes are disabled.</span>
            </div>
          </div>
        )}
        <Header
          title={title}
          subtitle={subtitle}
          actions={headerActions}
          onMenuClick={() => setSidebarOpen(true)}
        />
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden animate-fade-in">
          {children}
        </main>
      </div>
    </div>
  );
}
