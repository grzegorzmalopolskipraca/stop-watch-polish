import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThumbsUp, Share2 } from "lucide-react";
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
      setVotes((data || []).map(vote => ({
        ...vote,
        voter_ips: (vote.voter_ips as string[]) || []
      })));
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

  // Add or vote for a street
  const handleVote = async (streetName: string, isNewStreet: boolean = false) => {
    if (!userIp) {
      toast.error("Nie można zidentyfikować użytkownika");
      return;
    }

    setIsLoading(true);

    try {
      // Handle voting with content filtering
      const { data, error } = await supabase.functions.invoke('submit-street-vote', {
        body: {
          streetName: streetName,
          userFingerprint: userIp,
          existingStreets: existingStreets,
        },
      });

      if (error) {
        console.error("Error:", error);
        throw error;
      }

      if (data?.error) {
        toast.error(data.error);
        setIsLoading(false);
        return;
      }

      toast.success(data.message);
      if (isNewStreet) {
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

  const handleShare = async () => {
    const shareUrl = 'https://ejedzie.pl';
    const shareData = {
      title: 'Głosuj na ulicę',
      text: 'Zagłosuj która ulica powinna być dodana do monitoringu ruchu!',
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Udostępniono pomyślnie!");
      } else {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Link skopiowany do schowka!");
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Error sharing:", error);
      }
    }
  };

  return (
    <div className="bg-card rounded-lg p-5 border border-border space-y-4">
      <h3 className="text-lg font-semibold text-center">
        Głosuj którą ulicę dodać
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

      {/* Share button */}
      <Button
        onClick={handleShare}
        variant="outline"
        className="w-full gap-2"
      >
        <Share2 className="h-4 w-4" />
        Udostępnij znajomym, niech głosują
      </Button>
    </div>
  );
};
