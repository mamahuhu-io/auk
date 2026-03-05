import { mount } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, nextTick, ref } from "vue"

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

describe("useGitOAuth", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it("shows success toast once when multiple composable instances are mounted", async () => {
    const toast = {
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
    }

    const successListeners: Array<(event: any) => void> = []
    const errorListeners: Array<(event: any) => void> = []

    vi.doMock("~/composables/i18n", () => ({
      useI18n: () => (key: string) => key,
    }))

    vi.doMock("~/composables/toast", () => ({
      useToast: () => toast,
    }))

    vi.doMock("~/services/git/oauth-store", () => ({
      useGitOAuthAccounts: () => ({
        accounts: ref([]),
        isLoading: ref(false),
        isHydrated: ref(true),
        githubAccounts: ref([]),
        gitlabAccounts: ref([]),
        giteeAccounts: ref([]),
        bitbucketAccounts: ref([]),
        getAccount: vi.fn(async () => null),
        removeAccount: vi.fn(async () => {}),
        isExpired: vi.fn(() => false),
        hasValidToken: vi.fn(() => true),
        getValidAccountForProvider: vi.fn(() => null),
      }),
      loadOAuthAccounts: vi.fn(),
    }))

    vi.doMock("~/services/git/oauth-providers", () => ({
      inferProviderFromUrl: vi.fn(() => null),
      getProviderDisplayName: vi.fn((provider: string) => provider),
    }))

    vi.doMock("~/services/git/oauth-callback-handler", () => ({
      initOAuthCallbackHandler: vi.fn(async () => () => {}),
      onOAuthSuccess: (callback: (event: any) => void) => {
        successListeners.push(callback)
        return () => {}
      },
      onOAuthError: (callback: (event: any) => void) => {
        errorListeners.push(callback)
        return () => {}
      },
    }))

    vi.doMock("~/platform/capabilities", () => ({
      openExternalURL: vi.fn(async () => {}),
    }))

    vi.doMock("~/services/git/oauth-auth", () => ({
      startOAuthFlow: vi.fn(async () => "https://example.com/oauth"),
      getValidAccessToken: vi.fn(async () => null),
      refreshOAuthToken: vi.fn(async () => null),
      cancelPendingOAuth: vi.fn(),
      PENDING_AUTH_TIMEOUT_MS: 10 * 60 * 1000,
      getOAuthClientCredentials: vi.fn((provider: string) =>
        provider === "github"
          ? { clientId: "test-client-id", clientSecret: "test-secret" }
          : null
      ),
    }))

    const { useGitOAuth } = await import("../useGitOAuth")
    const TestComponent = defineComponent({
      setup() {
        return useGitOAuth()
      },
      template: "<div />",
    })

    const firstWrapper = mount(TestComponent)
    const secondWrapper = mount(TestComponent)
    await flushPromises()

    await (firstWrapper.vm as any).authenticate("github")
    await nextTick()

    expect(successListeners).toHaveLength(2)
    expect(errorListeners).toHaveLength(2)

    for (const listener of successListeners) {
      listener({
        account: {
          provider: "github",
          user: {
            username: "188",
          },
        },
      })
    }
    await nextTick()

    expect(toast.success).toHaveBeenCalledTimes(1)

    firstWrapper.unmount()
    secondWrapper.unmount()
  })
})
