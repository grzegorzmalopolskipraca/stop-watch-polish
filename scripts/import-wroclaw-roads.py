#!/usr/bin/env python3
"""Convert Wrocław's official EMUiA street workbook into the app catalog."""

import json
import re
import sys
import xml.etree.ElementTree as ET
from collections import Counter
from pathlib import Path
from zipfile import ZipFile


ROAD_TYPES = {"ul.", "al.", "rondo", "most", "mosty", "estakada", "bulwar", "wybrzeże", "zaułek"}
NAMESPACE = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
POLISH = str.maketrans({
    "ą": "a", "ć": "c", "ę": "e", "ł": "l", "ń": "n", "ó": "o", "ś": "s", "ż": "z", "ź": "z",
    "Ą": "a", "Ć": "c", "Ę": "e", "Ł": "l", "Ń": "n", "Ó": "o", "Ś": "s", "Ż": "z", "Ź": "z",
})


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9-]", "", re.sub(r"\s+", "-", value.translate(POLISH).lower()))


def read_rows(workbook_path: Path) -> list[dict[str, str]]:
    with ZipFile(workbook_path) as workbook:
        root = ET.fromstring(workbook.read("xl/worksheets/sheet1.xml"))

    rows: list[dict[str, str]] = []
    for row in root.findall(".//m:row", NAMESPACE):
        values: dict[str, str] = {}
        for cell in row.findall("m:c", NAMESPACE):
            column = "".join(char for char in cell.attrib["r"] if char.isalpha())
            values[column] = "".join(text.text or "" for text in cell.findall(".//m:t", NAMESPACE))
        rows.append(values)
    return rows


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/import-wroclaw-roads.py /path/to/Ulice_StanNaYYYYMMDD.xlsx")

    workbook_path = Path(sys.argv[1])
    source_date_match = re.search(r"StanNa(\d{8})", workbook_path.name)
    source_date = source_date_match.group(1) if source_date_match else "unknown"

    roads = []
    for row in read_rows(workbook_path)[1:]:
        road_type = row.get("B", "").strip()
        if road_type not in ROAD_TYPES:
            continue

        name = " ".join(row.get(column, "").strip() for column in ("C", "D", "E") if row.get(column, "").strip())
        official_id = row.get("A", "").strip()
        if not name or not official_id:
            raise ValueError(f"Missing official name or ID in row: {row}")

        roads.append({
            "id": official_id,
            "type": road_type,
            "name": name,
            "shortName": row.get("F", "").strip(),
            "slug": slugify(name),
        })

    slug_counts = Counter(road["slug"] for road in roads)
    used_slugs: set[str] = set()
    for road in roads:
        if slug_counts[road["slug"]] > 1:
            suffix = re.sub(r"^ul_", "", road["id"])
            road["slug"] = f"{road['slug']}-{suffix}"
        if road["slug"] in used_slugs:
            raise ValueError(f"Duplicate slug after disambiguation: {road['slug']}")
        used_slugs.add(road["slug"])

    roads.sort(key=lambda road: (road["name"].casefold(), road["type"], road["id"]))
    catalog = {
        "source": "https://geoportal.wroclaw.pl/www/emuia/Ulice.zip",
        "sourceDate": source_date,
        "roadCount": len(roads),
        "roads": roads,
    }
    output_path = Path("src/data/wroclaw-road-catalog.json")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(catalog, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Wrote {len(roads)} road records from EMUiA {source_date} to {output_path}")


if __name__ == "__main__":
    main()
