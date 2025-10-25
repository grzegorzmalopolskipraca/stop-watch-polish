import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";

interface StreetVote {
  id: string;
  street_name: string;
  votes: number;
  voter_ips: string[];
}

interface StreetVotingProps {
  existingStreets: string[];
}

export const StreetVoting = ({ existingStreets }: StreetVotingProps) => {
  const [votes, setVotes] = useState<StreetVote[]>([]);
  const [newStreetName, setNewStreetName] = useState("");
  const [userIp, setUserIp] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  // Get user IP or fingerprint
  useEffect(() => {
    const getOrCreateFingerprint = () => {
      let fingerprint = localStorage.getItem("userFingerprint");
      if (!fingerprint) {
        fingerprint = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
        localStorage.setItem("userFingerprint", fingerprint);
      }
      return fingerprint;
    };
    setUserIp(getOrCreateFingerprint());
  }, []);

  // Fetch votes
  const fetchVotes = async () => {
    try {
      const { data, error } = await supabase
        .from("street_votes")
        .select("*")
        .order("votes", { ascending: false });

      if (error) throw error;
      setVotes(data || []);
    } catch (error) {
      console.error("Error fetching votes:", error);
    }
  };

  useEffect(() => {
    fetchVotes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("street-votes-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "street_votes",
        },
        () => {
          fetchVotes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Normalize street name to check for duplicates
  const normalizeStreetName = (name: string): string => {
    return name.toLowerCase().trim();
  };

  // Check if street name is similar (without last 3 letters)
  const isSimilarStreet = (name1: string, name2: string): boolean => {
    const normalized1 = normalizeStreetName(name1);
    const normalized2 = normalizeStreetName(name2);
    
    if (normalized1 === normalized2) return true;
    
    // Check if they're the same without last 3 letters (for Polish declensions)
    if (normalized1.length > 3 && normalized2.length > 3) {
      const prefix1 = normalized1.slice(0, -3);
      const prefix2 = normalized2.slice(0, -3);
      return prefix1 === prefix2;
    }
    
    return false;
  };

  // Check if street already exists in the main list or in votes
  const isStreetDuplicate = (streetName: string): boolean => {
    const normalized = normalizeStreetName(streetName);
    
    // Check against existing streets
    for (const existingStreet of existingStreets) {
      if (isSimilarStreet(streetName, existingStreet)) {
        return true;
      }
    }
    
    // Check against votes
    for (const vote of votes) {
      if (isSimilarStreet(streetName, vote.street_name)) {
        return true;
      }
    }
    
    return false;
  };

  // Add or vote for a street
  const handleVote = async (streetName: string, isNewStreet: boolean = false) => {
    if (!userIp) {
      toast.error("Nie można zidentyfikować użytkownika");
      return;
    }

    setIsLoading(true);

    try {
      // Check if street already exists in main list or similar street exists
      if (isNewStreet) {
        if (isStreetDuplicate(streetName)) {
          toast.error("Ta ulica już jest na liście lub istnieje podobna nazwa");
          setIsLoading(false);
          return;
        }
      }

      // Find existing vote
      const existingVote = votes.find(
        (v) => normalizeStreetName(v.street_name) === normalizeStreetName(streetName)
      );

      if (existingVote) {
        // Check if user already voted
        if (existingVote.voter_ips.includes(userIp)) {
          toast.error("Już głosowałeś na tę ulicę");
          setIsLoading(false);
          return;
        }

        // Update vote count
        const updatedVoterIps = [...existingVote.voter_ips, userIp];
        const { error } = await supabase
          .from("street_votes")
          .update({
            votes: existingVote.votes + 1,
            voter_ips: updatedVoterIps,
          })
          .eq("id", existingVote.id);

        if (error) throw error;
        toast.success("Dziękujemy za głos!");
      } else {
        // Create new vote
        const { error } = await supabase
          .from("street_votes")
          .insert({
            street_name: streetName,
            votes: 1,
            voter_ips: [userIp],
          });

        if (error) throw error;
        toast.success("Dziękujemy za dodanie nowej ulicy!");
        setNewStreetName("");
      }

      await fetchVotes();
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Błąd podczas głosowania");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewStreet = () => {
    const trimmedName = newStreetName.trim();
    if (!trimmedName) {
      toast.error("Podaj nazwę ulicy");
      return;
    }
    handleVote(trimmedName, true);
  };

  const hasUserVoted = (vote: StreetVote): boolean => {
    return vote.voter_ips.includes(userIp);
  };

  return (
    <div className="bg-card rounded-lg p-5 border border-border space-y-4">
      <h3 className="text-lg font-semibold text-center">
        Głosuj na ulicę, którą należy tu dodać
      </h3>
      
      {/* Add new street */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Wpisz nazwę ulicy..."
          value={newStreetName}
          onChange={(e) => setNewStreetName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleAddNewStreet();
            }
          }}
          className="flex-1"
        />
        <Button
          onClick={handleAddNewStreet}
          disabled={isLoading || !newStreetName.trim()}
        >
          Dodaj
        </Button>
      </div>

      {/* Votes list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {votes.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            Brak głosów. Dodaj pierwszą ulicę!
          </p>
        ) : (
          votes.map((vote) => (
            <div
              key={vote.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <span className="font-medium">{vote.street_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  {vote.votes}
                </span>
                <Button
                  size="sm"
                  variant={hasUserVoted(vote) ? "secondary" : "default"}
                  onClick={() => handleVote(vote.street_name)}
                  disabled={isLoading || hasUserVoted(vote)}
                  className="gap-1"
                >
                  <ThumbsUp className="h-4 w-4" />
                  {hasUserVoted(vote) ? "Zagłosowano" : "Głosuj"}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
