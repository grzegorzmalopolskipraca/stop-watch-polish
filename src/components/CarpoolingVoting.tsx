import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ThumbsUp } from "lucide-react";
import { toast } from "sonner";

interface CarpoolingVote {
  id: string;
  title: string;
  vote_count: number;
  voter_fingerprints: string[];
}

export const CarpoolingVoting = () => {
  const [votes, setVotes] = useState<CarpoolingVote[]>([]);
  const [userFingerprint, setUserFingerprint] = useState<string>("");
  const [votedItems, setVotedItems] = useState<Set<string>>(new Set());

  // Generate user fingerprint
  useEffect(() => {
    const generateFingerprint = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.textBaseline = 'top';
        ctx.font = '14px Arial';
        ctx.fillText('fingerprint', 2, 2);
        const canvasData = canvas.toDataURL();
        
        const fingerprint = `${canvasData.slice(-50)}_${navigator.userAgent}_${screen.width}x${screen.height}_${new Date().getTimezoneOffset()}`;
        const encoder = new TextEncoder();
        const data = encoder.encode(fingerprint);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setUserFingerprint(hashHex);
      }
    };

    generateFingerprint();
  }, []);

  // Fetch votes from database
  useEffect(() => {
    const fetchVotes = async () => {
      const { data, error } = await supabase
        .from('carpooling_votes')
        .select('*')
        .order('vote_count', { ascending: false });

      if (error) {
        console.error("Error fetching carpooling votes:", error);
        return;
      }

      if (data) {
        setVotes(data);
        
        // Check which items the user has already voted for
        const voted = new Set<string>();
        data.forEach(vote => {
          if (vote.voter_fingerprints?.includes(userFingerprint)) {
            voted.add(vote.id);
          }
        });
        setVotedItems(voted);
      }
    };

    if (userFingerprint) {
      fetchVotes();
    }
  }, [userFingerprint]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel('carpooling_votes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'carpooling_votes',
        },
        (payload) => {
          console.log('Carpooling vote change received:', payload);
          
          if (payload.eventType === 'UPDATE') {
            setVotes(prev => 
              prev.map(vote => 
                vote.id === payload.new.id 
                  ? { ...vote, ...payload.new as CarpoolingVote }
                  : vote
              )
            );
            
            // Update voted items
            const newVote = payload.new as CarpoolingVote;
            if (newVote.voter_fingerprints?.includes(userFingerprint)) {
              setVotedItems(prev => new Set(prev).add(newVote.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userFingerprint]);

  const handleVote = async (title: string, voteId: string) => {
    if (!userFingerprint) {
      toast.error("Ładowanie...");
      return;
    }

    if (votedItems.has(voteId)) {
      toast.error("Już zagłosowałeś na tę opcję");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('submit-carpooling-vote', {
        body: {
          title,
          userFingerprint,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success("Zagłosowano!");
        setVotedItems(prev => new Set(prev).add(voteId));
      } else {
        toast.error(data?.message || "Nie udało się zagłosować");
      }
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Wystąpił błąd podczas głosowania");
    }
  };

  return (
    <div className="space-y-2">
      {votes.map((vote) => (
        <div
          key={vote.id}
          className="flex flex-col gap-3 p-3 rounded-lg bg-card border border-border hover:bg-accent/50 transition-colors"
        >
          <p className="text-sm text-foreground">{vote.title}</p>
          
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-muted-foreground">
              {vote.vote_count} {vote.vote_count === 1 ? 'głos' : 'głosów'}
            </span>
            
            {votedItems.has(vote.id) ? (
              <Button
                variant="outline"
                size="sm"
                disabled
                className="min-w-[100px]"
              >
                Zagłosowano
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => handleVote(vote.title, vote.id)}
                className="min-w-[100px]"
              >
                <ThumbsUp className="w-4 h-4 mr-1" />
                Głosuj
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
