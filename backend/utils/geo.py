def has_coordinates(record):
    latitude = record.get("latitude") if isinstance(record, dict) else None
    longitude = record.get("longitude") if isinstance(record, dict) else None
    return isinstance(latitude, (int, float)) and isinstance(longitude, (int, float))


def point_in_bbox(latitude, longitude, bbox):
    if latitude is None or longitude is None or not bbox or len(bbox) != 4:
        return False

    west, south, east, north = bbox
    return south <= latitude <= north and west <= longitude <= east
