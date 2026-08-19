import { useState, useEffect } from "react";
import { Menu, Moon, Sun, Monitor, Check, Command, HelpCircle, Search, PanelRight } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { BreadcrumbSystem } from "./BreadcrumbSystem";
import { QuickActions } from "./QuickActions";
import { ProfileMenu } from "./ProfileMenu";

interface HeaderProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
  onOpenCommandPalette?: () => void;
  onOpenShortcutsHelp?: () => void;
  onOpenHelpCenter?: () => void;
  onToggleContextPanel?: () => void;
}

export function Header({
  title,
  subtitle,
  actions,
  onMenuClick,
  onOpenCommandPalette,
  onOpenShortcutsHelp,
  onOpenHelpCenter,
  onToggleContextPanel,
}: HeaderProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center justify-between border-b transition-all duration-200 px-4 md:px-6 lg:px-8 gap-4 bg-background/95 backdrop-blur-md",
        scrolled ? "border-border shadow-xs" : "border-border/60"
      )}
    >
      {/* Left: Mobile Toggle & Breadcrumbs / Title */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open menu"
          className="lg:hidden min-h-11 min-w-11 h-11 w-11 text-muted-foreground hover:text-foreground shrink-0"
          onClick={onMenuClick}
        >
          <Menu className="h-4 w-4" />
        </Button>

        <div className="flex flex-col justify-center min-w-0">
          <BreadcrumbSystem />
          {title && (
            <div className="flex items-center gap-2 mt-0.5 sm:hidden">
              <h1 className="text-base font-semibold text-foreground truncate">{title}</h1>
              {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
            </div>
          )}
        </div>
      </div>

      {/* Right: Actions, Command Palette, QuickActions, Notifications, Theme, Context Panel, Profile */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Page-specific actions */}
        {actions && <div className="hidden xl:flex items-center gap-2">{actions}</div>}

        {/* Global Search & Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-3 min-h-11 h-11 w-64 lg:w-72 px-3 rounded-md bg-muted/50 border border-border/70 hover:bg-muted text-xs text-muted-foreground hover:text-foreground transition-all"
        >
          <Search className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1 text-left truncate">Search or jump to...</span>
          <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-mono font-semibold text-muted-foreground">
            <Command className="h-2.5 w-2.5" />K
          </kbd>
        </button>

        {/* Mobile Search Icon */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          className="md:hidden min-h-11 min-w-11 h-11 w-11 text-muted-foreground hover:text-foreground"
          onClick={onOpenCommandPalette}
        >
          <Search className="h-4 w-4" />
        </Button>

        {/* Help Center & Keyboard Shortcuts */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Help center and keyboard shortcuts"
          className="hidden sm:flex min-h-11 min-w-11 h-11 w-11 text-muted-foreground hover:text-foreground"
          onClick={onOpenHelpCenter || onOpenShortcutsHelp}
          title="Help Center & Keyboard Shortcuts (?)"
        >
          <HelpCircle className="h-4 w-4" />
        </Button>

        {/* Quick Actions Dropdown */}
        <QuickActions />

        {/* Notifications Dropdown */}
        <NotificationsDropdown />

        {/* Workspace Context Panel Toggle */}
        {onToggleContextPanel && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle workspace activity panel"
            className="hidden sm:flex min-h-11 min-w-11 h-11 w-11 text-muted-foreground hover:text-foreground"
            onClick={onToggleContextPanel}
            title="Toggle Workspace Activity & Context"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        )}

        {/* Theme Picker Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Toggle theme"
              className="min-h-11 min-w-11 h-11 w-11 text-muted-foreground hover:text-foreground"
              title="Toggle theme"
            >
              {resolvedTheme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuLabel className="text-[11px] font-semibold uppercase text-muted-foreground">
              Theme
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setTheme("light")} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <Sun className="h-3.5 w-3.5" /> Light
              </span>
              {theme === "light" && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <Moon className="h-3.5 w-3.5" /> Dark
              </span>
              {theme === "dark" && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-2">
                <Monitor className="h-3.5 w-3.5" /> System
              </span>
              {theme === "system" && <Check className="h-3.5 w-3.5 text-primary" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Profile Menu */}
        <ProfileMenu />
      </div>
    </header>
  );
}
