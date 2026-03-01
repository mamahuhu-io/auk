import { platform } from "~/platform"
import { AukUser } from "~/platform/auth"
import { onBeforeUnmount, onMounted, watch, WatchStopHandle } from "vue"
import { useReadonlyStream } from "./stream"

/**
 * A Vue composable function that is called when the auth status
 * is being updated to being logged in (fired multiple times),
 * this is also called on component mount if the login
 * was already resolved before mount.
 */
export function onLoggedIn(exec: (user: AukUser) => void) {
  const currentUser = useReadonlyStream(
    platform.auth.getCurrentUserStream(),
    platform.auth.getCurrentUser()
  )

  let watchStop: WatchStopHandle | null = null

  onMounted(() => {
    if (currentUser.value) exec(currentUser.value)

    watchStop = watch(currentUser, (newVal, prev) => {
      if (prev === null && newVal !== null) {
        exec(newVal)
      }
    })
  })

  onBeforeUnmount(() => {
    watchStop?.()
  })
}
