import { Container } from "dioc"
import { computed } from "vue"
import { getDefaultRESTRequest } from "~/helpers/rest/default"
import { AukRESTSaveContext, AukTabDocument } from "~/helpers/rest/document"
import { PersistenceService, STORE_KEYS } from "../persistence"
import { TabService } from "./tab"
import { PersistableTabState } from "."

export class RESTTabService extends TabService<AukTabDocument> {
  public static readonly ID = "REST_TAB_SERVICE"

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
        type: "request",
        request: getDefaultRESTRequest(),
        isDirty: false,
        optionTabPreference: "params",
      },
    })

    this.watchCurrentTabID()
  }

  // override persistableTabState to remove response from the document
  public override persistableTabState = computed(() => ({
    lastActiveTabID: this.currentTabID.value,
    orderedDocs: this.tabOrdering.value.map((tabID) => {
      const tab = this.tabMap.get(tabID)! // tab ordering is guaranteed to have value for this key

      if (tab.document.type === "example-response") {
        return {
          tabID: tab.id,
          doc: tab.document,
        }
      }

      if (tab.document.type === "test-runner") {
        return {
          tabID: tab.id,
          doc: {
            ...tab.document,
            request: null,
            response: null,
          },
        }
      }

      return {
        tabID: tab.id,
        doc: {
          ...tab.document,
          response: null,
        },
      }
    }),
  }))

  protected async loadPersistedState(): Promise<PersistableTabState<AukTabDocument> | null> {
    const savedState = await this.persistenceService.getNullable<
      PersistableTabState<AukTabDocument>
    >(STORE_KEYS.REST_TABS)
    return savedState
  }

  public getTabRefWithSaveContext(ctx: AukRESTSaveContext) {
    for (const tab of this.tabMap.values()) {
      if (tab.document.type === "test-runner") continue

      if (
        tab.document.saveContext?.originLocation === "user-collection" &&
        tab.document.saveContext.folderPath === ctx?.folderPath &&
        tab.document.saveContext.requestIndex === ctx?.requestIndex &&
        tab.document.saveContext.exampleID === ctx?.exampleID &&
        tab.document.saveContext.requestRefID === ctx?.requestRefID
      ) {
        return this.getTabRef(tab.id)
      }
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
