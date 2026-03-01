import { useWhatsNewDialog } from "~/composables/whats-new"
import { AukModule } from "."

export default <AukModule>{
  onRootSetup() {
    useWhatsNewDialog()
  },
}
