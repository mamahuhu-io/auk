import { Component, markRaw, reactive } from "vue"
import { getI18n } from "~/modules/i18n"
import { SpotlightSearcherResult, SpotlightService } from ".."
import {
  SearchResult,
  StaticSpotlightSearcherService,
} from "./base/static.searcher"

import { Container } from "dioc"
import IconUser from "~icons/lucide/user"

type Doc = {
  text: string | string[]
  alternates: string[]
  icon: object | Component
  excludeFromSearch?: boolean
}

/**
 *
 * This searcher is responsible for providing workspace related actions on the spotlight results.
 * Simplified for local-only mode - only personal workspace is supported.
 *
 * NOTE: Initializing this service registers it as a searcher with the Spotlight Service.
 */
export class WorkspaceSpotlightSearcherService extends StaticSpotlightSearcherService<Doc> {
  public static readonly ID = "WORKSPACE_SPOTLIGHT_SEARCHER_SERVICE"

  private t = getI18n()

  public readonly searcherID = "workspace"
  public searcherSectionTitle = this.t("spotlight.workspace.title")

  private readonly spotlight = this.bind(SpotlightService)

  private documents: Record<string, Doc> = reactive({
    switch_to_personal: {
      text: [
        this.t("workspace.title"),
        this.t("spotlight.workspace.switch_to_personal"),
      ],
      alternates: ["switch", "workspace", "personal"],
      icon: markRaw(IconUser),
    },
  })

  // TODO: Constructors are no longer recommended as of dioc > 3, move to onServiceInit
  constructor(c: Container) {
    super(c, {
      searchFields: ["text", "alternates"],
      fieldWeights: {
        text: 2,
        alternates: 1,
      },
    })
  }

  override onServiceInit() {
    this.setDocuments(this.documents)
    this.spotlight.registerSearcher(this)
  }

  protected getSearcherResultForSearchResult(
    result: SearchResult<Doc>
  ): SpotlightSearcherResult {
    return {
      id: result.id,
      icon: result.doc.icon,
      text: { type: "text", text: result.doc.text },
      score: result.score,
    }
  }

  public onDocSelected(_id: string): void {
    // In local-only mode, we only have personal workspace
    // No workspace switching needed
  }
}

// SwitchWorkspaceSpotlightSearcherService removed - not needed in local-only mode
