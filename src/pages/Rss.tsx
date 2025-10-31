import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit2, ChevronUp, ChevronDown, Plus, Minus } from "lucide-react";
import { RssTicker } from "@/components/RssTicker";

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
  const { toast } = useToast();

  useEffect(() => {
    if (isAuthenticated) {
      fetchItems();
      fetchTickerSpeed();
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
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">RSS Ticker Management</h1>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Speed:</span>
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
