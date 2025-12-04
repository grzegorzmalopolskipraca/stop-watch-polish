import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const STREETS = [
  "Borowska",
  "Buforowa",
  "Grabiszyńska",
  "Grota Roweckiego",
  "Hallera",
  "Karkonoska",
  "Ołtaszyńska",
  "Opolska",
  "Parafialna",
  "Powstańców Śląskich",
  "Radosna",
  "Sudecka",
  "Ślężna",
  "Zwycięska",
];

interface Location {
  id: string;
  name: string;
  street: string | null;
  created_at: string;
}

interface Coupon {
  id: string;
  local_id: string;
  local_name: string;
  image_link: string | null;
  time_from: string;
  time_to: string | null;
  discount: number;
  status: "empty" | "active" | "used" | "redeemed";
  created_at: string;
  show_on_streets: string | null;
}

const PASSWORD = "grzelazny";

export default function Coupons() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const { toast } = useToast();

  // New location form
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationStreet, setNewLocationStreet] = useState("");

  // Edit location form
  const [editLocationName, setEditLocationName] = useState("");
  const [editLocationStreet, setEditLocationStreet] = useState("");

  // New coupon form
  const [newCouponImageLink, setNewCouponImageLink] = useState("");
  const [newCouponImageFile, setNewCouponImageFile] = useState<File | null>(null);
  const [newCouponImagePreview, setNewCouponImagePreview] = useState<string>("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("");
  const [newCouponStatus, setNewCouponStatus] = useState<Coupon["status"]>("empty");
  const [newCouponShowOnStreets, setNewCouponShowOnStreets] = useState<string>("");
  const [isUploadingNew, setIsUploadingNew] = useState(false);

  // Edit coupon form
  const [editCouponImageLink, setEditCouponImageLink] = useState("");
  const [editCouponImageFile, setEditCouponImageFile] = useState<File | null>(null);
  const [editCouponImagePreview, setEditCouponImagePreview] = useState<string>("");
  const [editCouponTimeFrom, setEditCouponTimeFrom] = useState("");
  const [editCouponTimeTo, setEditCouponTimeTo] = useState("");
  const [editCouponDiscount, setEditCouponDiscount] = useState("");
  const [editCouponStatus, setEditCouponStatus] = useState<Coupon["status"]>("empty");
  const [editCouponShowOnStreets, setEditCouponShowOnStreets] = useState<string>("");
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadLocations();
      loadCoupons();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (selectedLocationId) {
      loadCoupons();
    }
  }, [selectedLocationId]);

  const handleLogin = () => {
    if (password === PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from("locations")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error loading locations",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setLocations(data || []);
    }
  };

  const loadCoupons = async () => {
    let query = supabase.from("coupons").select("*").order("created_at", { ascending: false });

    if (selectedLocationId) {
      query = query.eq("local_id", selectedLocationId);
    }

    const { data, error } = await query;

    if (error) {
      toast({
        title: "Error loading coupons",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setCoupons((data as Coupon[]) || []);
    }
  };

  const addLocation = async () => {
    if (!newLocationName.trim()) {
      toast({
        title: "Validation error",
        description: "Location name is required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase.from("locations").insert({
      name: newLocationName.trim(),
      street: newLocationStreet.trim() || null,
    });

    if (error) {
      toast({
        title: "Error adding location",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Location added successfully",
      });
      setNewLocationName("");
      setNewLocationStreet("");
      loadLocations();
    }
  };

  const deleteLocation = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;

    const { error } = await supabase.from("locations").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting location",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Location deleted successfully",
      });
      if (selectedLocationId === id) {
        setSelectedLocationId("");
      }
      loadLocations();
      loadCoupons();
    }
  };

  const startEditingLocation = (location: Location) => {
    setEditingLocationId(location.id);
    setEditLocationName(location.name);
    setEditLocationStreet(location.street || "");
  };

  const cancelEditingLocation = () => {
    setEditingLocationId(null);
    setEditLocationName("");
    setEditLocationStreet("");
  };

  const saveLocation = async (id: string) => {
    if (!editLocationName.trim()) {
      toast({
        title: "Validation error",
        description: "Location name is required",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("locations")
      .update({
        name: editLocationName.trim(),
        street: editLocationStreet.trim() || null,
      })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error updating location",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Location updated successfully",
      });
      cancelEditingLocation();
      loadLocations();
      loadCoupons();
    }
  };

  const handleNewImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewCouponImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCouponImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setNewCouponImageLink("");
    }
  };

  const removeNewImage = () => {
    setNewCouponImageFile(null);
    setNewCouponImagePreview("");
    setNewCouponImageLink("");
  };

  const uploadImage = async (file: File, prefix: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${prefix}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('coupon-images')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('coupon-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const addCoupon = async () => {
    if (!selectedLocationId) {
      toast({
        title: "Validation error",
        description: "Please select a location first",
        variant: "destructive",
      });
      return;
    }

    const discount = parseInt(newCouponDiscount);
    if (isNaN(discount) || discount < 1 || discount > 100) {
      toast({
        title: "Validation error",
        description: "Discount must be between 1 and 100",
        variant: "destructive",
      });
      return;
    }

    const selectedLocation = locations.find((l) => l.id === selectedLocationId);
    if (!selectedLocation) return;

    setIsUploadingNew(true);

    try {
      let imageUrl = newCouponImageLink.trim() || null;

      // Upload file if provided
      if (newCouponImageFile) {
        imageUrl = await uploadImage(newCouponImageFile, 'coupon');
      }

      const { error } = await supabase.from("coupons").insert({
        local_id: selectedLocationId,
        local_name: selectedLocation.name,
        image_link: imageUrl,
        discount,
        status: newCouponStatus,
        show_on_streets: newCouponShowOnStreets || null,
      });

      if (error) {
        toast({
          title: "Error adding coupon",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Coupon added successfully",
        });
        setNewCouponImageLink("");
        setNewCouponImageFile(null);
        setNewCouponImagePreview("");
        setNewCouponDiscount("");
        setNewCouponStatus("empty");
        setNewCouponShowOnStreets("");
        loadCoupons();
      }
    } catch (error: any) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingNew(false);
    }
  };

  const deleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;

    const { error } = await supabase.from("coupons").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting coupon",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Coupon deleted successfully",
      });
      loadCoupons();
    }
  };

  const handleEditImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditCouponImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditCouponImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeEditImage = async () => {
    setEditCouponImageFile(null);
    setEditCouponImagePreview("");
    setEditCouponImageLink("");
  };

  const startEditingCoupon = (coupon: Coupon) => {
    setEditingCouponId(coupon.id);
    setEditCouponImageLink(coupon.image_link || "");
    setEditCouponImageFile(null);
    setEditCouponImagePreview(coupon.image_link || "");
    setEditCouponTimeFrom(formatDateTimeLocal(coupon.time_from));
    setEditCouponTimeTo(coupon.time_to ? formatDateTimeLocal(coupon.time_to) : "");
    setEditCouponDiscount(coupon.discount.toString());
    setEditCouponStatus(coupon.status);
    setEditCouponShowOnStreets(coupon.show_on_streets || "");
  };

  const cancelEditingCoupon = () => {
    setEditingCouponId(null);
    setEditCouponImageLink("");
    setEditCouponImageFile(null);
    setEditCouponImagePreview("");
    setEditCouponTimeFrom("");
    setEditCouponTimeTo("");
    setEditCouponDiscount("");
    setEditCouponStatus("empty");
    setEditCouponShowOnStreets("");
  };

  const saveCoupon = async (id: string) => {
    const discount = parseInt(editCouponDiscount);
    if (isNaN(discount) || discount < 1 || discount > 100) {
      toast({
        title: "Validation error",
        description: "Discount must be between 1 and 100",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingEdit(true);

    try {
      let imageUrl = editCouponImageLink.trim() || null;

      // Upload new file if provided
      if (editCouponImageFile) {
        imageUrl = await uploadImage(editCouponImageFile, 'coupon-edit');
      }

      const { error } = await supabase
        .from("coupons")
        .update({
          image_link: imageUrl,
          time_from: editCouponTimeFrom,
          time_to: editCouponTimeTo || null,
          discount,
          status: editCouponStatus,
          show_on_streets: editCouponShowOnStreets || null,
        })
        .eq("id", id);

      if (error) {
        toast({
          title: "Error updating coupon",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Coupon updated successfully",
        });
        cancelEditingCoupon();
        loadCoupons();
      }
    } catch (error: any) {
      toast({
        title: "Error uploading image",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingEdit(false);
    }
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "---";
    const date = new Date(dateString);
    return date.toLocaleString("pl-PL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTimeLocal = (dateString: string) => {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
  };

  const getStatusBadge = (status: Coupon["status"]) => {
    const variants = {
      empty: "secondary",
      active: "default",
      used: "outline",
      redeemed: "default",
    };
    const colors = {
      empty: "bg-gray-500",
      active: "bg-blue-500",
      used: "bg-yellow-500",
      redeemed: "bg-green-500",
    };
    return (
      <Badge className={colors[status]} variant={variants[status] as any}>
        {status}
      </Badge>
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-4 bg-card rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center text-foreground">Coupon Management</h1>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError(false);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              />
            </div>
            {passwordError && (
              <p className="text-sm text-destructive">Incorrect password</p>
            )}
            <Button onClick={handleLogin} className="w-full">
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedLocation = locations.find((l) => l.id === selectedLocationId);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold text-foreground">Coupon Management System</h1>

        {/* SECTION 1: Location Management */}
        <section className="bg-card rounded-lg p-6 shadow">
          <h2 className="text-2xl font-semibold mb-4">➕ Location Management</h2>
          
          {/* Add Location Form */}
          <div className="mb-6 p-4 bg-muted rounded-lg space-y-3">
            <h3 className="font-medium">Add New Location</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="newLocationName">Location Name *</Label>
                <Input
                  id="newLocationName"
                  value={newLocationName}
                  onChange={(e) => setNewLocationName(e.target.value)}
                  placeholder="e.g., BurgerSpot"
                />
              </div>
              <div>
                <Label htmlFor="newLocationStreet">Street/Address</Label>
                <Input
                  id="newLocationStreet"
                  value={newLocationStreet}
                  onChange={(e) => setNewLocationStreet(e.target.value)}
                  placeholder="e.g., ul. Zwycięska 12"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={addLocation} className="w-full bg-green-600 hover:bg-green-700">
                  Add Location
                </Button>
              </div>
            </div>
          </div>

          {/* Locations Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Street</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((location) => (
                <TableRow key={location.id} className="hover:bg-muted/50">
                  {editingLocationId === location.id ? (
                    <>
                      <TableCell className="font-mono text-xs break-all">{location.id}</TableCell>
                      <TableCell>
                        <Input
                          value={editLocationName}
                          onChange={(e) => setEditLocationName(e.target.value)}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={editLocationStreet}
                          onChange={(e) => setEditLocationStreet(e.target.value)}
                        />
                      </TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" onClick={() => saveLocation(location.id)}>
                          Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditingLocation}>
                          Cancel
                        </Button>
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-mono text-xs break-all">{location.id}</TableCell>
                      <TableCell>{location.name}</TableCell>
                      <TableCell>{location.street || "---"}</TableCell>
                      <TableCell className="space-x-2">
                        <Button size="sm" variant="outline" onClick={() => startEditingLocation(location)}>
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteLocation(location.id, location.name)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>

        {/* SECTION 2: Select Location */}
        <section className="bg-card rounded-lg p-6 shadow">
          <Label className="text-lg mb-2 block">📍 Select a location to manage coupons:</Label>
          <Select value={selectedLocationId} onValueChange={setSelectedLocationId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="-- Select location --" />
            </SelectTrigger>
            <SelectContent>
              {locations.map((location) => (
                <SelectItem key={location.id} value={location.id}>
                  {location.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </section>

        {/* SECTION 3: Coupon Management */}
        {selectedLocationId && (
          <section className="bg-card rounded-lg p-6 shadow">
            <h2 className="text-2xl font-semibold mb-4">🎫 Coupon Management</h2>

            {/* Add Coupon Form */}
            <div className="mb-6 p-4 bg-muted rounded-lg space-y-3">
              <h3 className="font-medium">
                Add New Coupon for: {selectedLocation?.name}
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-2">
                    <Label htmlFor="newCouponImageFile">Upload Image</Label>
                    <Input
                      id="newCouponImageFile"
                      type="file"
                      accept="image/*"
                      onChange={handleNewImageFileChange}
                      disabled={isUploadingNew}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="newCouponImageLink">Or Image URL</Label>
                    <Input
                      id="newCouponImageLink"
                      type="url"
                      value={newCouponImageLink}
                      onChange={(e) => setNewCouponImageLink(e.target.value)}
                      placeholder="https://..."
                      disabled={!!newCouponImageFile || isUploadingNew}
                    />
                  </div>
                </div>
                {(newCouponImagePreview || newCouponImageLink) && (
                  <div className="flex items-center gap-2">
                    <img
                      src={newCouponImagePreview || newCouponImageLink}
                      alt="Preview"
                      className="w-20 h-20 object-cover rounded border"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeNewImage}
                      disabled={isUploadingNew}
                    >
                      Remove Image
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="newCouponDiscount">Discount (%)</Label>
                    <Input
                      id="newCouponDiscount"
                      type="number"
                      min="1"
                      max="100"
                      value={newCouponDiscount}
                      onChange={(e) => setNewCouponDiscount(e.target.value)}
                      placeholder="20"
                      disabled={isUploadingNew}
                    />
                  </div>
                  <div>
                    <Label htmlFor="newCouponStatus">Status</Label>
                    <Select 
                      value={newCouponStatus} 
                      onValueChange={(v) => setNewCouponStatus(v as Coupon["status"])}
                      disabled={isUploadingNew}
                    >
                      <SelectTrigger id="newCouponStatus">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="empty">empty</SelectItem>
                        <SelectItem value="active">active</SelectItem>
                        <SelectItem value="used">used</SelectItem>
                        <SelectItem value="redeemed">redeemed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="newCouponShowOnStreets">Show on Street (leave empty for all streets)</Label>
                    <Select 
                      value={newCouponShowOnStreets} 
                      onValueChange={setNewCouponShowOnStreets}
                      disabled={isUploadingNew}
                    >
                      <SelectTrigger id="newCouponShowOnStreets">
                        <SelectValue placeholder="All streets" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All streets</SelectItem>
                        {STREETS.map((street) => (
                          <SelectItem key={street} value={street}>
                            {street}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={addCoupon} 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={isUploadingNew}
                    >
                      {isUploadingNew ? "Uploading..." : "Add Coupon"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Coupons Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Time From</TableHead>
                  <TableHead>Time To</TableHead>
                  <TableHead>Discount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Show on Street</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((coupon) => (
                  <TableRow key={coupon.id} className="hover:bg-muted/50">
                    {editingCouponId === coupon.id ? (
                      <>
                        <TableCell className="font-mono text-xs break-all">{coupon.id}</TableCell>
                        <TableCell>{coupon.local_name}</TableCell>
                        <TableCell>
                          <div className="space-y-2">
                            {(editCouponImagePreview || editCouponImageLink) && (
                              <div className="flex items-center gap-2">
                                <img
                                  src={editCouponImagePreview || editCouponImageLink}
                                  alt="Preview"
                                  className="w-12 h-12 object-cover rounded"
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={removeEditImage}
                                  disabled={isUploadingEdit}
                                >
                                  Remove
                                </Button>
                              </div>
                            )}
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleEditImageFileChange}
                              className="w-32"
                              disabled={isUploadingEdit}
                            />
                            <Input
                              type="url"
                              value={editCouponImageLink}
                              onChange={(e) => setEditCouponImageLink(e.target.value)}
                              placeholder="Or URL"
                              className="w-32"
                              disabled={!!editCouponImageFile || isUploadingEdit}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="datetime-local"
                            value={editCouponTimeFrom}
                            onChange={(e) => setEditCouponTimeFrom(e.target.value)}
                            className="w-40"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="datetime-local"
                            value={editCouponTimeTo}
                            onChange={(e) => setEditCouponTimeTo(e.target.value)}
                            className="w-40"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="1"
                            max="100"
                            value={editCouponDiscount}
                            onChange={(e) => setEditCouponDiscount(e.target.value)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Select value={editCouponStatus} onValueChange={(v) => setEditCouponStatus(v as Coupon["status"])}>
                            <SelectTrigger className="w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="empty">empty</SelectItem>
                              <SelectItem value="active">active</SelectItem>
                              <SelectItem value="used">used</SelectItem>
                              <SelectItem value="redeemed">redeemed</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={editCouponShowOnStreets} 
                            onValueChange={setEditCouponShowOnStreets}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="All streets" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All streets</SelectItem>
                              {STREETS.map((street) => (
                                <SelectItem key={street} value={street}>
                                  {street}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="space-x-2">
                          <Button 
                            size="sm" 
                            onClick={() => saveCoupon(coupon.id)}
                            disabled={isUploadingEdit}
                          >
                            {isUploadingEdit ? "Saving..." : "Save"}
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={cancelEditingCoupon}
                            disabled={isUploadingEdit}
                          >
                            Cancel
                          </Button>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-mono text-xs break-all">{coupon.id}</TableCell>
                        <TableCell>{coupon.local_name}</TableCell>
                        <TableCell>
                          {coupon.image_link ? (
                            <img
                              src={coupon.image_link}
                              alt="Coupon"
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            "---"
                          )}
                        </TableCell>
                        <TableCell>{formatDateTime(coupon.time_from)}</TableCell>
                        <TableCell>{formatDateTime(coupon.time_to)}</TableCell>
                        <TableCell>{coupon.discount}%</TableCell>
                        <TableCell>{getStatusBadge(coupon.status)}</TableCell>
                        <TableCell>{coupon.show_on_streets || "All streets"}</TableCell>
                        <TableCell className="space-x-2">
                          <Button size="sm" variant="outline" onClick={() => startEditingCoupon(coupon)}>
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteCoupon(coupon.id)}
                          >
                            Delete
                          </Button>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {coupons.length === 0 && (
              <p className="text-center text-muted-foreground mt-4">
                No coupons found for this location.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
