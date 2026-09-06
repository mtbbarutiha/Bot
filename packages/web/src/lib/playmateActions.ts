import { PET_SPECIES_LABELS, rankPlaymateMatches, type PetProfile } from '@petdate/shared';
import { createPlaydateRequest, listPets } from './api';

const MAX_AUTO_REQUESTS = 30;

export type FindPlaymateResult = {
  sent: number;
  skipped: number;
  speciesLabel: string;
  sampleLine?: string;
  sourceName: string;
};

/** ارسال یک درخواست همبازی — مثل ربات، بدون پیام اختیاری */
export async function sendPlaymateRequestNow(opts: {
  fromPetId: number;
  toPetId: number;
  fromUserId: number;
  confirmResend?: boolean;
}) {
  try {
    return await createPlaydateRequest({
      fromPetId: opts.fromPetId,
      toPetId: opts.toPetId,
      fromUserId: opts.fromUserId,
      confirmResend: opts.confirmResend,
    });
  } catch (err) {
    const needsConfirm =
      err instanceof Error &&
      ((err as Error & { requiresResendConfirm?: boolean }).requiresResendConfirm ||
        /میخوای مجدد/.test(err.message));
    if (!opts.confirmResend && needsConfirm) {
      const ok =
        typeof window !== 'undefined' &&
        window.confirm('میخوای مجدد درخواست بدی به اون شخص؟');
      if (!ok) throw err;
      return createPlaydateRequest({
        fromPetId: opts.fromPetId,
        toPetId: opts.toPetId,
        fromUserId: opts.fromUserId,
        confirmResend: true,
      });
    }
    throw err;
  }
}

/**
 * پیدا کردن همبازی مثل ربات:
 * پت مبدأ → رتبه‌بندی هم‌گروه → ارسال خودکار درخواست‌ها
 */
export async function findAndSendPlaymates(
  source: PetProfile,
  fromUserId: number
): Promise<FindPlaymateResult> {
  const peers = await listPets({
    lookingForPlaymate: true,
    species: source.species,
  });
  const matches = rankPlaymateMatches(source, peers, { max: MAX_AUTO_REQUESTS });
  const speciesLabel = PET_SPECIES_LABELS[source.species] ?? source.species;

  if (matches.length === 0) {
    return {
      sent: 0,
      skipped: 0,
      speciesLabel,
      sourceName: source.name,
    };
  }

  let sent = 0;
  let skipped = 0;
  let sample: string | undefined;
  let preferredSample: string | undefined;

  for (const match of matches) {
    try {
      await sendPlaymateRequestNow({
        fromPetId: source.id,
        toPetId: match.pet.id,
        fromUserId,
      });
      sent += 1;
      const locReasons = match.reasons.filter(
        (r) => r === 'هم‌کشور' || r === 'هم‌استان' || r === 'هم‌شهر'
      );
      const why =
        locReasons.length > 0
          ? locReasons.join(' · ')
          : match.reasons.slice(0, 2).join(' · ');
      const line = `• ${match.pet.name}${why ? ` — ${why}` : ''}`;
      if (!sample) sample = line;
      if (
        !preferredSample &&
        (match.reasons.includes('هم‌استان') || match.reasons.includes('هم‌کشور'))
      ) {
        preferredSample = line;
      }
    } catch {
      skipped += 1;
    }
  }

  return {
    sent,
    skipped,
    speciesLabel,
    sampleLine: preferredSample ?? sample,
    sourceName: source.name,
  };
}
