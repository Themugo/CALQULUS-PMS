import { Globe, ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full border-t border-border/60 bg-card/30 px-4 md:px-6 lg:px-8 py-3 text-xs text-muted-foreground mt-auto">
      <div className="max-w-[1800px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground/80 tracking-tight">CALQULUS RMS</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="font-mono text-[11px] text-muted-foreground">v2.4.0-enterprise</span>
          <span className="text-muted-foreground/40">•</span>
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            System Operational
          </span>
        </div>

        <div className="flex items-center gap-4 text-muted-foreground text-[11px]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-primary/80" />
            SOC2 & ISO-27001 Compliant
          </span>
          <span className="hidden md:inline text-muted-foreground/40">•</span>
          <a
            href="/legal"
            className="hover:text-foreground transition-colors underline-offset-4 hover:underline hidden md:inline"
          >
            Terms & Privacy
          </a>
          <span className="hidden md:inline text-muted-foreground/40">•</span>
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3" />
            East Africa (KES / UTC+3)
          </span>
          <span className="text-muted-foreground/40">•</span>
          <span>© {currentYear} CALQULUS Technologies</span>
        </div>
      </div>
    </footer>
  );
}
