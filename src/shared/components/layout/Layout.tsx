import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { ContextPanel } from "./ContextPanel";
import { CommandPalette } from "./CommandPalette";
import { KeyboardShortcutsModal } from "./KeyboardShortcutsModal";
import { HelpCenterModal } from "./HelpCenterModal";
import { useKeyboardShortcuts } from "@/shared/hooks/useKeyboardShortcuts";
import { TopMobileInstallBanner } from "@/shared/components/ui/top-mobile-install-banner";
import { useViewOnly } from "@/shared/contexts/ViewOnlyContext";
import { AlertCircle } from "lucide-react";

interface LayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  contextTitle?: string;
  contextContent?: React.ReactNode;
}

export function Layout({
  children,
  title,
  subtitle,
  headerActions,
  contextTitle,
  contextContent,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [contextPanelOpen, setContextPanelOpen] = useState(false);
  const [helpCenterOpen, setHelpCenterOpen] = useState(false);
  const { isViewOnly } = useViewOnly();

  const { showShortcutsModal, setShowShortcutsModal, keySequence } = useKeyboardShortcuts(
    () => setCommandPaletteOpen(true)
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Key sequence indicator for fast keyboard navigation */}
      {keySequence.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 bg-primary text-primary-foreground text-xs font-mono font-bold px-3 py-1.5 rounded-md shadow-lg flex items-center gap-2 animate-in fade-in-0 duration-150">
          <span>Waiting for key:</span>
          <kbd className="px-1.5 py-0.5 bg-background text-foreground rounded border border-border">
            g + ...
          </kbd>
        </div>
      )}

      {/* Sidebar Rail / Overlay */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Workspace Frame */}
      <div className="lg:pl-64 transition-all duration-300 min-h-screen flex flex-col flex-1">
        {/* PWA Mobile Install Banner */}
        <TopMobileInstallBanner />

        {/* View-Only Warning Notice for Webhost Preview */}
        {isViewOnly && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2">
            <div className="flex items-center justify-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>View-only mode active — browsing as Webhost administrator. Mutation actions are restricted.</span>
            </div>
          </div>
        )}

        {/* Top Header Navbar */}
        <Header
          title={title}
          subtitle={subtitle}
          actions={headerActions}
          onMenuClick={() => setSidebarOpen(true)}
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onOpenShortcutsHelp={() => setShowShortcutsModal(true)}
          onOpenHelpCenter={() => setHelpCenterOpen(true)}
          onToggleContextPanel={() => setContextPanelOpen((prev) => !prev)}
        />

        {/* Workspace Page Header (Title, Subtitle, & Primary Actions) */}
        {(title || headerActions) && (
          <div className="border-b border-border/60 bg-background px-4 md:px-6 lg:px-8 py-5">
            <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <h1 className="page-title text-foreground truncate">
                  {title}
                </h1>
                {subtitle && (
                  <p className="supporting-text">
                    {subtitle}
                  </p>
                )}
              </div>
              {headerActions && (
                <div className="flex items-center gap-2 shrink-0">
                  {headerActions}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Content Viewport (Desktop-first Max-width Container) */}
        <main className="flex-1 w-full max-w-[1800px] mx-auto px-4 md:px-6 lg:px-8 py-6 animate-fade-in">
          {children}
        </main>

        {/* Universal Enterprise Footer */}
        <Footer />
      </div>

      {/* Reusable Context Panel Side Drawer */}
      <ContextPanel
        open={contextPanelOpen}
        onClose={() => setContextPanelOpen(false)}
        title={contextTitle}
      >
        {contextContent}
      </ContextPanel>

      {/* Global Command Palette Modal */}
      <CommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal open={showShortcutsModal} onOpenChange={setShowShortcutsModal} />

      {/* Global Help Center Modal */}
      <HelpCenterModal open={helpCenterOpen} onOpenChange={setHelpCenterOpen} />
    </div>
  );
}
