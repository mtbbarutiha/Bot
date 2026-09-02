import { Router } from 'express';
import type { PlaydateStatus } from '@petdate/shared';
import { dbService } from '../db';

const VALID_STATUSES: PlaydateStatus[] = ['pending', 'accepted', 'rejected', 'cancelled'];

export const playdatesRouter = Router();

function enrichPlaydate(req: ReturnType<typeof dbService.getPlaydateRequest>) {
  if (!req) return null;
  return {
    ...req,
    fromPet: dbService.getPet(req.fromPetId) ?? undefined,
    toPet: dbService.getPet(req.toPetId) ?? undefined,
  };
}

playdatesRouter.get('/', (req, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : undefined;
  const petId = req.query.petId ? Number(req.query.petId) : undefined;
  const status = req.query.status as PlaydateStatus | undefined;

  const requests = dbService
    .listPlaydateRequests({ userId, petId, status })
    .map((r) => enrichPlaydate(r)!);
  res.json(requests);
});

playdatesRouter.get('/:id', (req, res) => {
  const request = enrichPlaydate(dbService.getPlaydateRequest(Number(req.params.id)));
  if (!request) {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }
  res.json(request);
});

playdatesRouter.post('/', (req, res) => {
  const { fromPetId, toPetId, fromUserId, toUserId, message, scheduledAt, location } = req.body;

  if (!fromPetId || !toPetId || !fromUserId) {
    res.status(400).json({ error: 'fromPetId، toPetId و fromUserId الزامی هستند' });
    return;
  }

  const fromPet = dbService.getPet(Number(fromPetId));
  const toPet = dbService.getPet(Number(toPetId));
  if (!fromPet || !toPet) {
    res.status(404).json({ error: 'پت مبدأ یا مقصد پیدا نشد' });
    return;
  }

  const request = dbService.createPlaydateRequest({
    fromPetId: Number(fromPetId),
    toPetId: Number(toPetId),
    fromUserId: Number(fromUserId),
    toUserId: toUserId ? Number(toUserId) : toPet.ownerId,
    message,
    scheduledAt,
    location,
  });

  res.status(201).json(enrichPlaydate(request));
});

playdatesRouter.patch('/:id', (req, res) => {
  const { status } = req.body;
  if (!VALID_STATUSES.includes(status)) {
    res.status(400).json({ error: 'وضعیت نامعتبر است' });
    return;
  }

  const updated = enrichPlaydate(dbService.updatePlaydateStatus(Number(req.params.id), status));
  if (!updated) {
    res.status(404).json({ error: 'درخواست پیدا نشد' });
    return;
  }
  res.json(updated);
});
