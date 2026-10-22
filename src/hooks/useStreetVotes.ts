import { useQuery } from "@tanstack/react-query";

export type PublicStreetVote = {
  street_name: string;
  votes: number;
};

export const PUBLIC_STREET_VOTES_QUERY_KEY = ["public-street-votes"] as const;
export const WROCLAW_SEO_STATS_QUERY_KEY = ["wroclaw-seo-stats"] as const;

export function usePublicStreetVotes() {
  return useQuery({
    queryKey: PUBLIC_STREET_VOTES_QUERY_KEY,
    queryFn: async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data, error } = await supabase.rpc("get_public_street_votes");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function getOrCreateStreetVoteFingerprint() {
  if (typeof window === "undefined") return "";
  const stored = window.localStorage.getItem("userFingerprint");
  if (stored) return stored;

  const fingerprint = `user_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
  window.localStorage.setItem("userFingerprint", fingerprint);
  return fingerprint;
}

export function getLocallyVotedStreets() {
  if (typeof window === "undefined") return [] as string[];
  try {
    const parsed = JSON.parse(window.localStorage.getItem("ejedzieVotedStreets") ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

export function hasLocallyVotedForStreet(streetName: string, votedStreets = getLocallyVotedStreets()) {
  const normalizedName = streetName.trim().toLocaleLowerCase("pl-PL");
  return votedStreets.some((name) => name.trim().toLocaleLowerCase("pl-PL") === normalizedName);
}

export function rememberStreetVote(streetName: string) {
  if (typeof window === "undefined") return;
  const votedStreets = getLocallyVotedStreets();
  if (!hasLocallyVotedForStreet(streetName, votedStreets)) {
    window.localStorage.setItem("ejedzieVotedStreets", JSON.stringify([...votedStreets, streetName]));
  }
}

export async function submitStreetVote(streetName: string, userFingerprint: string) {
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.functions.invoke("submit-street-vote", {
    body: { streetName, userFingerprint },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data as { success: boolean; message: string };
}
