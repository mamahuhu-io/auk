/**
 * Local Auth Platform Definition
 * For local-first mode without remote backend authentication
 */

import * as E from "fp-ts/Either"
import { BehaviorSubject, Subject } from "rxjs"

import { AuthEvent, AuthPlatformDef, AukUser } from "@auk/common/platform/auth"

export const authEvents$ = new Subject<AuthEvent>()
const currentUser$ = new BehaviorSubject<AukUser | null>(null)
export const probableUser$ = new BehaviorSubject<AukUser | null>(null)

// Create a default local user
const localUser: AukUser = {
  uid: "local-user",
  displayName: "Local User",
  email: "local@localhost",
  photoURL: null,
  emailVerified: true,
}

export const def: AuthPlatformDef = {
  getCurrentUserStream: () => currentUser$,
  getAuthEventsStream: () => authEvents$,
  getProbableUserStream: () => probableUser$,

  getCurrentUser: () => currentUser$.value,
  getProbableUser: () => probableUser$.value,

  getBackendHeaders() {
    return {}
  },
  getGQLClientOptions() {
    return {
      fetchOptions: {
        credentials: "omit" as const,
      },
    }
  },

  axiosPlatformConfig() {
    return {
      withCredentials: false,
    }
  },

  willBackendHaveAuthError() {
    return false
  },

  onBackendGQLClientShouldReconnect() {
    // No-op for local mode
  },

  getDevOptsBackendIDToken() {
    return null
  },

  async performAuthInit() {
    // Auto-login as local user
    currentUser$.next(localUser)
    probableUser$.next(localUser)
    authEvents$.next({
      event: "login",
      user: localUser,
    })
  },

  waitProbableLoginToConfirm() {
    return Promise.resolve()
  },

  async signInWithEmail() {
    // No-op for local mode
  },

  isSignInWithEmailLink() {
    return false
  },

  async verifyEmailAddress() {
    return
  },

  async signInUserWithGoogle() {
    // No-op for local mode
  },

  async signInUserWithGithub() {
    return undefined
  },

  async signInUserWithMicrosoft() {
    // No-op for local mode
  },

  async signInWithEmailLink() {
    // No-op for local mode
  },

  async setEmailAddress() {
    return
  },

  async setDisplayName(name: string) {
    if (!name) return E.left("USER_NAME_CANNOT_BE_EMPTY")

    const updatedUser = {
      ...localUser,
      displayName: name,
    }
    currentUser$.next(updatedUser)
    return E.right(undefined)
  },

  async signOutUser() {
    // For local mode, just reset to local user
    currentUser$.next(localUser)
    probableUser$.next(localUser)
  },

  async refreshAuthToken() {
    return true
  },

  async processMagicLink() {
    // No-op for local mode
  },

  getAllowedAuthProviders: async () => {
    return E.right([])
  },

  async verifyAuthTokens() {
    return true
  },
}
