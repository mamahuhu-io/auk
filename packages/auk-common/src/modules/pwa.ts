import { AukModule } from "."
import { ref, onMounted } from "vue"
import { usePwaPrompt } from "@composables/pwa"
import { registerSW } from "virtual:pwa-register"

export type AukPWARegistrationStatus =
  | { status: "NOT_INSTALLED" }
  | { status: "INSTALLED"; registration: ServiceWorkerRegistration | undefined }
  | { status: "INSTALL_FAILED"; error: any }

export const pwaNeedsRefresh = ref(false)
export const pwaReadyForOffline = ref(false)
export const pwaDefferedPrompt = ref<Event | null>(null)
export const pwaRegistered = ref<AukPWARegistrationStatus>({
  status: "NOT_INSTALLED",
})

let updateApp: (reloadPage?: boolean) => Promise<void> | undefined

export const refreshAppForPWAUpdate = async () => {
  await updateApp?.(true)
}

// TODO: Update install prompt stuff

export default <AukModule>{
  onVueAppInit() {
    window.addEventListener("beforeinstallprompt", (event) => {
      pwaDefferedPrompt.value = event
    })

    updateApp = registerSW({
      immediate: true,
      onNeedRefresh() {
        pwaNeedsRefresh.value = true
      },
      onOfflineReady() {
        pwaReadyForOffline.value = true
      },
      onRegistered(registration) {
        pwaRegistered.value = {
          status: "INSTALLED",
          registration,
        }
      },
      onRegisterError(error) {
        pwaRegistered.value = {
          status: "INSTALL_FAILED",
          error,
        }
      },
    })
  },
  onRootSetup() {
    onMounted(() => {
      usePwaPrompt()
    })
  },
}
