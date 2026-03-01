import { toast as sonner } from "@auk/ui"
import { markRaw } from "vue"
import WhatsNewDialog from "~/components/app/WhatsNewDialog.vue"
import { appVersion } from "~/composables/appMeta"
import { getService } from "~/modules/dioc"
import { PersistenceService } from "~/services/persistence"

export async function useWhatsNewDialog() {
  const persistenceService = getService(PersistenceService)

  const versionFromLocalStorage =
    await persistenceService.getLocalConfig("auk_v")

  // Set new entry `auk_v` under `localStorage` if not present
  if (!versionFromLocalStorage) {
    await persistenceService.setLocalConfig("auk_v", appVersion)
    return
  }

  // Already on the latest version
  if (versionFromLocalStorage === appVersion) {
    return
  }

  // Show what's new whenever app version changes so desktop releases trigger it.
  setTimeout(async () => {
    const notesUrl = await getReleaseNotes(appVersion)

    sonner.custom(markRaw(WhatsNewDialog), {
      componentProps: {
        notesUrl,
        version: appVersion,
      },
      position: "bottom-left",
      style: {
        bottom: "15px",
        left: "30px",
      },
      duration: Infinity,
    })
  }, 10000)

  await persistenceService.setLocalConfig("auk_v", appVersion)
}

async function getReleaseNotes(v: string): Promise<string> {
  try {
    const { release_notes } = await fetch(
      `https://github.com/mamahuhu-io/auk/releases/latest/download/` +
        `${v}.json`
    ).then((res) => res.json())

    if (typeof release_notes === "string" && release_notes.length > 0) {
      return release_notes
    }
  } catch (_) {
    // fall through to the tag page fallback
  }

  return `https://github.com/mamahuhu-io/auk/releases/tag/v${v}`
}
