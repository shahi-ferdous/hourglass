"use client";

import { useMemo, useState } from "react";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
  getCountry,
  listCitiesForCountry,
  listCountries,
  placeFor,
  type Place,
} from "@/lib/time/places";

interface PlacePickerProps {
  value: Place | null;
  onChange: (place: Place) => void;
  /** Used in accessible names, e.g. "From" → "From country". */
  label: string;
}

/**
 * Country, then city. Countries with a single time zone skip the city step
 * and resolve immediately; others open the city list as soon as a country
 * is chosen. The parent should remount this (via `key`) when it replaces
 * `value` from outside, so a half-finished country pick isn't kept.
 */
export function PlacePicker({ value, onChange, label }: PlacePickerProps) {
  const [pendingCountry, setPendingCountry] = useState<string | null>(null);
  const [cityOpen, setCityOpen] = useState(false);

  const countryCode = pendingCountry ?? value?.countryCode ?? null;
  const countryOptions = useMemo(
    () => listCountries().map((c) => ({ value: c.code, label: c.name })),
    [],
  );
  const cities = useMemo(
    () => (countryCode ? listCitiesForCountry(countryCode) : []),
    [countryCode],
  );
  const cityOptions = useMemo(
    () => cities.map((c) => ({ value: c.zone, label: c.city })),
    [cities],
  );

  // A zone with no country (e.g. UTC) isn't in the country list; show it as-is.
  const showCityPicker = countryCode ? cities.length > 1 : false;
  const cityValue = pendingCountry ? null : (value?.zone ?? null);

  function pickCountry(code: string) {
    const country = getCountry(code);
    if (!country) return;
    if (country.zones.length === 1) {
      setPendingCountry(null);
      onChange(placeFor(code, country.zones[0]!));
    } else {
      setPendingCountry(code);
      setCityOpen(true);
    }
  }

  function pickCity(zone: string) {
    if (!countryCode) return;
    setPendingCountry(null);
    onChange(placeFor(countryCode, zone));
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <SearchableSelect
        ariaLabel={`${label} country`}
        options={countryOptions}
        value={countryCode}
        onChange={pickCountry}
        placeholder="Select a country"
        searchPlaceholder="Search countries…"
        emptyText="No countries found"
      />
      {showCityPicker ? (
        <SearchableSelect
          ariaLabel={`${label} city`}
          options={cityOptions}
          value={cityValue}
          onChange={pickCity}
          placeholder="Select a city"
          searchPlaceholder="Search cities…"
          emptyText="No cities found"
          open={cityOpen}
          onOpenChange={setCityOpen}
        />
      ) : (
        <div className="flex h-9 items-center rounded-lg border border-dashed px-3 text-sm text-muted-foreground">
          {value && !pendingCountry ? value.city : "City"}
        </div>
      )}
    </div>
  );
}
