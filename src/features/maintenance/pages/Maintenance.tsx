import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/features/auth/AuthContext";
import { useRBAC } from "@/shared/hooks/useRBAC";
import { useActivityLog } from "@/shared/hooks/useActivityLog";
import { logError, toUserFacingError } from "@/shared/lib/errorLogger";
import { Layout } from "@/shared/components/layout/Layout";
import ServiceMarketplace from "@/features/services/components/ServiceMarketplace";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Label } from "@/shared/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import {
  Plus,
  Wrench,
  Clock,
  CheckCircle2,
  AlertTriangle,
  User,
  Search,
  LayoutList,
  LayoutGrid,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/shared/hooks/use-toast";
import { maintenanceRequestSchema, formatValidationErrors } from "@/shared/lib/validations";
import { useCurrency } from "@/shared/hooks/useCurrency";
import { formatDate } from "@/shared/lib/dateFormat";
import { MAINTENANCE_CATEGORIES, getCategoryLabel } from "@/features/maintenance/lib/maintenanceCategories";
import { MaintenanceActiveReport } from "@/features/maintenance/components/MaintenanceActiveReport";
import { MaintenanceBudgetDashboard } from "@/features/maintenance/components/MaintenanceBudgetDashboard";
import { EmptyState } from "@/shared/components/ui/empty-state";
import {
  requestAgeLabel,
  statusBadgeClass,
} from "@/shared/lib/statusBadge";

type RequestStatus = "open" | "in_progress" | "completed" | "cancelled";
type RequestPriority = "low" | "medium" | "high" | "urgent";

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  property_name: string;
  unit_number: string | null;
  unit_id: string | null;
  tenant_name: string;
  tenant_email: string;
  status: RequestStatus;
  priority: RequestPriority;
  category: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  requested_date: string;
  expected_completion_date: string | null;
  completion_date: string | null;
  budget: number | null;
  created_by_role: string | null;
}

interface Property {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unit_number: string;
  property_id: string;
}

const statusColors: Record<RequestStatus, string> = {
  open: statusBadgeClass("warning"),
  in_progress: statusBadgeClass("info"),
  completed: statusBadgeClass("success"),
  cancelled: statusBadgeClass("neutral"),
};

const priorityColors: Record<RequestPriority, string> = {
  low: statusBadgeClass("neutral"),
  medium: statusBadgeClass("warning"),
  high: statusBadgeClass("danger"),
  urgent: statusBadgeClass("danger"),
};

function nextMaintenanceAction(status: RequestStatus, assignedTo: string | null): string {
  if (status === "open") return assignedTo ? "Start work" : "Assign";
  if (status === "in_progress") return "Complete";
  return "—";
}

const statusIcons: Record<RequestStatus, React.ReactNode> = {
  open: <AlertTriangle className="h-4 w-4" />,
  in_progress: <Clock className="h-4 w-4" />,
  completed: <CheckCircle2 className="h-4 w-4" />,
  cancelled: <Wrench className="h-4 w-4" />,
};

