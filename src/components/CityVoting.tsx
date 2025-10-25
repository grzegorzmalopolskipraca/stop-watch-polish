import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";

interface CityVote {
  id: string;
  city_name: string;
  votes: number;
  voter_ips: string[];
}

export const CityVoting = () => {
  const [votes, setVotes] = useState<CityVote[]>([]);
  const [newCityName, setNewCityName] = useState("");
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
        .from("city_votes")
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
      .channel("city-votes-updates")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "city_votes",
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

  // Normalize city name
  const normalizeCityName = (name: string): string => {
    return name.toLowerCase().trim();
  };

  // Check if city already exists
  const isCityDuplicate = (cityName: string): boolean => {
    const normalized = normalizeCityName(cityName);
    
    for (const vote of votes) {
      if (normalizeCityName(vote.city_name) === normalized) {
        return true;
      }
    }
    
    return false;
  };

  // Add or vote for a city
  const handleVote = async (cityName: string, isNewCity: boolean = false) => {
    if (!userIp) {
      toast.error("Nie można zidentyfikować użytkownika");
      return;
    }

    setIsLoading(true);

    try {
      if (isNewCity && isCityDuplicate(cityName)) {
        toast.error("To miasto już jest na liście");
        setIsLoading(false);
        return;
      }

      const existingVote = votes.find(
        (v) => normalizeCityName(v.city_name) === normalizeCityName(cityName)
      );

      if (existingVote) {
        if (existingVote.voter_ips.includes(userIp)) {
          toast.error("Już głosowałeś na to miasto");
          setIsLoading(false);
          return;
        }

        const updatedVoterIps = [...existingVote.voter_ips, userIp];
        const { error } = await supabase
          .from("city_votes")
          .update({
            votes: existingVote.votes + 1,
            voter_ips: updatedVoterIps,
          })
          .eq("id", existingVote.id);

        if (error) throw error;
        toast.success("Dziękujemy za głos!");
      } else {
        const { error } = await supabase
          .from("city_votes")
          .insert({
            city_name: cityName,
            votes: 1,
            voter_ips: [userIp],
          });

        if (error) throw error;
        toast.success("Dziękujemy za dodanie nowego miasta!");
        setNewCityName("");
      }

      await fetchVotes();
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Błąd podczas głosowania");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewCity = () => {
    const trimmedName = newCityName.trim();
    if (!trimmedName) {
      toast.error("Podaj nazwę miasta");
      return;
    }
    handleVote(trimmedName, true);
  };

  const hasUserVoted = (vote: CityVote): boolean => {
    return vote.voter_ips.includes(userIp);
  };

  return (
    <div className="bg-card rounded-lg p-5 border border-border space-y-4">
      <h3 className="text-lg font-semibold text-center">
        Głosuj na miasto, które należy tu dodać
      </h3>
      
      {/* Add new city */}
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Wpisz nazwę miasta..."
          value={newCityName}
          onChange={(e) => setNewCityName(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleAddNewCity();
            }
          }}
          className="flex-1"
        />
        <Button
          onClick={handleAddNewCity}
          disabled={isLoading || !newCityName.trim()}
        >
          Dodaj
        </Button>
      </div>

      {/* Votes list */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {votes.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            Brak głosów. Dodaj pierwsze miasto!
          </p>
        ) : (
          votes.map((vote) => (
            <div
              key={vote.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <span className="font-medium">{vote.city_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  {vote.votes}
                </span>
                <Button
                  size="sm"
                  variant={hasUserVoted(vote) ? "secondary" : "default"}
                  onClick={() => handleVote(vote.city_name)}
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
