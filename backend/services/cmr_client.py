import re
from datetime import datetime

import requests

from config import CMR_BASE, CMR_CLIENT_ID, CMR_GRANULES, EARTHDATA_TOKEN, USER_AGENT


def build_cmr_headers():
    headers = {
        "Accept": "application/json",
        "Client-Id": CMR_CLIENT_ID,
        "User-Agent": USER_AGENT,
    }
    if EARTHDATA_TOKEN:
        headers["Authorization"] = f"Bearer {EARTHDATA_TOKEN}"
    return headers


def cmr_get(url, params=None, timeout=20):
    response = requests.get(url, params=params, headers=build_cmr_headers(), timeout=timeout)
    response.raise_for_status()
    return response


def parse_bbox_string(bbox_str):
    if not bbox_str:
        return None

    try:
        parts = re.split(r"[,\s]+", bbox_str.strip())
        coords = [float(value) for value in parts if value.strip()]
        if len(coords) == 4:
            return coords
    except Exception as exc:
        print(f"Error parsing bbox string '{bbox_str}': {exc}")

    return None


def bbox_to_center(coords):
    south, west, north, east = coords
    latitude = round((south + north) / 2, 6)
    longitude = round((west + east) / 2, 6)
    return latitude, longitude


def polygon_to_center(polygon_str):
    if not polygon_str:
        return None

    try:
        parts = re.split(r"[,\s]+", polygon_str.strip())
        coords = [float(value) for value in parts if value.strip()]
        if len(coords) < 4 or len(coords) % 2 != 0:
            return None

        longitudes = coords[::2]
        latitudes = coords[1::2]
        latitude = round(sum(latitudes) / len(latitudes), 6)
        longitude = round(sum(longitudes) / len(longitudes), 6)
        return latitude, longitude
    except Exception as exc:
        print(f"Error parsing polygon '{polygon_str[:80]}': {exc}")
        return None


def point_to_location(point_str):
    if not point_str:
        return None

    try:
        parts = re.split(r"[,\s]+", point_str.strip())
        coords = [float(value) for value in parts if value.strip()]
        if len(coords) >= 2:
            longitude, latitude = coords[0], coords[1]
            return round(latitude, 6), round(longitude, 6)
    except Exception as exc:
        print(f"Error parsing point '{point_str}': {exc}")

    return None


def extract_location_from_entry(entry):
    boxes = entry.get("boxes") or []
    if boxes:
        box = boxes[0]
        if isinstance(box, list) and box:
            box = box[0]
        if isinstance(box, str):
            coords = parse_bbox_string(box)
            if coords:
                return bbox_to_center(coords)

    polygons = entry.get("polygons") or []
    if polygons:
        polygon = polygons[0]
        if isinstance(polygon, list) and polygon:
            polygon = polygon[0]
        if isinstance(polygon, str):
            center = polygon_to_center(polygon)
            if center:
                return center

    points = entry.get("points") or []
    if points:
        point = points[0]
        if isinstance(point, list) and point:
            point = point[0]
        if isinstance(point, str):
            location = point_to_location(point)
            if location:
                return location

    return None


def fetch_granule_location(collection_id):
    try:
        params = {"collection_concept_id": collection_id, "page_size": 5}
        response = cmr_get(CMR_GRANULES, params=params, timeout=15)
        granules = response.json().get("feed", {}).get("entry", [])
        for granule in granules:
            location = extract_location_from_entry(granule)
            if location:
                return location
    except Exception as exc:
        print(f"Granule location lookup failed for {collection_id}: {exc}")

    return None


def format_time(value):
    if not value:
        return None

    for pattern in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, pattern).strftime("%Y-%m-%d")
        except ValueError:
            continue

    return value


def extract_primary_link(entry):
    for link in entry.get("links", []):
        href = link.get("href")
        if not href:
            continue
        if link.get("inherited"):
            continue
        return href
    return None


def collection_to_dataset(entry):
    latitude = None
    longitude = None

    location = extract_location_from_entry(entry)
    if location:
        latitude, longitude = location
    elif entry.get("id"):
        granule_location = fetch_granule_location(entry["id"])
        if granule_location:
            latitude, longitude = granule_location

    return {
        "id": entry.get("id"),
        "title": entry.get("title") or "No title available",
        "summary": entry.get("summary") or "No summary available.",
        "dataCenter": entry.get("data_center") or "Unknown",
        "shortName": entry.get("short_name"),
        "version": entry.get("version_id"),
        "timeStart": format_time(entry.get("time_start")),
        "timeEnd": format_time(entry.get("time_end")),
        "latitude": latitude,
        "longitude": longitude,
        "link": extract_primary_link(entry),
        "boxes": entry.get("boxes") or [],
        "platforms": entry.get("platforms") or [],
        "instruments": entry.get("instruments") or [],
    }


def search_nasa_cmr(
    keywords=None,
    page_size=20,
    temporal=None,
    bounding_box=None,
    concept_id=None,
    raw=False,
    timeout=20,
):
    params = {"page_size": str(page_size)}
    if keywords:
        params["keyword"] = keywords
    if temporal:
        params["temporal"] = temporal
    if bounding_box:
        params["bounding_box"] = bounding_box
    if concept_id:
        params["concept_id"] = concept_id

    try:
        response = cmr_get(CMR_BASE, params=params, timeout=timeout)
        entries = response.json().get("feed", {}).get("entry", [])
        if raw:
            return entries
        return [collection_to_dataset(entry) for entry in entries]
    except Exception as exc:
        print(f"NASA CMR request failed: {exc}")
        raise Exception("Failed to fetch data from NASA.") from exc


def fetch_collection_entries_page(
    page_num=1,
    page_size=100,
    keywords=None,
    provider=None,
    updated_since=None,
):
    params = {"page_num": page_num, "page_size": str(page_size)}
    if keywords:
        params["keyword"] = keywords
    if provider:
        params["provider"] = provider
    if updated_since:
        params["updated_since"] = updated_since

    response = cmr_get(CMR_BASE, params=params)
    return response.json().get("feed", {}).get("entry", [])


def fetch_dataset_by_id(dataset_id):
    entries = search_nasa_cmr(concept_id=dataset_id, page_size=1, raw=True)
    if not entries:
        return None
    return collection_to_dataset(entries[0])
