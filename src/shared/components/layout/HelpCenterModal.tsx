import { useState } from "react";
import { PLATFORM_BRAND_CONFIG } from "@/core/brand/platformBrand";
import { LiveSystemStatus } from "@/shared/components/layout/LiveSystemStatus";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/shared/components/ui/tabs";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import {
  HelpCircle,
  Search,
  BookOpen,
  MessageSquare,
  Keyboard,
  Activity,
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles,
} from "lucide-react";

interface HelpCenterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HelpCenterModal({ open, onOpenChange }: HelpCenterModalProps) {
  const [activeTab, setActiveTab] = useState("docs");
  const [searchQuery, setSearchQuery] = useState("");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");

  const supportEmail = PLATFORM_BRAND_CONFIG.contact.email;

  const docs = [
    {
      title: "How rent payments reach the right account",
      category: "Billing & Collections",
      desc: "Tenants pay by M-Pesa STK push, card, or manually to the paybill, till or bank details shown in their portal. Each bill goes to the account its owner configured.",
    },
    {
      title: "Recording a payment made outside the app",
      category: "Billing & Collections",
      desc: "Managers can record cash, bank or M-Pesa payments against a tenant, optionally on behalf of a registered payer. Tenants can also upload a receipt for review.",
    },
    {
      title: "Water billing from meter readings",
      category: "Operations",
      desc: "Log meter readings for a unit and generate the water invoice for that period.",
    },
    {
      title: "Inviting tenants and keeping leases current",
      category: "Tenants & Leases",
      desc: "Invite tenants by SMS or email, then track lease terms, renewals and notices from the tenant record.",
    },
  ];

  const faqs = [
    {
      q: "How is a bank or paybill payment matched to a tenant?",
      a: "By the account number or reference the tenant used, and only when it identifies exactly one tenant. Anything unclear is held in Bank Reconciliation for a manager to match by hand.",
    },
    {
      q: "Where does a tenant find where to pay manually?",
      a: "In the tenant portal, on each bill: the paybill, till or bank details of the account that bill belongs to are shown there, with a receipt upload for manual payments.",
    },
    {
      q: "Can submanagers change property records?",
      a: "Submanager permissions are set by the Manager under Settings → Team. Only submanagers with write permission on properties can create or edit them.",
    },
    {
      q: "Why can't platform administrators see tenant names?",
      a: "Platform administrators oversee subscriptions, system health and aggregate figures. Tenant personal details stay with the managing organisation.",
    },
  ];

  const shortcuts = [
    { keys: ["Ctrl / ⌘", "K"], label: "Focus global search" },
    { keys: ["Esc"], label: "Close dialogs and the mobile menu" },
  ];

  const supportMailto = (subject: string, message: string) => {
    const where = typeof window !== "undefined" ? window.location.pathname : "";
    const body = `${message}\n\n---\nPage: ${where}`;
    return `mailto:${supportEmail}?subject=${encodeURIComponent(subject || "CALQULUS support request")}&body=${encodeURIComponent(body)}`;
  };

  const filteredDocs = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-0 gap-0 border-border bg-popover shadow-2xl overflow-hidden rounded-xl">
        {/* Modal Header */}
        <DialogHeader className="p-4 sm:p-6 border-b border-border/80 bg-muted/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  CALQULUS Help & Support Center
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Guides, answers to common questions, shortcuts, how to reach support, and a live connection check.
                </DialogDescription>
              </div>
            </div>
          </div>

