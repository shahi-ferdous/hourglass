export interface SlotPerson {
  id: string;
  name: string;
  isHost: boolean;
}

interface PersonWithSlots {
  id: string;
  displayName: string;
  isHost: boolean;
  /** ISO UTC instants this person marked as free. */
  slots: string[];
}

/**
 * Who is free at each slot, keyed by the slot's UTC instant. Host first,
 * then alphabetical, so every surface lists names in the same order.
 */
export function buildPeopleBySlot(
  people: PersonWithSlots[],
  excludeId?: string | null,
): Map<string, SlotPerson[]> {
  const map = new Map<string, SlotPerson[]>();
  for (const p of people) {
    if (p.id === excludeId) continue;
    const person: SlotPerson = { id: p.id, name: p.displayName, isHost: p.isHost };
    for (const iso of p.slots) {
      const list = map.get(iso);
      if (list) list.push(person);
      else map.set(iso, [person]);
    }
  }
  for (const list of map.values()) {
    list.sort((a, b) => Number(b.isHost) - Number(a.isHost) || a.name.localeCompare(b.name));
  }
  return map;
}
