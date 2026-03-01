import { isEqual } from "lodash-es"
import { getDefaultGQLRequest } from "~/helpers/graphql/default"
import { AukGQLDocument, AukGQLSaveContext } from "~/helpers/graphql/document"
import { TabService } from "./tab"
import { computed } from "vue"
import { Container } from "dioc"
import { PersistenceService, STORE_KEYS } from "../persistence"
import { PersistableTabState } from "."

export class GQLTabService extends TabService<AukGQLDocument> {
  public static readonly ID = "GQL_TAB_SERVICE"

  // Use lazy binding to avoid circular dependency
  private get persistenceService() {
    return this.bind(PersistenceService)
  }

  // TODO: Moving this to `onServiceInit` breaks `persistableTabState`
  // Figure out how to fix this
  constructor(c: Container) {
    super(c)

    this.tabMap.set("test", {
      id: "test",
      document: {
        request: getDefaultGQLRequest(),
        isDirty: false,
        optionTabPreference: "query",
        cursorPosition: 0,
      },
    })

    this.watchCurrentTabID()
  }

  // override persistableTabState to remove response from the document
  public override persistableTabState = computed(() => ({
    lastActiveTabID: this.currentTabID.value,
    orderedDocs: this.tabOrdering.value.map((tabID) => {
      const tab = this.tabMap.get(tabID)! // tab ordering is guaranteed to have value for this key
      return {
        tabID: tab.id,
        doc: {
          ...tab.document,
          response: null,
        },
      }
    }),
  }))

  protected async loadPersistedState(): Promise<PersistableTabState<AukGQLDocument> | null> {
    const savedState = await this.persistenceService.getNullable<
      PersistableTabState<AukGQLDocument>
    >(STORE_KEYS.GQL_TABS)
    return savedState
  }

  public getTabRefWithSaveContext(ctx: AukGQLSaveContext) {
    for (const tab of this.tabMap.values()) {
      if (isEqual(ctx, tab.document.saveContext)) return this.getTabRef(tab.id)
    }

    return null
  }

  public getDirtyTabsCount() {
    let count = 0

    for (const tab of this.tabMap.values()) {
      if (tab.document.isDirty) count++
    }

    return count
  }
}
