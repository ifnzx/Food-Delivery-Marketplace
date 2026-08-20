import { googleServerKey } from "./env";
import { haversineKm } from "./geo";

export type LatLng = { latitude: number; longitude: number };

export type RouteQuote = {
  km: number;
  durationSeconds: number | null;
  durationText: string | null;
  mode: "google-distance-matrix" | "haversine-local";
};

function key(): string {
  return googleServerKey();
}

export function googleMapsConfigured(): boolean {
  return Boolean(key());
}

export async function reverseGeocode(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const google = await reverseGeocodeGoogle(latitude, longitude);
  if (google) return google;
  return reverseGeocodeNominatim(latitude, longitude);
}

async function reverseGeocodeGoogle(
  latitude: number,
  longitude: number
): Promise<string | null> {
  if (!key()) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("latlng", `${latitude},${longitude}`);
  url.searchParams.set("language", "id");
  url.searchParams.set("key", key());
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{ formatted_address?: string }>;
  };
  if (data.status !== "OK" || !data.results?.[0]?.formatted_address) {
    return null;
  }
  return data.results[0].formatted_address;
}

async function reverseGeocodeNominatim(
  latitude: number,
  longitude: number
): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(latitude));
  url.searchParams.set("lon", String(longitude));
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "18");
  url.searchParams.set("accept-language", "id");
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "ANTARQ-Local/1.0 (food-delivery marketplace)",
        "Accept-Language": "id",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      display_name?: string;
      address?: Record<string, string>;
    };
    const parts = data.address ?? {};
    const line = [
      parts.road || parts.pedestrian || parts.neighbourhood,
      parts.village || parts.suburb || parts.hamlet,
      parts.city_district || parts.town || parts.city || parts.county,
      parts.state,
    ]
      .filter(Boolean)
      .filter((v, i, arr) => arr.indexOf(v) === i);
    if (line.length > 0) return line.join(", ");
    return data.display_name || null;
  } catch {
    return null;
  }
}

export async function geocodeAddress(
  address: string
): Promise<(LatLng & { address: string }) | null> {
  if (!key()) return null;
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("language", "id");
  url.searchParams.set("region", "id");
  url.searchParams.set("key", key());
  const res = await fetch(url);
  const data = (await res.json()) as {
    status: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat: number; lng: number } };
    }>;
  };
  const loc = data.results?.[0]?.geometry?.location;
  if (data.status !== "OK" || !loc) return null;
  return {
    address: data.results![0].formatted_address || address,
    latitude: loc.lat,
    longitude: loc.lng,
  };
}

export async function drivingRoute(
  origin: LatLng,
  destination: LatLng
): Promise<RouteQuote> {
  const fallback: RouteQuote = {
    km: haversineKm(
      origin.latitude,
      origin.longitude,
      destination.latitude,
      destination.longitude
    ),
    durationSeconds: null,
    durationText: null,
    mode: "haversine-local",
  };
  if (!key()) return fallback;

  const url = new URL(
    "https://maps.googleapis.com/maps/api/distancematrix/json"
  );
  url.searchParams.set(
    "origins",
    `${origin.latitude},${origin.longitude}`
  );
  url.searchParams.set(
    "destinations",
    `${destination.latitude},${destination.longitude}`
  );
  url.searchParams.set("mode", "driving");
  url.searchParams.set("language", "id");
  url.searchParams.set("key", key());

  try {
    const res = await fetch(url);
    const data = (await res.json()) as {
      status: string;
      error_message?: string;
      rows?: Array<{
        elements?: Array<{
          status: string;
          distance?: { value: number };
          duration?: { value: number; text: string };
        }>;
      }>;
    };
    const el = data.rows?.[0]?.elements?.[0];
    if (data.status !== "OK" || el?.status !== "OK" || !el.distance) {
      console.warn(
        "Google Distance Matrix fallback:",
        data.status,
        el?.status,
        data.error_message
      );
      return fallback;
    }
    return {
      km: el.distance.value / 1000,
      durationSeconds: el.duration?.value ?? null,
      durationText: el.duration?.text ?? null,
      mode: "google-distance-matrix",
    };
  } catch (error) {
    console.warn("Google Distance Matrix error", error);
    return fallback;
  }
}
