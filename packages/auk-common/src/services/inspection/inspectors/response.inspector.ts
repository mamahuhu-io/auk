import { Service } from "dioc"
import { InspectionService, Inspector, InspectorResult } from ".."
import { getI18n } from "~/modules/i18n"
import { AukRESTRequest, AukRESTResponseOriginalRequest } from "@auk/data"
import IconAlertTriangle from "~icons/lucide/alert-triangle"
import { AukRESTResponse } from "~/helpers/types/AukRESTResponse"
import { computed, Ref, markRaw } from "vue"

/**
 * This inspector is responsible for inspecting the response of a request.
 * It checks if the response is successful and if it contains errors.
 *
 * NOTE: Initializing this service registers it as a inspector with the Inspection Service.
 */
export class ResponseInspectorService extends Service implements Inspector {
  public static readonly ID = "RESPONSE_INSPECTOR_SERVICE"

  private t = getI18n()

  public readonly inspectorID = "response"

  private readonly inspection = this.bind(InspectionService)

  override onServiceInit() {
    this.inspection.registerInspector(this)
  }

  getInspections(
    _req: Readonly<Ref<AukRESTRequest | AukRESTResponseOriginalRequest>>,
    res: Readonly<Ref<AukRESTResponse | null | undefined>>
  ) {
    return computed(() => {
      const results: InspectorResult[] = []
      if (!res.value) return results

      const hasErrors =
        res && (res.value.type !== "success" || res.value.statusCode !== 200)

      let text: string | undefined = undefined

      if (res.value.type === "network_fail" && !navigator.onLine) {
        text = this.t("inspections.response.network_error")
      } else if (res.value.type === "fail") {
        text = this.t("inspections.response.default_error")
      } else if (res.value.type === "success" && res.value.statusCode === 404) {
        text = this.t("inspections.response.404_error")
      } else if (res.value.type === "success" && res.value.statusCode === 401) {
        text = this.t("inspections.response.401_error")
      }

      if (hasErrors && text) {
        results.push({
          id: "url",
          icon: markRaw(IconAlertTriangle),
          text: {
            type: "text",
            text: text,
          },
          severity: 2,
          isApplicable: true,
          locations: {
            type: "response",
          },
          doc: {
            text: this.t("action.learn_more"),
            link: "https://auk.mamahuhu.dev/documentation/features/inspections",
          },
        })
      }

      return results
    })
  }
}
