import { useSyncExternalStore } from 'react';
import { userStore } from '../data/userStore';

export function useUserStore() {
  const user = useSyncExternalStore(
    userStore.subscribe,
    userStore.getSnapshot,
    userStore.getSnapshot,
  );

  return {
    user,
    hasRole: userStore.hasRole,
    isOnboarded: userStore.isOnboarded,
    setName: userStore.setName.bind(userStore),
    setRole: userStore.setRole.bind(userStore),
    setRoles: userStore.setRoles.bind(userStore),
    setOnboarding: userStore.setOnboarding.bind(userStore),
    saveRoleToApi: userStore.saveRoleToApi.bind(userStore),
    saveRolesToApi: userStore.saveRolesToApi.bind(userStore),
    saveOnboardingToApi: userStore.saveOnboardingToApi.bind(userStore),
    syncFromTelegram: userStore.syncFromTelegram.bind(userStore),
    linkApiUser: userStore.linkApiUser.bind(userStore),
    reset: userStore.reset.bind(userStore),
  };
}
