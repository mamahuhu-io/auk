import { describe, expect, vi, it, beforeEach } from "vitest"
import { TestContainer } from "dioc/testing"
import { WorkspaceService } from "../workspace.service"
import { setPlatformDef } from "~/platform"
import { BehaviorSubject } from "rxjs"

describe("WorkspaceService", () => {
  const platformMock = {
    auth: {
      getCurrentUserStream: vi.fn(),
      getCurrentUser: vi.fn(),
    },
  }

  beforeEach(() => {
    // @ts-expect-error - We're mocking the platform
    setPlatformDef(platformMock)

    platformMock.auth.getCurrentUserStream.mockReturnValue(
      new BehaviorSubject(null)
    )

    platformMock.auth.getCurrentUser.mockReturnValue(null)
  })

  describe("Initialization", () => {
    it("should initialize with the personal workspace selected", () => {
      const container = new TestContainer()

      const service = container.bind(WorkspaceService)

      expect(service.currentWorkspace.value).toEqual({ type: "personal" })
    })
  })

  describe("currentWorkspace", () => {
    it("should always return personal workspace in local-only mode", () => {
      const container = new TestContainer()

      const service = container.bind(WorkspaceService)

      // In local-only mode, workspace is always personal
      expect(service.currentWorkspace.value.type).toBe("personal")
    })
  })
})
