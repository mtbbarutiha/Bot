import { Router } from 'express';
import { dbService } from '../db';

export const petsRouter = Router();

petsRouter.get('/', (req, res) => {
  const ownerId = req.query.ownerId ? Number(req.query.ownerId) : undefined;
  const excludeOwnerId = req.query.excludeOwnerId ? Number(req.query.excludeOwnerId) : undefined;
  const species = typeof req.query.species === 'string' ? req.query.species : undefined;
  const city = typeof req.query.city === 'string' ? req.query.city : undefined;
  const province = typeof req.query.province === 'string' ? req.query.province : undefined;
  const breed = typeof req.query.breed === 'string' ? req.query.breed : undefined;
  const lookingForPlaymate =
    req.query.lookingForPlaymate === 'true'
      ? true
      : req.query.lookingForPlaymate === 'false'
        ? false
        : undefined;

  const pets = dbService.listPets({
    ownerId,
    excludeOwnerId,
    lookingForPlaymate,
    species,
    city,
    province,
    breed,
  });
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

petsRouter.get('/:id/medical-record', (req, res) => {
  const petId = Number(req.params.id);
  const viewerId = req.query.viewerId ? Number(req.query.viewerId) : undefined;
  if (!Number.isFinite(petId) || petId <= 0) {
    res.status(400).json({ error: 'شناسه پت نامعتبر' });
    return;
  }
  const pet = dbService.getPet(petId);
  if (!pet) {
    res.status(404).json({ error: 'پت پیدا نشد' });
    return;
  }
  if (viewerId != null) {
    const access = dbService.canAccessPetMedical(petId, viewerId);
    if (!access.ok) {
      res.status(403).json({ error: 'دسترسی به پرونده نداری' });
      return;
    }
  }
  const record = dbService.getPetMedicalRecord(petId);
  const entries = dbService.listPetMedicalEntries(petId);
  res.json({ record, entries, pet });
});

petsRouter.put('/:id/medical-record', (req, res) => {
  const petId = Number(req.params.id);
  const viewerId = req.body?.viewerId != null ? Number(req.body.viewerId) : undefined;
  if (!Number.isFinite(petId) || petId <= 0) {
    res.status(400).json({ error: 'شناسه پت نامعتبر' });
    return;
  }
  const pet = dbService.getPet(petId);
  if (!pet) {
    res.status(404).json({ error: 'پت پیدا نشد' });
    return;
  }
  if (viewerId == null) {
    res.status(400).json({ error: 'viewerId الزامی است' });
    return;
  }
  const access = dbService.canAccessPetMedical(petId, viewerId);
  if (!access.ok) {
    res.status(403).json({ error: 'دسترسی به پرونده نداری' });
    return;
  }
  const patch = {
    notes: typeof req.body?.notes === 'string' ? req.body.notes : undefined,
    vaccinations: typeof req.body?.vaccinations === 'string' ? req.body.vaccinations : undefined,
    allergies: typeof req.body?.allergies === 'string' ? req.body.allergies : undefined,
    chronicConditions:
      typeof req.body?.chronicConditions === 'string' ? req.body.chronicConditions : undefined,
    lastCheckup: typeof req.body?.lastCheckup === 'string' ? req.body.lastCheckup : undefined,
    medications: typeof req.body?.medications === 'string' ? req.body.medications : undefined,
  };
  const record = dbService.upsertPetMedicalRecord(petId, patch);
  res.json(record);
});

petsRouter.post('/:id/medical-entries', (req, res) => {
  const petId = Number(req.params.id);
  const authorUserId = req.body?.authorUserId != null ? Number(req.body.authorUserId) : undefined;
  const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
  const consultId = req.body?.consultId != null ? Number(req.body.consultId) : undefined;
  if (!Number.isFinite(petId) || petId <= 0) {
    res.status(400).json({ error: 'شناسه پت نامعتبر' });
    return;
  }
  if (!authorUserId || !text) {
    res.status(400).json({ error: 'authorUserId و text الزامی هستند' });
    return;
  }
  const pet = dbService.getPet(petId);
  if (!pet) {
    res.status(404).json({ error: 'پت پیدا نشد' });
    return;
  }
  const access = dbService.canAccessPetMedical(petId, authorUserId);
  if (!access.ok) {
    res.status(403).json({ error: 'اجازه ثبت در پرونده را نداری' });
    return;
  }
  const entry = dbService.addPetMedicalEntry({
    petId,
    authorUserId,
    text,
    consultId: Number.isFinite(consultId) ? consultId : undefined,
  });
  res.status(201).json(entry);
});