export default function Maintenance() {
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const { toast } = useToast();
  const { user } = useAuth();
  const { can } = useRBAC();
  const { logActivity } = useActivityLog();

  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const { formatCurrency } = useCurrency();

  // Properties and units for dropdowns
  const [properties, setProperties] = useState<Property[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [filteredUnits, setFilteredUnits] = useState<Unit[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    property_id: "",
    property_name: "",
    unit_id: "",
    unit_number: "",
    tenant_name: "",
    tenant_email: "",
    priority: "medium" as RequestPriority,
    expected_completion_date: "",
    budget: "",
  });

  const fetchRequests = useCallback(async () => {
    if (!user?.id) {
      setRequests([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const { data, error } = await supabase
      .from("maintenance_requests")
      .select("*")
      .eq("manager_id", user!.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch maintenance requests",
        variant: "destructive",
      });
    } else {
      setRequests(data || []);
    }
    setIsLoading(false);
  }, [user, toast]);

  const fetchPropertiesAndUnits = useCallback(async () => {
    if (!user?.id) {
      setProperties([]);
      setUnits([]);
      return;
    }

    const [propertiesRes, unitsRes] = await Promise.all([
      supabase.from("properties").select("id, name").eq("manager_id", user!.id).order("name"),
      supabase.from("units").select("id, unit_number, property_id").order("unit_number"),
    ]);
    
    if (propertiesRes.data) setProperties(propertiesRes.data);
    if (unitsRes.data) setUnits(unitsRes.data);
  }, [user]);

  useEffect(() => {
    fetchRequests();
    fetchPropertiesAndUnits();
  }, [fetchRequests, fetchPropertiesAndUnits]);

  // Filter units when property changes
  useEffect(() => {
    if (formData.property_id) {
      setFilteredUnits(units.filter(u => u.property_id === formData.property_id));
    } else {
      setFilteredUnits([]);
    }
    // Reset unit when property changes
    if (formData.unit_id) {
      const unitBelongsToProperty = units.some(u => u.id === formData.unit_id && u.property_id === formData.property_id);
      if (!unitBelongsToProperty) {
        setFormData(prev => ({ ...prev, unit_id: "", unit_number: "" }));
      }
    }
  }, [formData.property_id, units, formData.unit_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({ title: "Error", description: "You must be signed in to submit a maintenance request.", variant: "destructive" });
      return;
    }
    
    // Validate input
    const validationResult = maintenanceRequestSchema.safeParse({
      ...formData,
      property_name: formData.property_name,
      unit_number: formData.unit_number,
    });
    if (!validationResult.success) {
      toast({
        title: "Validation Error",
        description: formatValidationErrors(validationResult.error),
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("maintenance_requests").insert({
      title: validationResult.data.title,
      description: validationResult.data.description,
      property_name: formData.property_name,
      unit_number: formData.unit_number || null,
      unit_id: formData.unit_id || null,
      tenant_name: validationResult.data.tenant_name,
      tenant_email: validationResult.data.tenant_email,
      priority: validationResult.data.priority,
      requested_date: new Date().toISOString().split('T')[0],
      expected_completion_date: formData.expected_completion_date || null,
      budget: formData.budget ? parseFloat(formData.budget) : null,
      created_by_role: 'manager',
      manager_id: user.id,
      property_id: formData.property_id || null,
    });

    if (error) {
      toast({
        title: "Error",
        description: toUserFacingError(error, "Failed to submit maintenance request"),
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Maintenance request submitted successfully",
      });
      setFormData({
        title: "",
        description: "",
        property_id: "",
        property_name: "",
        unit_id: "",
        unit_number: "",
        tenant_name: "",
        tenant_email: "",
        priority: "medium",
        expected_completion_date: "",
        budget: "",
      });
      setIsDialogOpen(false);
      fetchRequests();
    }
  };

  const updateRequestStatus = async (id: string, status: RequestStatus, oldStatus?: RequestStatus) => {
    const updateData: Record<string, unknown> = { status };
    if (status === 'completed') {
      updateData.completion_date = new Date().toISOString().split('T')[0];
    }
    const { error } = await supabase
      .from("maintenance_requests")
      .update(updateData)
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to update status",
        variant: "destructive",
      });
    } else {
      // Send notification for status change
      supabase.functions.invoke('send-maintenance-notification', {
        body: { requestId: id, type: 'status_changed', oldStatus, newStatus: status },
      }).catch((err) => logError('Maintenance.sendNotification', err));

      logActivity({
        action: `maintenance_${status}`,
        entityType: 'maintenance',
        entityId: id,
        metadata: { old_status: oldStatus, new_status: status },
      });

      toast({ title: "Success", description: "Request status updated" });
      fetchRequests();
    }
  };

  const assignRequest = async (id: string, assignedTo: string, providerId?: string) => {
    const { error } = await supabase
      .from("maintenance_requests")
      .update({
        assigned_to: assignedTo,
        assigned_provider_id: providerId || null,
        status: "in_progress" as RequestStatus,
      } as unknown)
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to assign request",
        variant: "destructive",
      });
    } else {
      // Send notification for assignment
      supabase.functions.invoke('send-maintenance-notification', {
        body: {
          requestId: id,
          type: 'assigned',
          assignedTo: assignedTo,
        },
      }).catch((err) => logError('Maintenance.sendNotification', err));

      toast({
        title: "Success",
        description: "Request assigned successfully",
      });
      fetchRequests();
    }
  };

  const filteredRequests = requests.filter((request) => {
    const matchesSearch =
      request.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      request.property_name.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = categoryFilter === "all" || request.category === categoryFilter;

    if (activeTab === "all") return matchesSearch && matchesCategory;
    return matchesSearch && matchesCategory && request.status === activeTab;
  });

  const stats = {
    total: requests.length,
    open: requests.filter((r) => r.status === "open").length,
    inProgress: requests.filter((r) => r.status === "in_progress").length,
    completed: requests.filter((r) => r.status === "completed").length,
  };

  return (
    <Layout
      title="Maintenance"
      subtitle="Priority, status, property, unit, and age — assign, start, or complete work orders"
    >
      {/* Stats Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-4 mb-4 sm:mb-6">
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-muted">
                <Wrench className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Total</p>
                <p className="text-lg sm:text-2xl font-semibold text-foreground">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Open</p>
                <p className="text-lg sm:text-2xl font-semibold text-foreground">{stats.open}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-primary/10">
                <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">In Progress</p>
                <p className="text-lg sm:text-2xl font-semibold text-foreground">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg bg-success/10">
                <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-success" />
              </div>
              <div>
                <p className="text-xs sm:text-sm text-muted-foreground">Completed</p>
                <p className="text-lg sm:text-2xl font-semibold text-foreground">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Report Section */}
      <MaintenanceActiveReport
        requests={requests}
        onStartRequest={(id) => updateRequestStatus(id, "in_progress", "open")}
        onCompleteRequest={(id) => updateRequestStatus(id, "completed", "in_progress")}
      />

      {/* Budget Dashboard */}
      <MaintenanceBudgetDashboard requests={requests} />

      {/* Actions Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:gap-4 mb-4 sm:mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full xs:w-[140px] sm:w-[180px] bg-card border-border">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {MAINTENANCE_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="rounded-none h-8 sm:h-9 px-2.5 sm:px-3"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("cards")}
              className="rounded-none h-8 sm:h-9 px-2.5 sm:px-3"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="btn-brand sm:size-default">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Request</span>
                <span className="sm:hidden">New</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-[500px] bg-card border-border max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground text-base sm:text-lg">Submit Maintenance Request</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Fill out the form below to submit a repair ticket.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="grid gap-3 sm:gap-4 py-3 sm:py-4">
                <div className="grid gap-2">
                  <Label htmlFor="title" className="text-sm">Issue Title</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g., Leaking faucet in kitchen"
                    required
                    className="bg-background border-border"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description" className="text-sm">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Describe the issue in detail..."
                    required
                    className="bg-background border-border min-h-[80px] sm:min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="property" className="text-sm">Property</Label>
                    <Select
                      value={formData.property_id}
                      onValueChange={(value) => {
                        const property = properties.find(p => p.id === value);
                        setFormData({ 
                          ...formData, 
                          property_id: value, 
                          property_name: property?.name || "",
                          unit_id: "",
                          unit_number: ""
                        });
                      }}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select property" />
                      </SelectTrigger>
                      <SelectContent>
                        {properties.map((property) => (
                          <SelectItem key={property.id} value={property.id}>
                            {property.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unit">Unit</Label>
                    <Select
                      value={formData.unit_id}
                      onValueChange={(value) => {
                        const unit = filteredUnits.find(u => u.id === value);
                        setFormData({ 
                          ...formData, 
                          unit_id: value, 
                          unit_number: unit?.unit_number || "" 
                        });
                      }}
                      disabled={!formData.property_id}
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder={formData.property_id ? "Select unit" : "Select property first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredUnits.map((unit) => (
                          <SelectItem key={unit.id} value={unit.id}>
                            {unit.unit_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="tenant_name" className="text-sm">Your Name</Label>
                    <Input
                      id="tenant_name"
                      value={formData.tenant_name}
                      onChange={(e) =>
                        setFormData({ ...formData, tenant_name: e.target.value })
                      }
                      placeholder="Full name"
                      required
                      className="bg-background border-border"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="tenant_email">Email</Label>
                    <Input
                      id="tenant_email"
                      type="email"
                      value={formData.tenant_email}
                      onChange={(e) =>
                        setFormData({ ...formData, tenant_email: e.target.value })
                      }
                      placeholder="your@email.com"
                      required
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="priority" className="text-sm">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: RequestPriority) =>
                        setFormData({ ...formData, priority: value })
                      }
                    >
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="budget">Budget</Label>
                    <Input
                      id="budget"
                      type="number"
                      value={formData.budget}
                      onChange={(e) =>
                        setFormData({ ...formData, budget: e.target.value })
                      }
                      placeholder="e.g., 5000"
                      className="bg-background border-border"
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="expected_date">Due Date (Expected Completion)</Label>
                  <Input
                    id="expected_date"
                    type="date"
                    value={formData.expected_completion_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expected_completion_date: e.target.value })
                    }
                    className="bg-background border-border"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" className="btn-brand">
                  Submit Request
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Tabs and Request List */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-card border border-border mb-3 sm:mb-4 w-full sm:w-auto grid grid-cols-4 sm:flex">
          <TabsTrigger value="all" className="text-xs sm:text-sm px-2 sm:px-4">All</TabsTrigger>
          <TabsTrigger value="open" className="text-xs sm:text-sm px-2 sm:px-4">Open</TabsTrigger>
          <TabsTrigger value="in_progress" className="text-xs sm:text-sm px-2 sm:px-4">
            <span className="hidden xs:inline">In </span>Progress
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm px-2 sm:px-4">Done</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {isLoading ? (
            <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm">
              Loading requests...
            </div>
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={Wrench}
              title="No maintenance requests found"
              description="Create a work order to track repairs by property, unit, and priority."
            />
          ) : viewMode === "table" ? (
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border">
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Issue</TableHead>
                      <TableHead className="hidden md:table-cell">Property / Unit</TableHead>
                      <TableHead className="hidden lg:table-cell">Tenant</TableHead>
                      <TableHead>Age</TableHead>
                      <TableHead className="hidden xl:table-cell">Assigned</TableHead>
                      <TableHead className="hidden lg:table-cell">Next</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.map((request) => (
                      <TableRow key={request.id} className="border-border">
                        <TableCell>
                          <span className={priorityColors[request.priority]}>
                            {request.priority}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={statusColors[request.status]}>
                            {request.status.replace("_", " ")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{request.title}</p>
                            <p className="text-xs text-muted-foreground md:hidden">
                              {request.property_name}
                              {request.unit_number && ` · ${request.unit_number}`}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <p className="text-sm text-foreground">{request.property_name}</p>
                          <p className="text-xs text-muted-foreground">{request.unit_number || "—"}</p>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm text-foreground">{request.tenant_name}</span>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                          {requestAgeLabel(request.created_at)}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-sm text-muted-foreground">
                          {request.assigned_to || "Unassigned"}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {nextMaintenanceAction(request.status, request.assigned_to)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {request.status === "open" && (
                              <>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="outline">
                                      Assign
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-card border-border">
                                    <DialogHeader>
                                      <DialogTitle className="text-foreground">Assign Request</DialogTitle>
                                      <DialogDescription>
                                        Assign this maintenance request to a technician.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <AssignForm
                                      onAssign={(name, pid) => assignRequest(request.id, name, pid)}
                                    />
                                  </DialogContent>
                                </Dialog>
                                {can('manage_maintenance') && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => updateRequestStatus(request.id, "in_progress")}
                                  >
                                    Start
                                  </Button>
                                )}
                              </>
                            )}
                            {request.status === "in_progress" && can('manage_maintenance') && (
                              <Button
                                size="sm"
                                className="bg-success hover:bg-success/90"
                                onClick={() => updateRequestStatus(request.id, "completed")}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredRequests.map((request) => (
                <Card key={request.id} className="bg-card border-border">
                  <CardContent className="p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                      <div className="flex-1">
                        <div className="flex items-start gap-3 mb-2">
                          <div className="p-2 rounded-lg bg-muted">
                            {statusIcons[request.status]}
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">
                              {request.title}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {request.property_name}
                              {request.unit_number && ` - Unit ${request.unit_number}`}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {request.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          <span className={statusColors[request.status]}>
                            {request.status.replace("_", " ")}
                          </span>
                          <span className={priorityColors[request.priority]}>
                            {request.priority} priority
                          </span>
                          <span className={statusBadgeClass("neutral")}>
                            {getCategoryLabel(request.category || 'other')}
                          </span>
                          <span className={statusBadgeClass("neutral")}>
                            <User className="h-3 w-3 mr-1" />
                            {request.tenant_name}
                          </span>
                          {request.budget && (
                            <span className={statusBadgeClass("success")}>
                              Budget: {formatCurrency(request.budget)}
                            </span>
                          )}
                        </div>
                        {request.assigned_to && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Assigned to: {request.assigned_to}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                          <span>Requested: {formatDate(request.requested_date)}</span>
                          {request.expected_completion_date && (
                            <span>Due: {formatDate(request.expected_completion_date)}</span>
                          )}
                          {request.completion_date && (
                            <span className="text-success">Completed: {formatDate(request.completion_date)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 lg:items-end">
                        <p className="text-xs text-muted-foreground">
                          {formatDate(request.created_at)}
                        </p>
                        <div className="flex gap-2">
                          {request.status === "open" && (
                            <>
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline">
                                    Assign
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-card border-border">
                                  <DialogHeader>
                                    <DialogTitle className="text-foreground">Assign Request</DialogTitle>
                                    <DialogDescription>
                                      Assign this maintenance request to a technician.
                                    </DialogDescription>
                                  </DialogHeader>
                                  <AssignForm
                                    onAssign={(name, pid) => assignRequest(request.id, name, pid)}
                                  />
                                </DialogContent>
                              </Dialog>
                              {can('manage_maintenance') && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateRequestStatus(request.id, "in_progress")}
                                >
                                  Start
                                </Button>
                              )}
                            </>
                          )}
                          {request.status === "in_progress" && can('manage_maintenance') && (
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90"
                              onClick={() => updateRequestStatus(request.id, "completed")}
                            >
                              Complete
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}

function AssignForm({ onAssign }: { onAssign: (name: string, providerId?: string) => void }) {
  const [tab, setTab] = useState<'marketplace' | 'manual'>('marketplace');
  const [manualName, setManualName] = useState('');

  return (
    <div className="space-y-3 py-2">
      {/* Tab toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden text-sm">
        <button
          className={`flex-1 py-2 font-medium transition-colors ${tab === 'marketplace' ? 'bg-amber-400 text-white' : 'text-muted-foreground hover:bg-muted/40'}`}
          onClick={() => setTab('marketplace')}
        >
          From marketplace
        </button>
        <button
          className={`flex-1 py-2 font-medium transition-colors ${tab === 'manual' ? 'bg-amber-400 text-white' : 'text-muted-foreground hover:bg-muted/40'}`}
          onClick={() => setTab('manual')}
        >
          Enter manually
        </button>
      </div>

      {tab === 'marketplace' ? (
        <div className="max-h-96 overflow-y-auto">
          <ServiceMarketplace
            compact
            onSelectProvider={(providerId, name) => onAssign(name, providerId)}
          />
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <Label>Technician / contractor name</Label>
            <Input
              value={manualName}
              onChange={e => setManualName(e.target.value)}
              placeholder="Enter name or company"
              className="mt-1 bg-background border-border"
            />
          </div>
          <Button onClick={() => onAssign(manualName)} disabled={!manualName.trim()} className="w-full">
            Assign
          </Button>
        </div>
      )}
    </div>
  );
}
