import type { MatchRequest, OwnerProfile, Pet, MatchStatus } from '../types';
import {
  MOCK_MATCHES,
  MOCK_PETS,
  MY_PET,
} from './mock';

const STORAGE_KEY = 'petdate_store_v2';

export interface AppStore {
  pets: Pet[];
  matches: MatchRequest[];
  owners: OwnerProfile[];
  myPet: Pet;
}

function buildOwners(pets: Pet[], myPet: Pet): OwnerProfile[] {
  const map = new Map<number, OwnerProfile>();
  map.set(myPet.ownerId, {
    id: myPet.ownerId,
    name: myPet.ownerName,
    city: myPet.city,
    pets: [myPet],
  });

  for (const pet of pets) {
    const existing = map.get(pet.ownerId);
    if (existing) {
      if (!existing.pets.some((p) => p.id === pet.id)) {
        existing.pets.push(pet);
      }
    } else {
      map.set(pet.ownerId, {
        id: pet.ownerId,
        name: pet.ownerName,
        city: pet.city,
        pets: [pet],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.id - b.id);
}

export function getInitialStore(): AppStore {
  return {
    pets: [...MOCK_PETS],
    matches: MOCK_MATCHES.map((m) => ({ ...m, fromPet: { ...m.fromPet } })),
    owners: buildOwners(MOCK_PETS, MY_PET),
    myPet: { ...MY_PET },
  };
}

function hydrateMatches(matches: MatchRequest[], pets: Pet[], myPet: Pet): MatchRequest[] {
  const all = [myPet, ...pets];
  return matches.map((m) => ({
    ...m,
    fromPet: all.find((p) => p.id === m.fromPet.id) ?? m.fromPet,
  }));
}

class PetStore {
  private listeners = new Set<() => void>();
  private data: AppStore;

  constructor() {
    this.data = this.load();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): AppStore => this.data;

  private emit() {
    for (const l of this.listeners) l();
  }

  private load(): AppStore {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as AppStore;
        parsed.matches = hydrateMatches(parsed.matches, parsed.pets, parsed.myPet);
        return parsed;
      }
    } catch {
      /* use defaults */
    }
    return getInitialStore();
  }

  private persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    this.emit();
  }

  reset() {
    this.data = getInitialStore();
    this.persist();
  }

  getPetById(id: number): Pet | undefined {
    if (id === this.data.myPet.id) return this.data.myPet;
    return this.data.pets.find((p) => p.id === id);
  }

  getNearbyPets(excludeId?: number): Pet[] {
    return this.data.pets
      .filter((p) => p.lookingForPlaymate && p.id !== excludeId)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  addPet(pet: Omit<Pet, 'id'>): Pet {
    const nextId = Math.max(0, ...this.data.pets.map((p) => p.id), this.data.myPet.id) + 1;
    const created: Pet = { ...pet, id: nextId };
    this.data.pets = [...this.data.pets, created];
    this.data.owners = buildOwners(this.data.pets, this.data.myPet);
    this.persist();
    return created;
  }

  updatePet(id: number, patch: Partial<Pet>) {
    if (id === this.data.myPet.id) {
      this.data.myPet = { ...this.data.myPet, ...patch };
    } else {
      this.data.pets = this.data.pets.map((p) => (p.id === id ? { ...p, ...patch } : p));
    }
    this.data.matches = hydrateMatches(this.data.matches, this.data.pets, this.data.myPet);
    this.data.owners = buildOwners(this.data.pets, this.data.myPet);
    this.persist();
  }

  deletePet(id: number) {
    if (id === this.data.myPet.id) return;
    this.data.pets = this.data.pets.filter((p) => p.id !== id);
    this.data.matches = this.data.matches.filter((m) => m.fromPet.id !== id);
    this.data.owners = buildOwners(this.data.pets, this.data.myPet);
    this.persist();
  }

  updateMatchStatus(id: number, status: MatchStatus) {
    this.data.matches = this.data.matches.map((m) =>
      m.id === id ? { ...m, status } : m
    );
    this.persist();
  }

  deleteMatch(id: number) {
    this.data.matches = this.data.matches.filter((m) => m.id !== id);
    this.persist();
  }

  sendPlaydateRequest(data: {
    toPetId: number;
    message?: string;
    scheduledAt?: string;
    location?: string;
  }): MatchRequest {
    const nextId = Math.max(0, ...this.data.matches.map((m) => m.id)) + 1;
    const created: MatchRequest = {
      id: nextId,
      fromPet: { ...this.data.myPet },
      toPetId: data.toPetId,
      message: data.message,
      status: 'pending',
      createdAt: new Date().toISOString(),
      scheduledAt: data.scheduledAt,
      location: data.location,
    };
    this.data.matches = [created, ...this.data.matches];
    this.persist();
    return created;
  }

  hasPendingRequest(toPetId: number): boolean {
    return this.data.matches.some(
      (m) => m.toPetId === toPetId && m.fromPet.id === this.data.myPet.id && m.status === 'pending'
    );
  }

  updateOwner(id: number, patch: Partial<OwnerProfile>) {
    this.data.owners = this.data.owners.map((o) =>
      o.id === id ? { ...o, ...patch } : o
    );
    if (id === this.data.myPet.ownerId) {
      const owner = this.data.owners.find((o) => o.id === id);
      if (owner) {
        this.data.myPet = {
          ...this.data.myPet,
          ownerName: owner.name,
          city: owner.city,
        };
      }
    }
    this.persist();
  }
}

export const petStore = new PetStore();
