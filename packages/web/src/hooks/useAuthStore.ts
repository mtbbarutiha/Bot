import { useSyncExternalStore } from 'react';
import { authStore } from '../data/authStore';

export function useAuthStore() {
  const state = useSyncExternalStore(
    authStore.subscribe,
    authStore.getSnapshot,
    authStore.getSnapshot
  );

  return {
    token: state.token,
    user: state.user,
    pendingChannel: state.pendingChannel,
    pendingTarget: state.pendingTarget,
    pendingDevCode: state.pendingDevCode,
    isLoggedIn: authStore.isLoggedIn,
    hasRole: authStore.hasRole,
    isProfileComplete: authStore.isProfileComplete,
    requestOtp: authStore.requestOtp.bind(authStore),
    verifyOtp: authStore.verifyOtp.bind(authStore),
    acceptSession: authStore.acceptSession.bind(authStore),
    refreshMe: authStore.refreshMe.bind(authStore),
    saveProfile: authStore.saveProfile.bind(authStore),
    saveRoles: authStore.saveRoles.bind(authStore),
    setPrimaryRole: authStore.setPrimaryRole.bind(authStore),
    logout: authStore.logout.bind(authStore),
    setPending: authStore.setPending.bind(authStore),
    clearPending: authStore.clearPending.bind(authStore),
  };
}
