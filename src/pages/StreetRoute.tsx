import { lazy, Suspense } from "react";
import { useParams } from "react-router-dom";
import RouteLoading from "@/components/RouteLoading";
import { slugToStreet } from "@/utils/streetSlug";

const MonitoredStreetPage = lazy(() => import("@/pages/StreetPage"));
const UnmonitoredRoadPage = lazy(() => import("@/pages/UnmonitoredRoadPage"));

export default function StreetRoute() {
  const { slug = "" } = useParams();
  const page = slugToStreet(slug) ? <MonitoredStreetPage /> : <UnmonitoredRoadPage />;
  return <Suspense fallback={<RouteLoading />}>{page}</Suspense>;
}
