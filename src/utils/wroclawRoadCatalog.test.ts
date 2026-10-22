import { describe, expect, it } from "vitest";
import { getAdjacentRoads, UNMONITORED_ROADS, WROCLAW_ROADS } from "@/utils/wroclawRoadCatalog";

describe("official Wrocław road catalog", () => {
  it("contains unique page URLs and keeps all monitored roads on their existing URLs", () => {
    const slugs = WROCLAW_ROADS.map((road) => road.pageSlug);

    expect(WROCLAW_ROADS).toHaveLength(2384);
    expect(UNMONITORED_ROADS).toHaveLength(2370);
    expect(WROCLAW_ROADS.filter((road) => road.type === "ul.")).toHaveLength(2228);
    expect(UNMONITORED_ROADS.filter((road) => road.type === "ul.")).toHaveLength(2216);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(WROCLAW_ROADS.filter((road) => road.monitoredStreet)).toHaveLength(14);
    expect(WROCLAW_ROADS.filter((road) => road.type === "ul." && road.monitoredStreet)).toHaveLength(12);
    expect(WROCLAW_ROADS.find((road) => road.monitoredStreet === "Grota Roweckiego")?.pageSlug).toBe("grota-roweckiego");
    expect(WROCLAW_ROADS.find((road) => road.monitoredStreet === "Hallera")?.pageSlug).toBe("hallera");
  });

  it("links road pages to neighboring catalog entries", () => {
    const road = UNMONITORED_ROADS[500];
    const sortedRoads = [...WROCLAW_ROADS].sort((left, right) =>
      left.name.localeCompare(right.name, "pl-PL", { sensitivity: "base" }) || left.id.localeCompare(right.id),
    );
    const adjacentRoads = getAdjacentRoads(road);

    expect(adjacentRoads).toHaveLength(6);
    for (const adjacentRoad of adjacentRoads) {
      expect(getAdjacentRoads(adjacentRoad).some((item) => item.id === road.id)).toBe(true);
    }
    expect(getAdjacentRoads(sortedRoads[0])).toHaveLength(3);
    expect(getAdjacentRoads(sortedRoads.at(-1)!)).toHaveLength(3);
  });
});
