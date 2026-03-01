import { nextTick } from "vue"
import { AukModule } from "."

/*
  Declares a `v-focus` directive that can be used for components
  to acquire focus instantly once mounted
*/

export default <AukModule>{
  onVueAppInit(app) {
    app.directive("focus", {
      mounted: (el) => nextTick(() => el.focus()),
    })
  },
}
