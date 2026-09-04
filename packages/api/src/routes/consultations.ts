import { Router } from 'express';
import type { VetConsultStatus } from '@petdate/shared';
import { dbService } from '../db';

const VALID_STATUSES: VetConsultStatus[] = ['requested', 'active', 'completed', 'cancelled'];

export const consultationsRouter = Router();

consultationsRouter.get('/', (req, res) => {
  const vetUserId = req.query.vetUserId ? Number(req.query.vetUserId) : undefined;
  const status = req.query.status as VetConsultStatus | undefined;

  if (!vetUserId || Number.isNaN(vetUserId)) {
    res.status(400).json({ error: 'vetUserId الزامی است' });
    return;
  }
  if (status && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: 'وضعیت نامعتبر است' });
    return;
  }

  const consultations = dbService.listVetConsultations({ vetUserId, status });
  res.json(consultations);
});

consultationsRouter.post('/', (req, res) => {
  const { vetUserId, patientUserId, petId, status, notes } = req.body ?? {};

  if (!vetUserId || !patientUserId) {
    res.status(400).json({ error: 'vetUserId و patientUserId الزامی هستند' });
    return;
  }

  const vet = dbService.getUserById(Number(vetUserId));
  const patient = dbService.getUserById(Number(patientUserId));
  if (!vet || !patient) {
    res.status(404).json({ error: 'دامپزشک یا بیمار پیدا نشد' });
    return;
  }

  if (status && !VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: 'وضعیت نامعتبر است' });
    return;
  }

  if (petId != null) {
    const pet = dbService.getPet(Number(petId));
    if (!pet) {
      res.status(404).json({ error: 'پت پیدا نشد' });
      return;
    }
  }

  const consultation = dbService.createVetConsultation({
    vetUserId: Number(vetUserId),
    patientUserId: Number(patientUserId),
    petId: petId != null ? Number(petId) : undefined,
    status: status as VetConsultStatus | undefined,
    notes: typeof notes === 'string' ? notes : undefined,
  });

  res.status(201).json(consultation);
});
