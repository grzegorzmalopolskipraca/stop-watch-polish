import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit2, ChevronUp, ChevronDown, Plus, Minus, Database, Clock } from "lucide-react";
import { RssTicker } from "@/components/RssTicker";
import { formatDistanceToNow } from "date-fns";

interface RssItem {
  id: string;
  text: string;
  position: number;
}

const Rss = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [items, setItems] = useState<RssItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newItemText, setNewItemText] = useState("");
  const [tickerSpeed, setTickerSpeed] = useState(60);
  const [isDeletingRateLimits, setIsDeletingRateLimits] = useState(false);
  const [autoTrafficInterval, setAutoTrafficInterval] = useState(15);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      fetchItems();
      fetchTickerSpeed();
      fetchAutoTrafficSettings();
    }
  }, [isAuthenticated]);

  const fetchTickerSpeed = async () => {
    const { data } = await supabase
      .from('rss_ticker_settings')
      .select('speed')
      .maybeSingle();
    
    if (data) {
      setTickerSpeed(data.speed);
    }
  };

  const fetchAutoTrafficSettings = async () => {
    const { data } = await supabase
      .from('auto_traffic_settings')
      .select('*')
      .maybeSingle();
    
    if (data) {
      setAutoTrafficInterval(data.interval_minutes);
      setLastRunAt(data.last_run_at);
    }
  };

  const updateAutoTrafficInterval = async (newInterval: number) => {
    setAutoTrafficInterval(newInterval);
    
    const { data: existing } = await supabase
      .from('auto_traffic_settings')
      .select('id')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('auto_traffic_settings')
        .update({ interval_minutes: newInterval })
        .eq('id', existing.id);
      
      toast({
        title: "Success",
        description: `Auto traffic interval updated to ${newInterval} minutes`,
      });
    }
  };

  const handleManualMonitor = async () => {
    setIsMonitoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('auto-traffic-monitor');
      
      if (error) {
        throw error;
      }

      await fetchAutoTrafficSettings(); // Refresh settings to get new last_run_at
      
      toast({
        title: "Success",
        description: data.message || `Processed ${data.processed || 0} reports`,
      });
    } catch (error) {
      console.error('Error running monitor:', error);
      toast({
        title: "Error",
        description: "Failed to run traffic monitor",
        variant: "destructive",
      });
    } finally {
      setIsMonitoring(false);
    }
  };

  const updateTickerSpeed = async (newSpeed: number) => {
    setTickerSpeed(newSpeed);
    
    const { data: existing } = await supabase
      .from('rss_ticker_settings')
      .select('id')
      .maybeSingle();

    if (existing) {
      await supabase
        .from('rss_ticker_settings')
        .update({ speed: newSpeed })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('rss_ticker_settings')
        .insert([{ speed: newSpeed }]);
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("rss_items")
      .select("*")
      .order("position", { ascending: true });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load items",
        variant: "destructive",
      });
      return;
    }

    setItems(data || []);
  };

  const handleLogin = () => {
    if (password === "grzelazny") {
      setIsAuthenticated(true);
      setPassword("");
    } else {
      toast({
        title: "Error",
        description: "Incorrect password",
        variant: "destructive",
      });
    }
  };

  const handleAddItem = async () => {
    if (!newItemText.trim() || newItemText.length > 200) {
      toast({
        title: "Error",
        description: "Text must be between 1 and 200 characters",
        variant: "destructive",
      });
      return;
    }

    const maxPosition = items.length > 0 ? Math.max(...items.map(i => i.position)) : -1;

    const { error } = await supabase
      .from("rss_items")
      .insert([{ text: newItemText, position: maxPosition + 1 }]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
      return;
    }

    setNewItemText("");
    fetchItems();
    toast({
      title: "Success",
      description: "Item added successfully",
    });
  };

  const handleUpdateItem = async (id: string) => {
    if (!editText.trim() || editText.length > 200) {
      toast({
        title: "Error",
        description: "Text must be between 1 and 200 characters",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("rss_items")
      .update({ text: editText })
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
      return;
    }

    setEditingId(null);
    setEditText("");
    fetchItems();
    toast({
      title: "Success",
      description: "Item updated successfully",
    });
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase
      .from("rss_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
      return;
    }

    fetchItems();
    toast({
      title: "Success",
      description: "Item deleted successfully",
    });
  };

  const handleMoveItem = async (id: string, direction: "up" | "down") => {
    const currentIndex = items.findIndex(item => item.id === id);
    if (
      (direction === "up" && currentIndex === 0) ||
      (direction === "down" && currentIndex === items.length - 1)
    ) {
      return;
    }

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const currentItem = items[currentIndex];
    const swapItem = items[swapIndex];

    const updates = [
      supabase.from("rss_items").update({ position: swapItem.position }).eq("id", currentItem.id),
      supabase.from("rss_items").update({ position: currentItem.position }).eq("id", swapItem.id),
    ];

    const results = await Promise.all(updates);
    
    if (results.some(r => r.error)) {
      toast({
        title: "Error",
        description: "Failed to reorder items",
        variant: "destructive",
      });
      return;
    }

    fetchItems();
  };

  const handleDeleteOldRateLimits = async () => {
    if (!confirm("Are you sure you want to delete 10,000 oldest rate limit entries? This action cannot be undone.")) {
      return;
    }

    setIsDeletingRateLimits(true);

    try {
      // First, get the IDs of the 10,000 oldest records
      const { data: oldestRecords, error: fetchError } = await supabase
        .from("rate_limits")
        .select("id")
        .order("created_at", { ascending: true })
        .limit(10000);

      if (fetchError) {
        throw fetchError;
      }

      if (!oldestRecords || oldestRecords.length === 0) {
        toast({
          title: "Info",
          description: "No rate limit records to delete",
        });
        setIsDeletingRateLimits(false);
        return;
      }

      console.log(`[Rate Limits Cleanup] Found ${oldestRecords.length} oldest records to delete`);

      // Delete those records
      const idsToDelete = oldestRecords.map(r => r.id);
      const { error: deleteError } = await supabase
        .from("rate_limits")
        .delete()
        .in("id", idsToDelete);

      if (deleteError) {
        throw deleteError;
      }

      console.log(`[Rate Limits Cleanup] Successfully deleted ${oldestRecords.length} records`);

      toast({
        title: "Success",
        description: `Deleted ${oldestRecords.length} oldest rate limit entries`,
      });
    } catch (error) {
      console.error("[Rate Limits Cleanup] Error:", error);
      toast({
        title: "Error",
        description: "Failed to delete rate limit entries",
        variant: "destructive",
      });
    } finally {
      setIsDeletingRateLimits(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 space-y-4">
          <h1 className="text-2xl font-bold text-center">RSS Management</h1>
          <div className="space-y-4">
            <Input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleLogin()}
            />
            <Button onClick={handleLogin} className="w-full">
              Enter
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <RssTicker />
      
      <div className="p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <h1 className="text-3xl font-bold">RSS Ticker Management</h1>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Ticker Speed:</span>
                  <Button
                    onClick={() => updateTickerSpeed(Math.min(tickerSpeed + 10, 120))}
                    variant="outline"
                    size="icon"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium w-12 text-center">{tickerSpeed}s</span>
                  <Button
                    onClick={() => updateTickerSpeed(Math.max(tickerSpeed - 10, 20))}
                    variant="outline"
                    size="icon"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleDeleteOldRateLimits}
                  disabled={isDeletingRateLimits}
                  variant="destructive"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <Database className="h-4 w-4" />
                  {isDeletingRateLimits ? "Deleting..." : "Clean Rate Limits"}
                </Button>
              </div>
              
              <div className="flex flex-col gap-2 p-4 border rounded-lg bg-card">
                <h3 className="text-sm font-semibold">Auto Traffic Monitoring</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Interval:</span>
                  {[15, 20, 25, 30].map((interval) => (
                    <Button
                      key={interval}
                      onClick={() => updateAutoTrafficInterval(interval)}
                      variant={autoTrafficInterval === interval ? "default" : "outline"}
                      size="sm"
                    >
                      {interval}m
                    </Button>
                  ))}
                  <Button
                    onClick={handleManualMonitor}
                    disabled={isMonitoring}
                    variant="secondary"
                    size="sm"
                    className="ml-auto"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    {isMonitoring ? "Running..." : "Run Now"}
                  </Button>
                </div>
                {lastRunAt && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>Last run: {formatDistanceToNow(new Date(lastRunAt), { addSuffix: true })}</span>
                  </div>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Monitors all streets automatically between 5 AM - 10 PM. Click "Run Now" to trigger manually.
                </p>
              </div>
            </div>
          </div>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Enter new item text (max 200 characters)"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              maxLength={200}
              className="flex-1"
            />
            <Button onClick={handleAddItem} size="icon" className="mt-auto">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {newItemText.length}/200 characters
          </p>
        </div>

        <div className="space-y-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="border rounded-lg p-4 space-y-2 bg-card"
            >
              {editingId === item.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    maxLength={200}
                  />
                  <p className="text-sm text-muted-foreground">
                    {editText.length}/200 characters
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => handleUpdateItem(item.id)} size="sm">
                      Save
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingId(null);
                        setEditText("");
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-4">
                  <p className="flex-1">{item.text}</p>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleMoveItem(item.id, "up")}
                      disabled={index === 0}
                      variant="outline"
                      size="icon"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleMoveItem(item.id, "down")}
                      disabled={index === items.length - 1}
                      variant="outline"
                      size="icon"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => {
                        setEditingId(item.id);
                        setEditText(item.text);
                      }}
                      variant="outline"
                      size="icon"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteItem(item.id)}
                      variant="destructive"
                      size="icon"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              No items yet. Add your first item above.
            </p>
          )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rss;
