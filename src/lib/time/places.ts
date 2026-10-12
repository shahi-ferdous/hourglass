import { getAllCountries, getCountryForTimezone } from "countries-and-timezones";
import { IANAZone } from "luxon";

export interface Place {
  /** ISO 3166-1 alpha-2, or "" for zones with no country (e.g. UTC). */
  countryCode: string;
  countryName: string;
  /** IANA zone id, e.g. "Asia/Dhaka". */
  zone: string;
  city: string;
}

export interface Country {
  code: string;
  name: string;
  zones: string[];
}

/** "America/Argentina/Buenos_Aires" → "Buenos Aires". */
export function zoneToCity(zone: string): string {
  return (zone.split("/").pop() ?? zone).replace(/_/g, " ");
}

let countriesCache: Country[] | null = null;

/** Every country that has at least one valid zone, sorted by name. */
export function listCountries(): Country[] {
  if (countriesCache) return countriesCache;
  countriesCache = Object.values(getAllCountries())
    .map((c) => ({
      code: c.id,
      name: c.name,
      zones: c.timezones.filter((z) => IANAZone.isValidZone(z)),
    }))
    .filter((c) => c.zones.length > 0)
    .sort((a, b) => a.name.localeCompare(b.name));
  return countriesCache;
}

export function getCountry(code: string): Country | undefined {
  return listCountries().find((c) => c.code === code);
}

export function listCitiesForCountry(code: string): { zone: string; city: string }[] {
  const country = getCountry(code);
  if (!country) return [];
  return country.zones
    .map((zone) => ({ zone, city: zoneToCity(zone) }))
    .sort((a, b) => a.city.localeCompare(b.city));
}

export function placeFor(code: string, zone: string): Place {
  const country = getCountry(code);
  return {
    countryCode: code,
    countryName: country?.name ?? code,
    zone,
    city: zoneToCity(zone),
  };
}

/**
 * Turns a bare IANA zone (e.g. the browser's detected one) into a place
 * with a country. Zones with no country — "UTC", "Etc/GMT+5" — still work,
 * they just show a generic label.
 */
export function findPlaceForZone(zone: string): Place {
  const country = getCountryForTimezone(zone);
  if (country) return placeFor(country.id, zone);
  return {
    countryCode: "",
    countryName: zone === "UTC" ? "Coordinated Universal Time" : "Time zone",
    zone,
    city: zone === "UTC" ? "UTC" : zoneToCity(zone),
  };
}

/** One-tap suggestions for the converter, in display order. */
export const QUICK_ADD_ZONES = [
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Kolkata",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Sydney",
] as const;
