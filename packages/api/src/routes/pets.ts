import { Router } from 'express';
import { dbService } from '../db';

export const petsRouter = Router();

petsRouter.get('/', (req, res) => {
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
  const species = typeof req.query.species === 'string' ? req.query.species : undefined;
  const lookingForPlaymate =
    req.query.lookingForPlaymate === 'true'
      ? true
      : req.query.lookingForPlaymate === 'false'
        ? false
        : undefined;

  const pets = dbService.listPets({ ownerId, lookingForPlaymate, species });
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
    gender,
    ageMonths,
    size,
    color,
    bio,
    vaccinated,
    neutered,
    lookingForPlaymate,
    personality,
    health,
    diseases,
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

  const healthPayload =
    health && typeof health === 'object'
      ? { ...health }
      : {};
  if (typeof diseases === 'string' && diseases.trim()) {
    healthPayload.diseases = diseases.trim();
  }

  const pet = dbService.createPet({
    ownerId: Number(ownerId),
    name,
    species,
    breed,
    gender,
    ageMonths,
    size,
    color,
    bio,
    vaccinated,
    neutered,
    lookingForPlaymate,
    personality,
    health: healthPayload,
    imageUrl,
    city,
    neighborhood,
  });

  dbService.setUserOnboarding(Number(ownerId), 'profile_complete');
  res.status(201).json(pet);
});

petsRouter.patch('/:id', (req, res) => {
  const body = { ...req.body };
  if (typeof body.diseases === 'string') {
    const existing = dbService.getPet(Number(req.params.id));
    if (!existing) {
      res.status(404).json({ error: 'پت پیدا نشد' });
      return;
    }
    body.health = {
      ...existing.health,
      ...(body.health && typeof body.health === 'object' ? body.health : {}),
      diseases: body.diseases.trim() || undefined,
    };
    delete body.diseases;
  }

  const pet = dbService.updatePet(Number(req.params.id), body);
  if (!pet) {
    res.status(404).json({ error: 'پت پیدا نشد' });
    return;
  }
  res.json(pet);
});

petsRouter.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  const ownerId = req.query.ownerId
    ? Number(req.query.ownerId)
    : req.body?.ownerId
      ? Number(req.body.ownerId)
      : undefined;

  if (Number.isNaN(id)) {
    res.status(400).json({ error: 'شناسه پت نامعتبر است' });
    return;
  }

  const existing = dbService.getPet(id);
  if (!existing) {
    res.status(404).json({ error: 'پت پیدا نشد' });
    return;
  }

  if (ownerId !== undefined && existing.ownerId !== ownerId) {
    res.status(403).json({ error: 'اجازه حذف این پت را نداری' });
    return;
  }

  const ok = dbService.deletePet(id, ownerId);
  if (!ok) {
    res.status(404).json({ error: 'پت پیدا نشد' });
    return;
  }
  res.json({ ok: true, id });
});
