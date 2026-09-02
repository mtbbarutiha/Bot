import type { PetType } from '../types';

/** Local bundled pet photos — always load, no external CDN */
export const petLocal = (name: string) => `/pets/${name}.jpg`;

export const DOG_PHOTOS = [
  'dog-01', 'dog-02', 'dog-03', 'dog-04', 'dog-05',
  'dog-06', 'dog-07', 'dog-08', 'dog-09', 'dog-10',
  'dog-11', 'dog-12', 'dog-13', 'dog-14', 'dog-15',
] as const;

export const CAT_PHOTOS = [
  'cat-01', 'cat-02', 'cat-03', 'cat-04', 'cat-05',
  'cat-06', 'cat-07', 'cat-08', 'cat-09', 'cat-10',
  'cat-11', 'cat-12',
] as const;

export const BIRD_PHOTOS = ['bird-01', 'bird-02', 'bird-03', 'bird-04'] as const;

export const RABBIT_PHOTOS = ['rabbit-01', 'rabbit-02', 'rabbit-03'] as const;

export const OTHER_PHOTOS = ['other-01', 'other-02'] as const;

const TYPE_PHOTOS: Record<PetType, readonly string[]> = {
  dog: DOG_PHOTOS,
  cat: CAT_PHOTOS,
  bird: BIRD_PHOTOS,
  rabbit: RABBIT_PHOTOS,
  other: OTHER_PHOTOS,
};

export function imageForType(type: PetType, index = 0): string {
  const pool = TYPE_PHOTOS[type];
  return petLocal(pool[index % pool.length]);
}

export const DEFAULT_IMAGES: Record<PetType, string> = {
  dog: petLocal(DOG_PHOTOS[0]),
  cat: petLocal(CAT_PHOTOS[0]),
  bird: petLocal(BIRD_PHOTOS[0]),
  rabbit: petLocal(RABBIT_PHOTOS[0]),
  other: petLocal(OTHER_PHOTOS[0]),
};

export const WELCOME_HERO = {
  main: petLocal('dog-01'),
  accent: petLocal('cat-01'),
} as const;

export const WELCOME_DUO = {
  left: petLocal('dog-06'),
  right: petLocal('cat-07'),
} as const;

export const WELCOME_PHOTOS = [
  WELCOME_HERO.main,
  WELCOME_HERO.accent,
  petLocal('dog-03'),
] as const;

export const EMPTY_STATE_PHOTO = petLocal(CAT_PHOTOS[7]);

/** @deprecated use petLocal — kept for admin gallery compat */
export const petImg = (id: string) => petLocal(id.replace(/\.jpg$/, ''));
