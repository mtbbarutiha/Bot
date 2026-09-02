import { Router } from 'express';
import { dbService } from '../db';

export const petsRouter = Router();

petsRouter.get('/', (req, res) => {
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
  const lookingForPlaymate =
    req.query.lookingForPlaymate === 'true'
      ? true
      : req.query.lookingForPlaymate === 'false'
        ? false
        : undefined;

  const pets = dbService.listPets({ ownerId, lookingForPlaymate });
  res.json(pets);
});

petsRouter.get('/:id', (req, res) => {
  const pet = dbService.getPet(Number(req.params.id));
  if (!pet) {
    res.status(404).json({ error: 'پت پیدا نشد' });
    return;
  }
  res.json(pet);
});

petsRouter.post('/', (req, res) => {
  const {
    ownerId,
    name,
    species,
    breed,
    ageMonths,
    bio,
    vaccinated,
    neutered,
    lookingForPlaymate,
    personality,
    health,
    imageUrl,
    city,
    neighborhood,
  } = req.body;

  if (!ownerId || !name || !species) {
    res.status(400).json({ error: 'ownerId، name و species الزامی هستند' });
    return;
  }

  const owner = dbService.getUserById(Number(ownerId));
  if (!owner) {
    res.status(404).json({ error: 'صاحب پت پیدا نشد' });
    return;
  }

  const pet = dbService.createPet({
    ownerId: Number(ownerId),
    name,
    species,
    breed,
    ageMonths,
    bio,
    vaccinated,
    neutered,
    lookingForPlaymate,
    personality,
    health,
    imageUrl,
    city,
    neighborhood,
  });

  dbService.setUserOnboarding(Number(ownerId), 'profile_complete');
  res.status(201).json(pet);
});

petsRouter.patch('/:id', (req, res) => {
  const pet = dbService.updatePet(Number(req.params.id), req.body);
  if (!pet) {
    res.status(404).json({ error: 'پت پیدا نشد' });
    return;
  }
  res.json(pet);
});
