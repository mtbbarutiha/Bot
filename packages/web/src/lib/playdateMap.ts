import type { PetProfile, PlaydateRequest } from '@petdate/shared';
import type { MatchRequest, MatchStatus, Pet, PetType } from '../types';
import { PET_TYPE_EMOJI } from '../types';
import { EMPTY_STATE_PHOTO } from '../data/petImages';

function speciesToType(species?: string): PetType {
  const s = (species || '').toLowerCase();
  if (s === 'dog' || s === 'سگ') return 'dog';
  if (s === 'cat' || s === 'گربه') return 'cat';
  if (s === 'bird' || s === 'پرنده') return 'bird';
  if (s === 'rabbit' || s === 'خرگوش') return 'rabbit';
  return 'other';
}

function resolveImage(url?: string | null): string {
  if (url && /^https?:\/\//i.test(url)) return url;
  return EMPTY_STATE_PHOTO;
}

export function petProfileToUiPet(pet?: PetProfile | null): Pet {
  const type = speciesToType(pet?.species);
  const ageMonths = pet?.ageMonths ?? 12;
  const ageUnit: Pet['ageUnit'] = ageMonths >= 12 ? 'year' : 'month';
  const age = ageUnit === 'year' ? Math.max(1, Math.round(ageMonths / 12)) : ageMonths;
  return {
    id: pet?.id ?? 0,
    name: pet?.name ?? 'پت',
    type,
    breed: pet?.breed ?? '—',
    age,
    ageUnit,
    size: (pet?.size as Pet['size']) || 'medium',
    gender: (pet?.gender as Pet['gender']) || 'male',
    city: pet?.city || pet?.ownerCity || '',
    neighborhood: pet?.neighborhood || '',
    ownerName: '',
    ownerId: pet?.ownerId ?? 0,
    imageUrl: resolveImage(pet?.imageUrl),
    emoji: PET_TYPE_EMOJI[type],
    bio: pet?.bio,
    traits: [],
    vaccinated: Boolean(pet?.vaccinated),
    neutered: Boolean(pet?.neutered),
    lookingForPlaymate: Boolean(pet?.lookingForPlaymate),
    distanceKm: 0,
  };
}

function toMatchStatus(status: PlaydateRequest['status']): MatchStatus {
  if (status === 'accepted') return 'accepted';
  if (status === 'rejected' || status === 'cancelled') return 'rejected';
  return 'pending';
}

/** Map API playdate → UI card (other party’s pet as fromPet). */
export function playdateToMatchRequest(req: PlaydateRequest, myUserId: number): MatchRequest {
  const incoming =
    req.toUserId === myUserId || req.toPet?.ownerId === myUserId;
  const other = incoming ? req.fromPet : req.toPet;
  return {
    id: req.id,
    fromPet: petProfileToUiPet(other),
    toPetId: incoming ? req.toPetId : req.fromPetId,
    message: req.message,
    status: toMatchStatus(req.status),
    createdAt: req.createdAt,
    scheduledAt: req.scheduledAt,
    location: req.location,
  };
}
