import { Service } from "dioc"
import { computed, ref } from "vue"
import { getI18n } from "@auk/common/modules/i18n"
import { useToast } from "@auk/common/composables/toast"
import {
  invokeDesktopCommand,
  listenDesktopEvent,
} from "@auk/common/platform/capabilities"

type UpdateInfo = {
  available: boolean
  currentVersion: string
  latestVersion: string | null
  releaseNotes: string | null
}

type DownloadProgress = {
  downloaded: number
  total: number | null
  percentage: number
}

type UpdaterEvent =
  | { type: "CheckStarted" }
  | { type: "CheckCompleted"; info: UpdateInfo }
  | { type: "CheckFailed"; error: string }
  | { type: "DownloadStarted"; totalBytes?: number }
  | { type: "DownloadProgress"; progress: DownloadProgress }
  | { type: "DownloadCompleted" }
  | { type: "InstallStarted" }
  | { type: "InstallCompleted" }
  | { type: "RestartRequired" }
  | { type: "UpdateCancelled" }
  | { type: "Error"; message: string }

const AUTO_CHECK_DELAY_MS = 30_000
const AUTO_CHECK_INTERVAL_MS = 12 * 60 * 60 * 1000

export class DesktopUpdaterService extends Service {
  public static readonly ID = "DESKTOP_UPDATER_SERVICE"

  private autoCheckTimer: ReturnType<typeof setTimeout> | null = null
  private periodicCheckTimer: ReturnType<typeof setInterval> | null = null
  private unlistenUpdaterEvent: (() => void) | null = null
  private unlistenMenuEvent: (() => void) | null = null
  private suppressedVersion: string | null = null

  readonly isPortable = ref(false)
  readonly isChecking = ref(false)
  readonly isDownloading = ref(false)
  readonly isInstalling = ref(false)
  readonly restartRequired = ref(false)
  readonly updateAvailable = ref(false)
  readonly currentVersion = ref("")
  readonly latestVersion = ref<string | null>(null)
  readonly releaseNotes = ref<string | null>(null)
  readonly errorMessage = ref<string | null>(null)
  readonly lastCheckedAt = ref<Date | null>(null)
  readonly downloadProgress = ref<DownloadProgress>({
    downloaded: 0,
    total: null,
    percentage: 0,
  })

  readonly isBusy = computed(
    () =>
      this.isChecking.value ||
      this.isDownloading.value ||
      this.isInstalling.value
  )

  readonly statusText = computed(() => {
    const t = getI18n()

    if (this.isChecking.value) return t("updater.status_checking")
    if (this.isDownloading.value) {
      if (this.downloadProgress.value.total) {
        return t("updater.status_downloading_progress", {
          percentage: Math.round(this.downloadProgress.value.percentage),
        })
      }
      return t("updater.status_downloading")
    }
    if (this.isInstalling.value) return t("updater.status_installing")
    if (this.restartRequired.value) return t("updater.status_restart_required")
    if (this.lastCheckedAt.value && !this.updateAvailable.value) {
      return t("updater.status_up_to_date")
    }
    return t("updater.status_idle")
  })

  onServiceInit() {
    void this.initialize()
  }

  onServiceDestroy() {
    this.cleanup()
  }

  async checkForUpdates(options?: { manual?: boolean }) {
    const manual = options?.manual ?? false
    const t = getI18n()
    const toast = useToast()

    if (this.isBusy.value) {
      if (manual) toast.show(t("updater.update_in_progress"))
      return
    }

    this.errorMessage.value = null

    try {
      const info = await invokeDesktopCommand<UpdateInfo>("check_for_updates", {
        showNativeDialog: this.isPortable.value,
      })

      this.lastCheckedAt.value = new Date()
      this.currentVersion.value = info.currentVersion
      this.updateAvailable.value = info.available
      this.latestVersion.value = info.latestVersion
      this.releaseNotes.value = info.releaseNotes
      this.restartRequired.value = false

      if (!info.available) {
        if (manual) toast.success(t("updater.no_updates"))
        return
      }

      if (this.isPortable.value) {
        if (manual) toast.show(t("updater.portable_update_prompt"))
        return
      }

      const latestVersion = info.latestVersion
      const shouldShowToast =
        manual ||
        (latestVersion != null && latestVersion !== this.suppressedVersion)

      if (shouldShowToast) {
        this.showUpdateAvailableToast(latestVersion ?? "")
      }
    } catch (error) {
      const message = this.formatError(error)
      this.errorMessage.value = message
      if (manual) {
        toast.error(t("updater.check_failed", { error: message }))
      }
    }
  }

  async downloadAndInstallUpdate() {
    if (
      this.isPortable.value ||
      this.isDownloading.value ||
      this.isInstalling.value
    ) {
      return
    }

    try {
      await invokeDesktopCommand("download_and_install_update")
    } catch (error) {
      const t = getI18n()
      const message = this.formatError(error)
      this.errorMessage.value = message
      useToast().error(t("updater.download_failed", { error: message }))
    }
  }

