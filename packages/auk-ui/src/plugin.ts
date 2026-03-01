import type { Plugin, App } from "vue"

import "./assets/scss/styles.scss"
import "./assets/scss/tailwind.scss"

/**
@constant AUK_UI_OPTIONS
A constant representing the key for storing AukUI plugin options in the global context.
*/

export const AUK_UI_OPTIONS = "AUK_UI_OPTIONS"

/**
@typedef {Object} AukUIPluginOptions
@property [t] - A function for handling translations for the plugin.
@property [onModalOpen] - A callback function that is called when a modal is opened.
@property [onModalClose] - A callback function that is called when a modal is closed.
*/

export type AukUIPluginOptions = {
  t?: (key: string) => string
  onModalOpen?: () => void
  onModalClose?: () => void
}

export const plugin: Plugin = {
  install(app: App, options: AukUIPluginOptions = {}) {
    app.provide(AUK_UI_OPTIONS, options)
  },
}

export default plugin