          {/* Quick Search Bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search help topics, guides, FAQs, or troubleshooting..."
              className="pl-9 h-9 text-xs bg-background border-border/80"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </DialogHeader>

        {/* Tab Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
          <div className="px-4 sm:px-6 pt-2 border-b border-border/60 bg-muted/20">
            <TabsList className="bg-transparent h-9 p-0 gap-4 border-b-0 text-xs">
              <TabsTrigger
                value="docs"
                className="gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent px-1 pb-2"
              >
                <BookOpen className="h-3.5 w-3.5" />
                Guides
              </TabsTrigger>
              <TabsTrigger
                value="faqs"
                className="gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent px-1 pb-2"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                FAQs
              </TabsTrigger>
              <TabsTrigger
                value="shortcuts"
                className="gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent px-1 pb-2"
              >
                <Keyboard className="h-3.5 w-3.5" />
                Shortcuts
              </TabsTrigger>
              <TabsTrigger
                value="support"
                className="gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent px-1 pb-2"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                Contact Support
              </TabsTrigger>
              <TabsTrigger
                value="status"
                className="gap-1.5 text-xs data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none bg-transparent px-1 pb-2"
              >
                <Activity className="h-3.5 w-3.5" />
                Connection check
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Tab 1: Guides */}
          <TabsContent value="docs" className="p-4 sm:p-6 m-0 focus-visible:outline-hidden">
            <ScrollArea className="h-[280px] pr-2">
              <div className="space-y-3">
                {filteredDocs.map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-border/80 bg-card "
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs font-bold text-foreground">
                        {doc.title}
                      </p>
                      <Badge variant="outline" className="text-[10px]">
                        {doc.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{doc.desc}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab 2: FAQs */}
          <TabsContent value="faqs" className="p-4 sm:p-6 m-0 focus-visible:outline-hidden">
            <ScrollArea className="h-[280px] pr-2">
              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <div key={idx} className="p-3.5 rounded-lg border border-border/80 bg-card space-y-1.5">
                    <p className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                      {faq.q}
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-5">{faq.a}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab 3: Shortcuts */}
          <TabsContent value="shortcuts" className="p-4 sm:p-6 m-0 focus-visible:outline-hidden">
            <ScrollArea className="h-[280px] pr-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {shortcuts.map((sc, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 bg-card text-xs"
                  >
                    <span className="text-muted-foreground font-medium">{sc.label}</span>
                    <div className="flex gap-1">
                      {sc.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="px-2 py-0.5 text-[10px] font-mono font-bold bg-muted border border-border rounded text-foreground"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          {/* Tab 4: Contact support — opens the user's own email client; nothing is sent from here. */}
          <TabsContent value="support" className="p-4 sm:p-6 m-0 focus-visible:outline-hidden">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!ticketSubject.trim() || !ticketMessage.trim()) return;
                window.location.href = supportMailto(ticketSubject.trim(), ticketMessage.trim());
              }}
              className="space-y-3"
            >
              <p className="text-xs text-muted-foreground">
                This opens an email to <span className="font-semibold text-foreground">{supportEmail}</span> in your email app, with the page you are on included.
              </p>
              <div className="space-y-1">
                <label htmlFor="help-subject" className="text-xs font-medium text-foreground">Subject</label>
                <Input id="help-subject" placeholder="e.g., Bank deposit not matched to a tenant" className="h-8 text-xs" value={ticketSubject} onChange={(e) => setTicketSubject(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label htmlFor="help-message" className="text-xs font-medium text-foreground">Message</label>
                <textarea id="help-message" rows={4} placeholder="Property name, transaction reference, or what you were doing…" className="w-full rounded-md border border-border/80 bg-background p-2.5 text-xs focus:ring-1 focus:ring-primary focus:outline-hidden" value={ticketMessage} onChange={(e) => setTicketMessage(e.target.value)} />
              </div>
              <Button type="submit" size="sm" className="w-full gap-2 text-xs font-semibold" disabled={!ticketSubject.trim() || !ticketMessage.trim()}>
                <Send className="h-3.5 w-3.5" />
                Open email to support
              </Button>
            </form>
          </TabsContent>

          {/* Tab 5: connection check, measured live from this device */}
          <TabsContent value="status" className="p-4 sm:p-6 m-0 focus-visible:outline-hidden">
            <LiveSystemStatus />
          </TabsContent>
        </Tabs>

        {/* Modal Footer */}
        <div className="p-3 px-6 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            CALQULUS PMS Help
          </span>
          <a href={`mailto:${supportEmail}`} className="flex items-center gap-1 text-primary hover:underline font-medium">
            {supportEmail} <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