  async cancelUpdate() {
    if (!this.isDownloading.value) return
    await invokeDesktopCommand("cancel_update")
  }

  async restartApplication() {
    await invokeDesktopCommand("restart_application")
  }

  private async initialize() {
    try {
      this.isPortable.value =
        await invokeDesktopCommand<boolean>("is_portable_mode")
    } catch {
      this.isPortable.value = false
    }

    this.unlistenUpdaterEvent = await listenDesktopEvent<UpdaterEvent>(
      "updater-event",
      (event: UpdaterEvent) => this.handleUpdaterEvent(event)
    )

    this.unlistenMenuEvent = await listenDesktopEvent(
      "menu-check-for-updates",
      () => {
        void this.checkForUpdates({ manual: true })
      }
    )

    this.autoCheckTimer = setTimeout(() => {
      void this.checkForUpdates({ manual: false })
    }, AUTO_CHECK_DELAY_MS)

    this.periodicCheckTimer = setInterval(() => {
      void this.checkForUpdates({ manual: false })
    }, AUTO_CHECK_INTERVAL_MS)
  }

  private cleanup() {
    if (this.autoCheckTimer) {
      clearTimeout(this.autoCheckTimer)
      this.autoCheckTimer = null
    }

    if (this.periodicCheckTimer) {
      clearInterval(this.periodicCheckTimer)
      this.periodicCheckTimer = null
    }

    if (this.unlistenUpdaterEvent) {
      this.unlistenUpdaterEvent()
      this.unlistenUpdaterEvent = null
    }

    if (this.unlistenMenuEvent) {
      this.unlistenMenuEvent()
      this.unlistenMenuEvent = null
    }
  }

  private handleUpdaterEvent(event: UpdaterEvent) {
    const t = getI18n()
    const toast = useToast()

    switch (event.type) {
      case "CheckStarted":
        this.isChecking.value = true
        break
      case "CheckCompleted":
        this.isChecking.value = false
        this.lastCheckedAt.value = new Date()
        this.currentVersion.value = event.info.currentVersion
        break
      case "CheckFailed":
        this.isChecking.value = false
        this.errorMessage.value = event.error
        break
      case "DownloadStarted":
        this.isDownloading.value = true
        this.isInstalling.value = false
        this.restartRequired.value = false
        this.downloadProgress.value = {
          downloaded: 0,
          total: event.totalBytes ?? null,
          percentage: 0,
        }
        break
      case "DownloadProgress":
        this.downloadProgress.value = event.progress
        break
      case "DownloadCompleted":
        this.isDownloading.value = false
        break
      case "InstallStarted":
        this.isInstalling.value = true
        break
      case "InstallCompleted":
        this.isInstalling.value = false
        break
      case "RestartRequired":
        this.isDownloading.value = false
        this.isInstalling.value = false
        this.restartRequired.value = true
        this.showRestartToast()
        break
      case "UpdateCancelled":
        this.isDownloading.value = false
        this.isInstalling.value = false
        this.downloadProgress.value = {
          downloaded: 0,
          total: null,
          percentage: 0,
        }
        toast.show(t("updater.update_cancelled"))
        break
      case "Error":
        this.isDownloading.value = false
        this.isInstalling.value = false
        this.errorMessage.value = event.message
        toast.error(t("updater.download_failed", { error: event.message }))
        break
    }
  }

  private showUpdateAvailableToast(latestVersion: string) {
    const t = getI18n()
    const toast = useToast()

    toast.show(
      t("updater.update_available_toast", { version: latestVersion }),
      {
        duration: 0,
        action: [
          {
            text: t("action.dismiss"),
            onClick: (_event: unknown, toastObject: any) => {
              this.suppressedVersion = latestVersion
              toastObject.goAway(0)
            },
          },
          {
            text: t("updater.update_now"),
            onClick: (_event: unknown, toastObject: any) => {
              toastObject.goAway(0)
              void this.downloadAndInstallUpdate()
            },
          },
        ],
      }
    )
  }

  private showRestartToast() {
    const t = getI18n()
    const toast = useToast()

    toast.show(t("updater.restart_required_toast"), {
      duration: 0,
      action: [
        {
          text: t("action.dismiss"),
          onClick: (_event: unknown, toastObject: any) => toastObject.goAway(0),
        },
        {
          text: t("updater.restart_now"),
          onClick: (_event: unknown, toastObject: any) => {
            toastObject.goAway(0)
            void this.restartApplication()
          },
        },
      ],
    })
  }

  private formatError(error: unknown) {
    if (error instanceof Error) return error.message
    if (typeof error === "string") return error

    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }
}
