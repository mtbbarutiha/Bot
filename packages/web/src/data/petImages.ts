import type { PetType } from '../types';

/** High-quality Unsplash pet photos */
export const petImg = (id: string, w = 520, h = 520) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&h=${h}&fit=crop&auto=format&q=85`;

/** Curated beautiful dog portraits */
export const DOG_PHOTOS = [
  '1552053831-71594a27632d', // golden retriever in grass
  '1587300003388-59208cc962cb', // golden portrait
  '1537151628837-efeb937d8a3e', // happy mixed breed
  '1561037404-61cd46aa615f', // husky blue eyes
  '1612536826911-e1cc2d74060b', // smiling corgi
  '1516734212186-b96de08d0041', // fluffy samoyed
  '1548199973-03cce0bbc87b', // playful puppies
  '1583511655857-d19b40a7a54a', // french bulldog
  '1583339795763-f5d681110f48', // frenchie close-up
  '1551710433-bb4e2148e5e1', // border collie
  '1588947520326-590b690b21f8', // australian shepherd
  '1477884213362-85e2e12d0425', // white poodle
  '1619645853453-47b876e6d783', // chihuahua
  '1589941014603-ca27dd38d6b0', // puppy eyes
  '1558788358-f82ed960f5db', // dog portrait
  '1505628340461-e54122dd3d26', // beagle
  '1560807707-08cc1a96dbda', // german shepherd
  '1567752883858-fc489a554a1b', // rottweiler
] as const;

/** Curated beautiful cat portraits */
export const CAT_PHOTOS = [
  '1573865526739-52b8b79daceb', // fluffy gray cat
  '1518791841217-8f162f1e1131', // orange tabby
  '1495360010541-f48722b34f7d', // british shorthair
  '1529773477849-027d69ede948', // striking eyes
  '1514888286974-6c03e2ca1dba', // cat on white
  '1533734013486-c27f6c81e0c7', // maine coon
  '1574158622682-e40e69881006', // scottish fold
  '1592194996308-af41b05093a5', // kitten
  '1513244897170-49b07aca78ee', // elegant gray
  '1514880425-f793bce90571', // black cat
  '1570459487912-84ad34916325', // cute kitten
  '1606216913752-56e45f6b85d6', // playful kitten
  '1571566882370-711d0ea4d2d0', // cat close-up
  '1511048935331-a9fc92201400', // white cat
] as const;

export const BIRD_PHOTOS = [
  '1552728080-b8166996fa84',
  '1452570817815-3f09d30b970c',
  '1519008119440-dbf475795e02',
  '1444464666168-49d633b86797',
] as const;

export const RABBIT_PHOTOS = [
  '1585110396000-c9ffd4e4b308',
  '1458796300357-07edb21cc14d',
  '1558618666-fcd25c85cd64',
  '1585110396000-c9ffd4e4b308',
] as const;

export const OTHER_PHOTOS = [
  '1425087655756-6f7ab85d42c2',
  '1548761687-ccbad3d12736',
] as const;

const TYPE_PHOTOS: Record<PetType, readonly string[]> = {
  dog: DOG_PHOTOS,
  cat: CAT_PHOTOS,
  bird: BIRD_PHOTOS,
  rabbit: RABBIT_PHOTOS,
  other: OTHER_PHOTOS,
};

export function imageForType(type: PetType, index = 0): string {
  const pool = TYPE_PHOTOS[type];
  return petImg(pool[index % pool.length]);
}

export const DEFAULT_IMAGES: Record<PetType, string> = {
  dog: petImg(DOG_PHOTOS[0]),
  cat: petImg(CAT_PHOTOS[0]),
  bird: petImg(BIRD_PHOTOS[0]),
  rabbit: petImg(RABBIT_PHOTOS[0]),
  other: petImg(OTHER_PHOTOS[0]),
};

export const WELCOME_PHOTOS = [
  petImg(DOG_PHOTOS[0], 400, 400),
  petImg(CAT_PHOTOS[0], 400, 400),
  petImg(DOG_PHOTOS[4], 400, 400),
] as const;

export const EMPTY_STATE_PHOTO = petImg(CAT_PHOTOS[7], 200, 200);
