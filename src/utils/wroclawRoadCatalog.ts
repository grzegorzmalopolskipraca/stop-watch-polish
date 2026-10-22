import roadCatalog from "@/data/wroclaw-road-catalog.json";
import { streetToSlug, type StreetName } from "@/utils/streetSlug";

export type RoadCatalogRecord = {
  id: string;
  type: string;
  name: string;
  shortName: string;
  slug: string;
};

export type RoadPage = RoadCatalogRecord & {
  pageSlug: string;
  displayName: string;
  monitoredStreet: StreetName | null;
};

type RoadCatalogFile = {
  source: string;
  sourceDate: string;
  roadCount: number;
  roads: RoadCatalogRecord[];
};

const MONITORED_STREET_BY_EMUIA_ID: Record<string, StreetName> = {
  ul_2173: "Borowska",
  ul_2195: "Buforowa",
  ul_1808: "Grabiszyńska",
  ul_369: "Grota Roweckiego",
  ul_428: "Hallera",
  ul_255: "Karkonoska",
  ul_586: "Ołtaszyńska",
  ul_591: "Opolska",
  ul_1652: "Parafialna",
  ul_999: "Powstańców Śląskich",
  ul_734: "Radosna",
  ul_1078: "Sudecka",
  ul_1123: "Ślężna",
  ul_830: "Zwycięska",
};

const catalogFile = roadCatalog as RoadCatalogFile;

function getDisplayName(road: RoadCatalogRecord, monitoredStreet: StreetName | null) {
  if (monitoredStreet) return `ul. ${monitoredStreet}`;
  if (road.type === "ul.") return `ul. ${road.name}`;
  if (road.type === "al.") return `al. ${road.name}`;
  return road.shortName || `${road.type} ${road.name}`;
}

export const WROCLAW_ROAD_SOURCE = {
  url: catalogFile.source,
  date: catalogFile.sourceDate,
};

export const WROCLAW_ROADS: RoadPage[] = catalogFile.roads.map((road) => {
  const monitoredStreet = MONITORED_STREET_BY_EMUIA_ID[road.id] ?? null;
  return {
    ...road,
    pageSlug: monitoredStreet ? streetToSlug(monitoredStreet) : road.slug,
    displayName: getDisplayName(road, monitoredStreet),
    monitoredStreet,
  };
});

export const UNMONITORED_ROADS = WROCLAW_ROADS.filter((road) => !road.monitoredStreet);

const ROADS_SORTED_BY_NAME = [...WROCLAW_ROADS].sort((left, right) =>
  left.name.localeCompare(right.name, "pl-PL", { sensitivity: "base" }) || left.id.localeCompare(right.id),
);

export function getUnmonitoredRoadBySlug(slug: string): RoadPage | null {
  return UNMONITORED_ROADS.find((road) => road.pageSlug === slug) ?? null;
}

export function getRoadPageHref(road: RoadPage): string {
  return `/ulica/${road.pageSlug}/`;
}

export function getAdjacentRoads(road: RoadPage, count = 6): RoadPage[] {
  const currentIndex = ROADS_SORTED_BY_NAME.findIndex((item) => item.id === road.id);
  if (currentIndex < 0 || count <= 0) return [];

  const beforeCount = Math.ceil(count / 2);
  const afterCount = Math.floor(count / 2);
  return [
    ...ROADS_SORTED_BY_NAME.slice(Math.max(0, currentIndex - beforeCount), currentIndex),
    ...ROADS_SORTED_BY_NAME.slice(currentIndex + 1, currentIndex + afterCount + 1),
  ];
}
