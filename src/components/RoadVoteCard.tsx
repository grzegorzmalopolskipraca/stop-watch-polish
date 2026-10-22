import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowUpRight, ThumbsUp } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getLocallyVotedStreets,
  getOrCreateStreetVoteFingerprint,
  hasLocallyVotedForStreet,
  PUBLIC_STREET_VOTES_QUERY_KEY,
  rememberStreetVote,
  submitStreetVote,
  WROCLAW_SEO_STATS_QUERY_KEY,
} from "@/hooks/useStreetVotes";
import { useWroclawSeoStats } from "@/hooks/useWroclawSeoStats";
import { getRoadPageHref, WROCLAW_ROADS, type RoadPage } from "@/utils/wroclawRoadCatalog";

type Props = { road: RoadPage };

function sameStreet(left: string, right: string) {
  return left.trim().toLocaleLowerCase("pl-PL") === right.trim().toLocaleLowerCase("pl-PL");
}

export default function RoadVoteCard({ road }: Props) {
  const queryClient = useQueryClient();
  const { data: cityStats, isPending } = useWroclawSeoStats();
  const votes = useMemo(() => cityStats?.votes ?? [], [cityStats?.votes]);
  const [fingerprint, setFingerprint] = useState("");
  const [votedStreets, setVotedStreets] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setFingerprint(getOrCreateStreetVoteFingerprint());
    setVotedStreets(getLocallyVotedStreets());
  }, []);

  const ownVotes = votes.find((vote) => sameStreet(vote.street_name, road.name))?.votes ?? 0;
  const hasVoted = hasLocallyVotedForStreet(road.name, votedStreets);
  const popularRoads = useMemo(() => votes
    .map((vote) => ({
      vote,
      road: WROCLAW_ROADS.find((item) => sameStreet(item.name, vote.street_name) || sameStreet(item.monitoredStreet ?? "", vote.street_name)),
    }))
    .filter((item): item is { vote: typeof votes[number]; road: RoadPage } => Boolean(item.road) && !sameStreet(item.vote.street_name, road.name))
    .slice(0, 5), [road.name, votes]);

  const handleVote = async () => {
    if (!fingerprint || isSubmitting || hasVoted) return;
    setIsSubmitting(true);
    try {
      const result = await submitStreetVote(road.name, fingerprint);
      rememberStreetVote(road.name);
      setVotedStreets((current) => [...current, road.name]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: PUBLIC_STREET_VOTES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: WROCLAW_SEO_STATS_QUERY_KEY }),
      ]);
      toast.success(result.message || "Dziękujemy za głos!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Nie udało się zapisać głosu. Spróbuj ponownie.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card id="glosowanie" className="scroll-mt-4 border-primary/20 shadow-sm">
      <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">
        <p className="text-sm font-medium text-primary">Pomóż wybrać kolejną ulicę</p>
        <CardTitle className="text-xl leading-tight sm:text-2xl">
          Zagłosuj na monitoring: {road.displayName}
        </CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ta droga nie jest jeszcze monitorowana przez eJedzie.pl. Głosy pokazują, które ulice mieszkańcy chcą
          sprawdzać w pierwszej kolejności.
        </p>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-2 sm:p-6 sm:pt-3">
        <div className="flex flex-col gap-3 rounded-xl bg-muted/60 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-3xl font-bold tabular-nums">{isPending ? "…" : ownVotes}</p>
            <p className="text-sm text-muted-foreground">{ownVotes === 1 ? "głos" : "głosów"} na tę drogę</p>
          </div>
          <Button onClick={handleVote} disabled={!fingerprint || isSubmitting || hasVoted} className="min-h-12 w-full gap-2 sm:w-auto">
            <ThumbsUp className="h-4 w-4" aria-hidden="true" />
            {hasVoted ? "Twój głos jest zapisany" : isSubmitting ? "Zapisuję głos…" : "Głosuj na tę drogę"}
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Głos nie oznacza, że dane o korkach są już dostępne. Po dodaniu drogi do monitoringu jej własne raporty będą
          zbierane i wyświetlane osobno.
        </p>
        {popularRoads.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <h3 className="text-sm font-semibold">Inne drogi z największą liczbą głosów</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {popularRoads.map(({ vote, road: votedRoad }) => (
                <li key={votedRoad.id}>
                  <Link to={getRoadPageHref(votedRoad)} className="flex min-h-11 items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm hover:border-primary hover:text-primary">
                    <span className="min-w-0 truncate">{votedRoad.displayName}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{vote.votes}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <Link to="/ulice-wroclawia/" className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-primary hover:underline">
          Znajdź inną ulicę we Wrocławiu <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}
