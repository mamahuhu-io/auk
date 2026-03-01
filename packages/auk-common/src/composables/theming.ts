import { inject } from "vue"
import { AukColorMode } from "~/modules/theming"

export const useColorMode = () => inject("colorMode") as AukColorMode
