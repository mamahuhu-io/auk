import { PersistableTabState } from "~/services/tab"
import { AukUser } from "./auth"
import { AukTabDocument } from "~/helpers/rest/document"

export type TabStatePlatformDef = {
  loadTabStateFromSync: () => Promise<PersistableTabState<AukTabDocument> | null>
  writeCurrentTabState: (
    user: AukUser,
    persistableTabState: PersistableTabState<AukTabDocument>
  ) => Promise<void>
}
