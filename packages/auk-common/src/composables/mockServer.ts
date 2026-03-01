// Mock server composable - stub for local-only mode
// Mock servers are not supported in local-only mode

import { computed, ref } from "vue"

export interface MockServer {
  id: string
  collectionID?: string
  collection?: { id: string }
  isActive: boolean
}

/**
 * Composable to get mock server status for collections
 * Stub implementation for local-only mode
 */
export function useMockServerStatus() {
  const mockServers = ref<MockServer[]>([])

  /**
   * Get mock server for a specific collection
   */
  const getMockServerForCollection = (
    _collectionId: string
  ): MockServer | null => {
    return null
  }

  /**
   * Check if a collection has an active mock server
   */
  const hasActiveMockServer = (_collectionId: string): boolean => {
    return false
  }

  /**
   * Check if a collection has any mock server (active or inactive)
   */
  const hasMockServer = (_collectionId: string): boolean => {
    return false
  }

  /**
   * Get mock server status for a collection
   */
  const getMockServerStatus = (_collectionId: string) => {
    return {
      exists: false,
      isActive: false,
      mockServer: null,
    }
  }

  return {
    mockServers: computed(() => mockServers.value),
    getMockServerForCollection,
    hasActiveMockServer,
    hasMockServer,
    getMockServerStatus,
  }
}
