import { Service } from "dioc"
import { ref, readonly } from "vue"

/**
 * Defines a workspace and its information
 * In local-only mode, only personal workspace is supported.
 */

export type PersonalWorkspace = {
  type: "personal"
}

export type Workspace = PersonalWorkspace

/**
 * This services manages workspace related data and actions in Auk.
 * Simplified for local-only mode - only personal workspace is supported.
 */
export class WorkspaceService extends Service {
  public static readonly ID = "WORKSPACE_SERVICE"

  private _currentWorkspace = ref<Workspace>({ type: "personal" })

  /**
   * A readonly reference to the currently selected workspace
   */
  public currentWorkspace = readonly(this._currentWorkspace)

  override onServiceInit() {
    // In local-only mode, we always use personal workspace
    this._currentWorkspace.value = { type: "personal" }
  }
}
