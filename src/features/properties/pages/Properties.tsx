import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Layout } from "@/shared/components/layout/Layout";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Plus, MapPin, Users, User, UserPlus, DollarSign, Building, Pencil, Trash2, ChevronDown, Building2, Phone, Mail, Search, ArrowUpDown, CheckSquare, Square, X, Eye, Layers } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { ImageUpload } from "@/shared/components/ui/image-upload";
import { useToast } from "@/shared/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { propertySchema, formatValidationErrors } from "@/shared/lib/validations";
import { useActivityLog } from "@/shared/hooks/useActivityLog";
import { useViewOnly } from "@/shared/contexts/ViewOnlyContext";
import { useAuth } from "@/features/auth/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { CATEGORY_BY_KEY, CATEGORIES_BY_GROUP, GROUP_LABELS, PROPERTY_CATEGORIES } from "@/shared/constants/propertyTypes";

interface Agency {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
}

interface Property {
  id: string;
  name: string;
  address: string;
  house_number: string | null;
  units: number;
  occupied: number;
  revenue: number;
  image_url: string | null;
  agency_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Tenant {
  id: string;
  name: string;
  email: string;
  unit: string | null;
  property_id: string | null;
  status: string;
}

const Properties = () => {
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const { isViewOnly } = useViewOnly();
  const { user } = useAuth();

  // Check property limit from subscription tier
  const { data: subProfile } = useQuery({
    queryKey: ['manager-sub-profile', user?.id],
    queryFn: async () => {
      const { data } = await (supabase.from('manager_profiles')
        .select('max_properties, property_count, subscription_tier')
        .eq('user_id', user!.id).maybeSingle());
      return data as any;
    },
    enabled: !!user?.id,
  });
  const atPropertyLimit = subProfile
    ? (subProfile.property_count ?? 0) >= (subProfile.max_properties ?? 5)
    : false;
  const [properties, setProperties] = useState<Property[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newProperty, setNewProperty] = useState({
    name: "",
    address: "",
    house_number: "",
    house_label_prefix: "",
    units: "",
    image_url: "",
    agency_id: "",
    property_type: "flat",
    number_of_floors: "",
    rent_per_house: "",
    payment_details: "",
  });

  // Agency dialog state
  const [isAgencyDialogOpen, setIsAgencyDialogOpen] = useState(false);
  const [newAgency, setNewAgency] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });
  const [editAgency, setEditAgency] = useState<Agency | null>(null);
  const [isEditAgencyDialogOpen, setIsEditAgencyDialogOpen] = useState(false);
  const [editAgencyFormData, setEditAgencyFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  // Edit state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    address: "",
    house_number: "",
    house_label_prefix: "",
    units: "",
    occupied: "",
    revenue: "",
    image_url: "",
    agency_id: "",
    property_type: "flat",
    number_of_floors: "",
    rent_per_house: "",
    payment_details: "",
  });

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [deleteProperty, setDeleteProperty] = useState<Property | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Agency delete state
  const [isDeleteAgencyDialogOpen, setIsDeleteAgencyDialogOpen] = useState(false);
  const [deleteAgency, setDeleteAgency] = useState<Agency | null>(null);
  const [isDeletingAgency, setIsDeletingAgency] = useState(false);

  // Collapsible state
  const [expandedAgencies, setExpandedAgencies] = useState<Set<string>>(new Set());

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  // Agency filter state
  const [filterAgencyId, setFilterAgencyId] = useState<string>("all");

  // Occupancy filter state
  const [filterOccupancy, setFilterOccupancy] = useState<string>("all");

  // Sort state
  const [sortBy, setSortBy] = useState<"name" | "units" | "occupancy" | "revenue">("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Bulk selection state
  const [selectedProperties, setSelectedProperties] = useState<Set<string>>(new Set());
  const [isBulkAssignDialogOpen, setIsBulkAssignDialogOpen] = useState(false);
  const [bulkAssignAgencyId, setBulkAssignAgencyId] = useState("");
  const [isBulkAssigning, setIsBulkAssigning] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [propertiesRes, agenciesRes, tenantsRes] = await Promise.all([
      supabase.from("properties").select("*").eq("manager_id", user!.id).neq("status", "inactive").order("created_at", { ascending: false }),
      supabase.from("agencies").select("*").eq("manager_id", user!.id).order("name", { ascending: true }),
      supabase.from("tenants").select("id, name, email, unit, property_id, status").eq("manager_id", user!.id).order("name", { ascending: true }),
    ]);

    if (propertiesRes.error) {
      toast({ title: "Error", description: "Failed to fetch properties", variant: "destructive" });
    } else {
      setProperties(propertiesRes.data || []);
    }

    if (!tenantsRes.error) {
      setTenants(tenantsRes.data || []);
    }

    if (agenciesRes.error) {
      toast({ title: "Error", description: "Failed to fetch agencies", variant: "destructive" });
    } else {
      setAgencies(agenciesRes.data || []);
      // Expand all agencies by default
      setExpandedAgencies(new Set(agenciesRes.data?.map(a => a.id) || []));
    }

    setIsLoading(false);
  }, [user, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const toggleAgency = (agencyId: string) => {
    const newExpanded = new Set(expandedAgencies);
    if (newExpanded.has(agencyId)) {
      newExpanded.delete(agencyId);
    } else {
      newExpanded.add(agencyId);
    }
    setExpandedAgencies(newExpanded);
  };

  const handleAddAgency = async () => {
    if (!newAgency.name.trim()) {
      toast({ title: "Error", description: "Agency name is required", variant: "destructive" });
      return;
    }

    if (!user?.id) {
      toast({ title: "Error", description: "You must be signed in to add an agency.", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("agencies").insert({
      name: newAgency.name.trim(),
      email: newAgency.email.trim() || null,
      phone: newAgency.phone.trim() || null,
      address: newAgency.address.trim() || null,
      manager_id: user.id,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to add agency", variant: "destructive" });
    } else {
      toast({ title: "Agency Added", description: `${newAgency.name} has been added.` });
      setNewAgency({ name: "", email: "", phone: "", address: "" });
      setIsAgencyDialogOpen(false);
      fetchData();
    }
    setIsSaving(false);
  };

  const openEditAgencyDialog = (agency: Agency) => {
    setEditAgency(agency);
    setEditAgencyFormData({
      name: agency.name,
      email: agency.email || "",
      phone: agency.phone || "",
      address: agency.address || "",
    });
    setIsEditAgencyDialogOpen(true);
  };

  const handleUpdateAgency = async () => {
    if (!editAgency || !editAgencyFormData.name.trim()) {
      toast({ title: "Error", description: "Agency name is required", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("agencies")
      .update({
        name: editAgencyFormData.name.trim(),
        email: editAgencyFormData.email.trim() || null,
        phone: editAgencyFormData.phone.trim() || null,
        address: editAgencyFormData.address.trim() || null,
      })
      .eq("id", editAgency.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update agency", variant: "destructive" });
    } else {
      toast({ title: "Agency Updated", description: `${editAgencyFormData.name} has been updated.` });
      setIsEditAgencyDialogOpen(false);
      setEditAgency(null);
      fetchData();
    }
    setIsSaving(false);
  };

  const openDeleteAgencyDialog = (agency: Agency) => {
    setDeleteAgency(agency);
    setIsDeleteAgencyDialogOpen(true);
  };

  const handleDeleteAgency = async () => {
    if (!deleteAgency) return;

    setIsDeletingAgency(true);
    
    // First, reassign all properties from this agency to unassigned (null)
    const { error: updateError } = await supabase
      .from("properties")
      .update({ agency_id: null })
      .eq("agency_id", deleteAgency.id);

    if (updateError) {
      toast({ title: "Error", description: "Failed to reassign properties", variant: "destructive" });
      setIsDeletingAgency(false);
      return;
    }

    // Then delete the agency
    const { error: deleteError } = await supabase
      .from("agencies")
      .delete()
      .eq("id", deleteAgency.id);

    if (deleteError) {
      toast({ title: "Error", description: "Failed to delete agency", variant: "destructive" });
    } else {
      const propertyCount = properties.filter(p => p.agency_id === deleteAgency.id).length;
      toast({ 
        title: "Agency Deleted", 
        description: `${deleteAgency.name} has been removed. ${propertyCount} ${propertyCount === 1 ? 'property was' : 'properties were'} moved to unassigned.`
      });
      fetchData();
    }
    setIsDeletingAgency(false);
    setIsDeleteAgencyDialogOpen(false);
    setDeleteAgency(null);
  };

  const handleAddProperty = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be signed in to add a property.",
        variant: "destructive",
      });
      return;
    }

    const validationResult = propertySchema.safeParse(newProperty);
    if (!validationResult.success) {
      toast({ title: "Validation Error", description: formatValidationErrors(validationResult.error), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase.from("properties").insert({
      name: validationResult.data.name,
      address: validationResult.data.address,
      house_number: newProperty.house_number.trim() || null,
      house_label_prefix: newProperty.house_label_prefix.trim() || null,
      units: validationResult.data.units ? parseInt(validationResult.data.units) : 0,
      occupied: 0,
      revenue: 0,
      image_url: validationResult.data.image_url || null,
      agency_id: newProperty.agency_id || null,
      manager_id: user.id,
      property_type: newProperty.property_type || 'flat',
      number_of_floors: newProperty.number_of_floors ? parseInt(newProperty.number_of_floors) : 1,
      rent_per_house: newProperty.rent_per_house ? parseFloat(newProperty.rent_per_house) : 0,
      payment_details: newProperty.payment_details.trim() || null,
    });

    if (error) {
      const detail = error.details ? ` (${error.details})` : '';
      const hint = error.hint ? ` Hint: ${error.hint}` : '';
      toast({
        title: "Property creation failed",
        description: `${error.message}${detail}${hint}`,
        variant: "destructive",
      });
    } else {
      toast({ title: "Property Added", description: `${validationResult.data.name} has been added successfully.` });
      logActivity({
        action: 'Created property',
        entityType: 'property',
        details: { name: validationResult.data.name, address: validationResult.data.address }
      });
      setNewProperty({ name: "", address: "", house_number: "", house_label_prefix: "", units: "", image_url: "", agency_id: "", property_type: "flat", number_of_floors: "", rent_per_house: "", payment_details: "" });
      setIsDialogOpen(false);
      fetchData();
    }
    setIsSaving(false);
  };

  const openEditDialog = (property: Property) => {
    setEditProperty(property);
    setEditFormData({
      name: property.name,
      address: property.address,
      house_number: property.house_number || "",
      house_label_prefix: (property as any).house_label_prefix || "",
      units: property.units.toString(),
      occupied: property.occupied.toString(),
      revenue: property.revenue.toString(),
      image_url: property.image_url || "",
      agency_id: property.agency_id || "",
      property_type: (property as any).property_type || "flat",
      number_of_floors: (property as any).number_of_floors?.toString() || "1",
      rent_per_house: (property as any).rent_per_house?.toString() || "0",
      payment_details: (property as any).payment_details || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateProperty = async () => {
    if (!editProperty) return;

    const validationResult = propertySchema.safeParse({
      name: editFormData.name,
      address: editFormData.address,
      units: editFormData.units,
      image_url: editFormData.image_url,
    });
    if (!validationResult.success) {
      toast({ title: "Validation Error", description: formatValidationErrors(validationResult.error), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    const { error } = await supabase
      .from("properties")
      .update({
        name: validationResult.data.name,
        address: validationResult.data.address,
        house_number: editFormData.house_number.trim() || null,
        house_label_prefix: editFormData.house_label_prefix.trim() || null,
        units: validationResult.data.units ? parseInt(validationResult.data.units) : 0,
        occupied: parseInt(editFormData.occupied) || 0,
        revenue: parseFloat(editFormData.revenue) || 0,
        image_url: validationResult.data.image_url || null,
        agency_id: editFormData.agency_id || null,
        property_type: editFormData.property_type || 'flat',
        number_of_floors: editFormData.number_of_floors ? parseInt(editFormData.number_of_floors) : 1,
        rent_per_house: editFormData.rent_per_house ? parseFloat(editFormData.rent_per_house) : 0,
        payment_details: editFormData.payment_details.trim() || null,
      })
      .eq("id", editProperty.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update property", variant: "destructive" });
    } else {
      toast({ title: "Property Updated", description: `${validationResult.data.name} has been updated successfully.` });
      logActivity({
        action: 'Updated property',
        entityType: 'property',
        entityId: editProperty.id,
        details: { name: validationResult.data.name }
      });
      setIsEditDialogOpen(false);
      setEditProperty(null);
      fetchData();
    }
    setIsSaving(false);
  };

  const openDeleteDialog = (property: Property) => {
    setDeleteProperty(property);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteProperty = async () => {
    if (!deleteProperty) return;

    setIsDeleting(true);
    const { error } = await supabase.from("properties").update({ status: 'inactive' }).eq("id", deleteProperty.id);

    if (error) {
      toast({ title: "Error", description: "Failed to deactivate property", variant: "destructive" });
    } else {
      toast({ title: "Property Deactivated", description: `${deleteProperty.name} has been deactivated and moved to history.` });
      logActivity({
        action: 'Deactivated property',
        entityType: 'property',
        entityId: deleteProperty.id,
        details: { name: deleteProperty.name }
      });
      supabase.rpc('refresh_manager_stats' as any, { p_manager_id: user?.id }).catch(() => {});
      fetchData();
    }
    setIsDeleting(false);
    setIsDeleteDialogOpen(false);
    setDeleteProperty(null);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Filter properties based on search query
  const getFilteredProperties = () => {
    let filtered = properties;
    
    // Apply agency filter
    if (filterAgencyId !== "all") {
      if (filterAgencyId === "unassigned") {
        filtered = filtered.filter(p => !p.agency_id);
      } else {
        filtered = filtered.filter(p => p.agency_id === filterAgencyId);
      }
    }
    
    // Apply occupancy filter
    if (filterOccupancy !== "all") {
      filtered = filtered.filter(property => {
        const rate = property.units > 0 ? (property.occupied / property.units) * 100 : 0;
        switch (filterOccupancy) {
          case "empty": return rate === 0;
          case "low": return rate > 0 && rate < 50;
          case "medium": return rate >= 50 && rate < 80;
          case "high": return rate >= 80 && rate < 100;
          case "full": return rate === 100;
          default: return true;
        }
      });
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(property => {
        const agency = agencies.find(a => a.id === property.agency_id);
        return (
          property.name.toLowerCase().includes(query) ||
          property.address.toLowerCase().includes(query) ||
          (agency?.name.toLowerCase().includes(query) ?? false)
        );
      });
    }
    
    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "units":
          comparison = a.units - b.units;
          break;
        case "occupancy": {
          const occA = a.units > 0 ? a.occupied / a.units : 0;
          const occB = b.units > 0 ? b.occupied / b.units : 0;
          comparison = occA - occB;
          break;
        }
        case "revenue":
          comparison = a.revenue - b.revenue;
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });
    
    return filtered;
  };

  const togglePropertySelection = (propertyId: string) => {
    const newSelected = new Set(selectedProperties);
    if (newSelected.has(propertyId)) {
      newSelected.delete(propertyId);
    } else {
      newSelected.add(propertyId);
    }
    setSelectedProperties(newSelected);
  };

  const selectAllProperties = () => {
    const filteredIds = getFilteredProperties().map(p => p.id);
    setSelectedProperties(new Set(filteredIds));
  };

  const clearSelection = () => {
    setSelectedProperties(new Set());
  };

  const handleBulkAssign = async () => {
    if (selectedProperties.size === 0) return;

    setIsBulkAssigning(true);
    const { error } = await supabase
      .from("properties")
      .update({ agency_id: bulkAssignAgencyId === "none" ? null : bulkAssignAgencyId })
      .in("id", Array.from(selectedProperties));

    if (error) {
      toast({ title: "Error", description: "Failed to assign properties", variant: "destructive" });
    } else {
      const agencyName = bulkAssignAgencyId === "none" 
        ? "Unassigned" 
        : agencies.find(a => a.id === bulkAssignAgencyId)?.name || "Unknown";
      toast({ 
        title: "Properties Assigned", 
        description: `${selectedProperties.size} ${selectedProperties.size === 1 ? 'property' : 'properties'} assigned to ${agencyName}.` 
      });
      setSelectedProperties(new Set());
      setIsBulkAssignDialogOpen(false);
      setBulkAssignAgencyId("");
      fetchData();
    }
    setIsBulkAssigning(false);
  };

  // Calculate agency statistics
  const getAgencyStats = (agencyProperties: Property[]) => {
    const totalUnits = agencyProperties.reduce((sum, p) => sum + p.units, 0);
    const totalOccupied = agencyProperties.reduce((sum, p) => sum + p.occupied, 0);
    const totalRevenue = agencyProperties.reduce((sum, p) => sum + p.revenue, 0);
    const occupancyRate = totalUnits > 0 ? (totalOccupied / totalUnits) * 100 : 0;
    return { totalUnits, totalOccupied, totalRevenue, occupancyRate };
  };

  // Group properties by agency
  const getGroupedProperties = () => {
    const filteredProperties = getFilteredProperties();
    const grouped: { agency: Agency | null; properties: Property[] }[] = [];

    // Properties with agencies
    agencies.forEach(agency => {
      const agencyProperties = filteredProperties.filter(p => p.agency_id === agency.id);
      if (agencyProperties.length > 0) {
        grouped.push({ agency, properties: agencyProperties });
      }
    });

    // Unassigned properties
    const unassignedProperties = filteredProperties.filter(p => !p.agency_id);
    if (unassignedProperties.length > 0) {
      grouped.push({ agency: null, properties: unassignedProperties });
    }

    return grouped;
  };

  const handleQuickAssignTenant = async (tenantId: string, propertyId: string, propertyName: string) => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant) return;

    const { error } = await supabase
      .from("tenants")
      .update({
        property_id: propertyId,
        property: propertyName,
      })
      .eq("id", tenantId);

    if (error) {
      toast({ title: "Error", description: "Failed to assign tenant", variant: "destructive" });
    } else {
      toast({ title: "Tenant Assigned", description: `${tenant.name} assigned to ${propertyName}` });
      fetchData();
    }
  };

  const handleUnassignTenant = async (tenantId: string, tenantName: string, propertyName: string) => {
    const { error } = await supabase
      .from("tenants")
      .update({
        property_id: null,
        property: null,
      })
      .eq("id", tenantId);

    if (error) {
      toast({ title: "Error", description: "Failed to unassign tenant", variant: "destructive" });
    } else {
      toast({ title: "Tenant Unassigned", description: `${tenantName} removed from ${propertyName}` });
      fetchData();
    }
  };

  // Use category_key for display if available, fall back to property_type
  const getCategoryLabel = (property: any): string => {
    const catKey = property.category_key || property.property_type || 'residential_flat';
    const cat = CATEGORY_BY_KEY[catKey];
    if (cat) return cat.name;
    // Fallback labels for old property_type values
    const legacyLabels: Record<string, string> = {
      flat: "Flat / Apartment Block", villa: "Villa", bungalow: "Bungalow / Maisonette",
      mixed_use: "Mixed Use", apartment: "Flat / Apartment Block", townhouse: "Townhouse",
      commercial: "Office / Commercial",
    };
    return legacyLabels[catKey] || catKey;
  };

  const PropertyCard = ({ property, index }: { property: Property; index: number }) => {
    const occupancyRate = property.units > 0 ? (property.occupied / property.units) * 100 : 0;
    const isSelected = selectedProperties.has(property.id);
    const propertyTenants = tenants.filter(t => t.property_id === property.id);
    const propertyType = (property as any).property_type || "flat";
    const floors = (property as any).number_of_floors || 1;
    const rentPerHouse = (property as any).rent_per_house || 0;
    
    return (
      <Card
        className={`overflow-hidden transition-all duration-200 animate-fade-in hover:shadow-md ${isSelected ? 'ring-2 ring-primary' : ''}`}
        style={{ animationDelay: `${index * 30}ms` }}
      >
        <CardContent className="p-0">
          {/* Compact header with image */}
          <div className="flex items-stretch">
            <div className="w-24 h-24 flex-shrink-0 overflow-hidden">
              <img
                src={property.image_url || "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=200&h=200&fit=crop"}
                alt={property.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 p-3 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Link to={`/properties/${property.id}`} className="font-heading font-semibold text-foreground text-sm hover:text-primary transition-colors truncate block">
                    {property.name}
                  </Link>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    {property.address}
                  </p>
                </div>
                {/* Actions dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem asChild>
                      <Link to={`/properties/${property.id}`} className="flex items-center gap-2">
                        <Eye className="h-4 w-4" /> View Details
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to={`/properties/${property.id}?tab=units`} className="flex items-center gap-2">
                        <Layers className="h-4 w-4" /> Manage Houses
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openEditDialog(property)}>
                      <Pencil className="h-4 w-4 mr-2" /> Edit Property
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDeleteDialog(property)} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Deactivate
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {/* Key info row */}
              <div className="flex items-center gap-3 mt-2 flex-wrap">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                  {getCategoryLabel(property)}
                </Badge>
                <span className="text-xs text-muted-foreground">{property.units} units</span>
                <span className="text-xs text-muted-foreground">{propertyTenants.length} tenants</span>
                <span className={`text-xs font-medium ${occupancyRate >= 80 ? 'text-emerald-600' : occupancyRate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                  {occupancyRate.toFixed(0)}% occupied
                </span>
              </div>
            </div>
          </div>
          {/* Bottom stats bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-t border-border text-xs">
            <div className="flex items-center gap-4">
              <span className="text-muted-foreground">{floors} floor{floors !== 1 ? 's' : ''}</span>
              {rentPerHouse > 0 && (
                <span className="text-muted-foreground">Rent: {formatCurrency(rentPerHouse)}</span>
              )}
            </div>
            <span className="font-medium text-foreground">{formatCurrency(property.revenue)}</span>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Layout title="Properties" subtitle="Manage your property portfolio">
      {/* Clean toolbar */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9 text-sm bg-background border-border"
            />
          </div>

          {/* Filters dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <ArrowUpDown className="h-3.5 w-3.5" />
                Filters
                {(filterAgencyId !== "all" || filterOccupancy !== "all") && (
                  <Badge variant="secondary" className="h-4 px-1 text-[10px] ml-1">
                    {[filterAgencyId !== "all", filterOccupancy !== "all"].filter(Boolean).length}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64 p-3 space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Sort By</Label>
                <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                  const [field, order] = value.split("-") as [typeof sortBy, typeof sortOrder];
                  setSortBy(field);
                  setSortOrder(order);
                }}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name-asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z-A)</SelectItem>
                    <SelectItem value="units-desc">Units (High-Low)</SelectItem>
                    <SelectItem value="occupancy-desc">Occupancy (High-Low)</SelectItem>
                    <SelectItem value="revenue-desc">Revenue (High-Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Agency</Label>
                <Select value={filterAgencyId} onValueChange={setFilterAgencyId}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Agencies</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {agencies.map((agency) => (
                      <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Occupancy</Label>
                <Select value={filterOccupancy} onValueChange={setFilterOccupancy}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="empty">Empty (0%)</SelectItem>
                    <SelectItem value="low">Low (&lt;50%)</SelectItem>
                    <SelectItem value="medium">Medium (50-79%)</SelectItem>
                    <SelectItem value="high">High (80-99%)</SelectItem>
                    <SelectItem value="full">Full (100%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(filterAgencyId !== "all" || filterOccupancy !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={() => { setFilterAgencyId("all"); setFilterOccupancy("all"); }}
                >
                  Clear Filters
                </Button>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex-1" />

          {/* Action buttons */}
          <Button variant="outline" size="sm" className="h-9" onClick={() => setIsAgencyDialogOpen(true)}>
            <Building2 className="h-4 w-4 mr-1.5" />
            Add Agency
          </Button>
          <Button
            size="sm"
            className="h-9 bg-primary hover:bg-primary/90"
            onClick={() => atPropertyLimit
              ? toast({ title: 'Property limit reached', description: `Your ${subProfile?.subscription_tier ?? 'Starter'} plan allows ${subProfile?.max_properties ?? 5} properties. Upgrade at Platform Billing to add more.`, variant: 'destructive' })
              : setIsDialogOpen(true)
            }
            title={atPropertyLimit ? `Limit reached — upgrade to add more properties` : 'Add a new property'}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Property
            {atPropertyLimit && <span className="ml-1 text-xs opacity-75">(limit reached)</span>}
          </Button>
        </div>

        {/* Summary line */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{getFilteredProperties().length} properties</span>
          <span>·</span>
          <span>{getFilteredProperties().reduce((sum, p) => sum + p.units, 0)} total units</span>
          <span>·</span>
          <span>{formatCurrency(getFilteredProperties().reduce((sum, p) => sum + p.revenue, 0))} revenue</span>
        </div>
      </div>
      {/* Add Agency Dialog */}
      <Dialog open={isAgencyDialogOpen} onOpenChange={setIsAgencyDialogOpen}>
        <DialogContent className="sm:max-w-[450px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add New Agency</DialogTitle>
            <DialogDescription>Create a new managing agency for your properties.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="agency-name">Agency Name *</Label>
              <Input id="agency-name" value={newAgency.name} onChange={(e) => setNewAgency({ ...newAgency, name: e.target.value })} placeholder="ABC Property Management" className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="agency-email">Email</Label>
                <Input id="agency-email" type="email" value={newAgency.email} onChange={(e) => setNewAgency({ ...newAgency, email: e.target.value })} placeholder="contact@agency.com" className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="agency-phone">Phone</Label>
                <Input id="agency-phone" value={newAgency.phone} onChange={(e) => setNewAgency({ ...newAgency, phone: e.target.value })} placeholder="+1 234 567 890" className="bg-background border-border" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="agency-address">Address</Label>
              <Input id="agency-address" value={newAgency.address} onChange={(e) => setNewAgency({ ...newAgency, address: e.target.value })} placeholder="123 Main St, City" className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAgencyDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleAddAgency} disabled={isSaving}>{isSaving ? "Adding..." : "Add Agency"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Property Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground">Add New Property</DialogTitle>
            <DialogDescription>Enter the property details to add it to your portfolio.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="agency">Managing Agency</Label>
              <Select value={newProperty.agency_id || "none"} onValueChange={(value) => setNewProperty({ ...newProperty, agency_id: value === "none" ? "" : value })}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select an agency (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Agency</SelectItem>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="name">Property Name *</Label>
              <Input id="name" value={newProperty.name} onChange={(e) => setNewProperty({ ...newProperty, name: e.target.value })} placeholder="Sunset Apartments" className="bg-background border-border" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address *</Label>
              <Input id="address" value={newProperty.address} onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })} placeholder="1234 Main St, City, State ZIP" className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="property-type">Property Type</Label>
                <Select value={newProperty.property_type} onValueChange={(value) => setNewProperty({ ...newProperty, property_type: value })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select property type" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORIES_BY_GROUP).map(([group, cats]) => (
                      <React.Fragment key={group}>
                        <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide border-b border-border/50 mt-1">
                          {GROUP_LABELS[group]}
                        </div>
                        {cats.map(cat => (
                          <SelectItem key={cat.key} value={cat.key}>
                            <div className="flex items-center justify-between w-full gap-3">
                              <span>{cat.name}</span>
                              {cat.requiresTier !== 'lite' && (
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cat.requiresTier === 'enterprise' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                                  {cat.requiresTier === 'enterprise' ? 'Enterprise' : 'Pro+'}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </React.Fragment>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="floors">Number of Floors</Label>
                <Input id="floors" type="number" min="1" value={newProperty.number_of_floors} onChange={(e) => setNewProperty({ ...newProperty, number_of_floors: e.target.value })} placeholder="e.g., 3" className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="units">Number of Units</Label>
                <Input id="units" type="number" value={newProperty.units} onChange={(e) => setNewProperty({ ...newProperty, units: e.target.value })} placeholder="24" className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rent-per-house">Rent Per House</Label>
                <Input id="rent-per-house" type="number" min="0" value={newProperty.rent_per_house} onChange={(e) => setNewProperty({ ...newProperty, rent_per_house: e.target.value })} placeholder="e.g., 15000" className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="house-number">House Number</Label>
                <Input id="house-number" value={newProperty.house_number} onChange={(e) => setNewProperty({ ...newProperty, house_number: e.target.value })} placeholder="e.g., B12, Plot 45" className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="house-label-prefix">House Label Prefix</Label>
                <Input id="house-label-prefix" value={newProperty.house_label_prefix} onChange={(e) => setNewProperty({ ...newProperty, house_label_prefix: e.target.value })} placeholder="e.g., HSE, APT" className="bg-background border-border" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="payment-details">Payment Details</Label>
              <Input id="payment-details" value={newProperty.payment_details} onChange={(e) => setNewProperty({ ...newProperty, payment_details: e.target.value })} placeholder="e.g., Pay via M-Pesa to 123456" className="bg-background border-border" />
              <p className="text-xs text-muted-foreground">Payment instructions shown to tenants</p>
            </div>
            <ImageUpload
              value={newProperty.image_url}
              onChange={(url) => setNewProperty({ ...newProperty, image_url: url })}
              bucket="property-images"
              label="Property Image"
              placeholder="Upload or paste image URL"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleAddProperty} className="bg-primary hover:bg-primary/90" disabled={isSaving}>{isSaving ? "Adding..." : "Add Property"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Action Bar */}
      {selectedProperties.size > 0 && (
        <div className="flex items-center justify-between bg-primary/10 border border-primary/20 rounded-lg px-4 py-3 mb-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <Badge variant="default" className="px-3 py-1">
              {selectedProperties.size} selected
            </Badge>
            <span className="text-sm text-muted-foreground">
              {selectedProperties.size === 1 ? 'property' : 'properties'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Dialog open={isBulkAssignDialogOpen} onOpenChange={setIsBulkAssignDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Building2 className="h-4 w-4 mr-2" />
                  Assign to Agency
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[400px] bg-card border-border">
                <DialogHeader>
                  <DialogTitle>Assign Properties to Agency</DialogTitle>
                  <DialogDescription>
                    Assign {selectedProperties.size} {selectedProperties.size === 1 ? 'property' : 'properties'} to an agency.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Select Agency</Label>
                    <Select value={bulkAssignAgencyId || "none"} onValueChange={setBulkAssignAgencyId}>
                      <SelectTrigger className="bg-background border-border">
                        <SelectValue placeholder="Select an agency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Agency (Unassigned)</SelectItem>
                        {agencies.map((agency) => (
                          <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsBulkAssignDialogOpen(false)} disabled={isBulkAssigning}>Cancel</Button>
                  <Button onClick={handleBulkAssign} disabled={isBulkAssigning || !bulkAssignAgencyId}>
                    {isBulkAssigning ? "Assigning..." : "Assign Properties"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>
        </div>
      )}

      {/* Properties grouped by Agency */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading properties...</div>
      ) : getGroupedProperties().length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? `No properties found matching "${searchQuery}"` : "No properties found. Add your first property to get started."}
        </div>
      ) : (
        <div className="space-y-6">
          {getGroupedProperties().map(({ agency, properties: agencyProperties }) => (
            <Collapsible
              key={agency?.id || "unassigned"}
              open={agency ? expandedAgencies.has(agency.id) : true}
              onOpenChange={() => agency && toggleAgency(agency.id)}
            >
              <Card className="border-border">
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors py-3 px-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-primary" />
                        <div>
                          <CardTitle className="text-base">
                            {agency?.name || "Unassigned Properties"}
                          </CardTitle>
                          <span className="text-xs text-muted-foreground">{agencyProperties.length} properties</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {agency && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => e.stopPropagation()}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEditAgencyDialog(agency)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit Agency
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDeleteAgencyDialog(agency)} className="text-destructive focus:text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Delete Agency
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${agency && expandedAgencies.has(agency.id) ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {agencyProperties.map((property, index) => (
                        <PropertyCard key={property.id} property={property} index={index} />
                      ))}
                    </div>
                  </CardContent>
                </CollapsibleContent>
              </Card>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-heading text-foreground">Edit Property</DialogTitle>
            <DialogDescription>Update the property information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-agency">Managing Agency</Label>
              <Select value={editFormData.agency_id || "none"} onValueChange={(value) => setEditFormData({ ...editFormData, agency_id: value === "none" ? "" : value })}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select an agency (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Agency</SelectItem>
                  {agencies.map((agency) => (
                    <SelectItem key={agency.id} value={agency.id}>{agency.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Property Name *</Label>
              <Input id="edit-name" value={editFormData.name} onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })} placeholder="Sunset Apartments" className="bg-background border-border" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address *</Label>
              <Input id="edit-address" value={editFormData.address} onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })} placeholder="1234 Main St, City, State ZIP" className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-house-number">House Number</Label>
                <Input id="edit-house-number" value={editFormData.house_number} onChange={(e) => setEditFormData({ ...editFormData, house_number: e.target.value })} placeholder="e.g., B12, Plot 45" className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-house-label-prefix">House Label Prefix</Label>
                <Input id="edit-house-label-prefix" value={editFormData.house_label_prefix} onChange={(e) => setEditFormData({ ...editFormData, house_label_prefix: e.target.value })} placeholder="e.g., HSE, APT, Villa" className="bg-background border-border" />
                <p className="text-xs text-muted-foreground">Units will be labeled as PREFIX-001, PREFIX-002, etc.</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-units">Units</Label>
                <Input id="edit-units" type="number" value={editFormData.units} onChange={(e) => setEditFormData({ ...editFormData, units: e.target.value })} className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-occupied">Occupied</Label>
                <Input id="edit-occupied" type="number" value={editFormData.occupied} onChange={(e) => setEditFormData({ ...editFormData, occupied: e.target.value })} className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-revenue">Revenue</Label>
                <Input id="edit-revenue" type="number" value={editFormData.revenue} onChange={(e) => setEditFormData({ ...editFormData, revenue: e.target.value })} className="bg-background border-border" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-property-type">Property Type</Label>
                <Select value={editFormData.property_type} onValueChange={(value) => setEditFormData({ ...editFormData, property_type: value })}>
                  <SelectTrigger className="bg-background border-border">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flat">Flat</SelectItem>
                    <SelectItem value="villa">Villa</SelectItem>
                    <SelectItem value="bungalow">Bungalow</SelectItem>
                    <SelectItem value="mixed_use">Mixed Use</SelectItem>
                    <SelectItem value="apartment">Apartment</SelectItem>
                    <SelectItem value="townhouse">Townhouse</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-floors">Number of Floors</Label>
                <Input id="edit-floors" type="number" min="1" value={editFormData.number_of_floors} onChange={(e) => setEditFormData({ ...editFormData, number_of_floors: e.target.value })} placeholder="e.g., 3" className="bg-background border-border" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-rent-per-house">Rent Per House</Label>
              <Input id="edit-rent-per-house" type="number" min="0" value={editFormData.rent_per_house} onChange={(e) => setEditFormData({ ...editFormData, rent_per_house: e.target.value })} placeholder="e.g., 15000" className="bg-background border-border" />
              <p className="text-xs text-muted-foreground">Default rent amount per house/unit</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-payment-details">Payment Details</Label>
              <Input id="edit-payment-details" value={editFormData.payment_details} onChange={(e) => setEditFormData({ ...editFormData, payment_details: e.target.value })} placeholder="e.g., Pay via M-Pesa to 123456, Acc: Property Name" className="bg-background border-border" />
              <p className="text-xs text-muted-foreground">Payment instructions shown to tenants</p>
            </div>
            <ImageUpload
              value={editFormData.image_url}
              onChange={(url) => setEditFormData({ ...editFormData, image_url: url })}
              bucket="property-images"
              label="Property Image"
              placeholder="Upload or paste image URL"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleUpdateProperty} className="bg-primary hover:bg-primary/90" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Agency Dialog */}
      <Dialog open={isEditAgencyDialogOpen} onOpenChange={setIsEditAgencyDialogOpen}>
        <DialogContent className="sm:max-w-[450px] bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Agency</DialogTitle>
            <DialogDescription>Update agency information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-agency-name">Agency Name *</Label>
              <Input id="edit-agency-name" value={editAgencyFormData.name} onChange={(e) => setEditAgencyFormData({ ...editAgencyFormData, name: e.target.value })} className="bg-background border-border" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-agency-email">Email</Label>
                <Input id="edit-agency-email" type="email" value={editAgencyFormData.email} onChange={(e) => setEditAgencyFormData({ ...editAgencyFormData, email: e.target.value })} className="bg-background border-border" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-agency-phone">Phone</Label>
                <Input id="edit-agency-phone" value={editAgencyFormData.phone} onChange={(e) => setEditAgencyFormData({ ...editAgencyFormData, phone: e.target.value })} className="bg-background border-border" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-agency-address">Address</Label>
              <Input id="edit-agency-address" value={editAgencyFormData.address} onChange={(e) => setEditAgencyFormData({ ...editAgencyFormData, address: e.target.value })} className="bg-background border-border" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditAgencyDialogOpen(false)} disabled={isSaving}>Cancel</Button>
            <Button onClick={handleUpdateAgency} disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deactivate Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Deactivate Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to deactivate <span className="font-semibold text-foreground">{deleteProperty?.name}</span>? The property will be moved to history and can be reactivated later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProperty} disabled={isDeleting} className="bg-amber-600 text-white hover:bg-amber-700">
              {isDeleting ? "Deactivating..." : "Deactivate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Agency Confirmation Dialog */}
      <AlertDialog open={isDeleteAgencyDialogOpen} onOpenChange={setIsDeleteAgencyDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">Delete Agency</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold text-foreground">{deleteAgency?.name}</span>?
              {deleteAgency && properties.filter(p => p.agency_id === deleteAgency.id).length > 0 && (
                <span className="block mt-2">
                  <span className="font-medium text-foreground">{properties.filter(p => p.agency_id === deleteAgency.id).length}</span> {properties.filter(p => p.agency_id === deleteAgency.id).length === 1 ? 'property' : 'properties'} will be moved to unassigned.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingAgency}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAgency} disabled={isDeletingAgency} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeletingAgency ? "Deleting..." : "Delete Agency"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default Properties;
