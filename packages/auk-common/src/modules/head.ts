import { useHead } from "@unhead/vue"
import { createHead } from "@unhead/vue/client"

import { APP_INFO } from "~/../meta"
import { AukModule } from "."

export default <AukModule>{
  onVueAppInit(app) {
    const head = createHead()

    app.use(head)
  },

  onRootSetup() {
    useHead({
      title: `${APP_INFO.name} • ${APP_INFO.shortDescription}`,
      titleTemplate(title) {
        return title === "Auk" ? title : `${title} • Auk`
      },
    })
  },
}
