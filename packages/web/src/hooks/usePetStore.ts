import { useSyncExternalStore } from 'react';
import { petStore } from '../data/store';

export function usePetStore() {
  const data = useSyncExternalStore(
    petStore.subscribe,
    petStore.getSnapshot,
    petStore.getSnapshot,
  );

  return {
    ...data,
    getPetById: petStore.getPetById.bind(petStore),
    addPet: petStore.addPet.bind(petStore),
    updatePet: petStore.updatePet.bind(petStore),
    deletePet: petStore.deletePet.bind(petStore),
    updateMatchStatus: petStore.updateMatchStatus.bind(petStore),
    deleteMatch: petStore.deleteMatch.bind(petStore),
    sendPlaydateRequest: petStore.sendPlaydateRequest.bind(petStore),
    hasPendingRequest: petStore.hasPendingRequest.bind(petStore),
    updateOwner: petStore.updateOwner.bind(petStore),
    resetStore: petStore.reset.bind(petStore),
  };
}
