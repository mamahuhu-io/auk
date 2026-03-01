import { AukModule } from "."
import { plugin as AukUI, AukUIPluginOptions } from "@auk/ui"
import { useKeybindingDisabler } from "~/helpers/keybindings"
import { useI18n } from "vue-i18n"
const { disableKeybindings, enableKeybindings } = useKeybindingDisabler()

import "@auk/ui/style.css"

const AukUIOptions: AukUIPluginOptions = {
  t: (key: string) => useI18n().t(key).toString(),
  onModalOpen: disableKeybindings,
  onModalClose: enableKeybindings,
}

export default <AukModule>{
  onVueAppInit(app) {
    // disable eslint for this line. it's a hack because there's some unknown type error
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.use(AukUI, AukUIOptions)
  },
}
