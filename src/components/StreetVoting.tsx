import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThumbsUp, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  getLocallyVotedStreets,
  getOrCreateStreetVoteFingerprint,
  hasLocallyVotedForStreet,
  PUBLIC_STREET_VOTES_QUERY_KEY,
  rememberStreetVote,
  submitStreetVote,
  usePublicStreetVotes,
  WROCLAW_SEO_STATS_QUERY_KEY,
} from "@/hooks/useStreetVotes";

export const StreetVoting = () => {
  const queryClient = useQueryClient();
  const { data: votes = [], isPending } = usePublicStreetVotes();
  const [newStreetName, setNewStreetName] = useState("");
  const [userFingerprint, setUserFingerprint] = useState("");
  const [votedStreets, setVotedStreets] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setUserFingerprint(getOrCreateStreetVoteFingerprint());
    setVotedStreets(getLocallyVotedStreets());
  }, []);

  const handleVote = async (streetName: string, isNewStreet = false) => {
    if (!userFingerprint) {
      toast.error("Nie można zidentyfikować użytkownika");
      return;
    }

    setIsLoading(true);

    try {
      const result = await submitStreetVote(streetName, userFingerprint);
      rememberStreetVote(streetName);
      setVotedStreets((current) => [...current, streetName]);
      toast.success(result.message);
      if (isNewStreet) {
        setNewStreetName("");
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PUBLIC_STREET_VOTES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: WROCLAW_SEO_STATS_QUERY_KEY }),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Błąd podczas głosowania");
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
        {isPending ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Wczytujemy wyniki głosowania…</p>
        ) : votes.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-4">
            Brak głosów. Dodaj pierwszą ulicę!
          </p>
        ) : (
          votes.map((vote) => (
            <div
              key={vote.street_name}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
            >
              <span className="font-medium">{vote.street_name}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-primary">
                  {vote.votes}
                </span>
                <Button
                  size="sm"
                  variant={hasLocallyVotedForStreet(vote.street_name, votedStreets) ? "secondary" : "default"}
                  onClick={() => handleVote(vote.street_name)}
                  disabled={isLoading || hasLocallyVotedForStreet(vote.street_name, votedStreets)}
                  className="gap-1"
                >
                  <ThumbsUp className="h-4 w-4" />
                  {hasLocallyVotedForStreet(vote.street_name, votedStreets) ? "Zagłosowano" : "Głosuj"}
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
