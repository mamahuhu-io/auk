/**
 * Auk Desktop - Main Entry Point
 * Directly initializes the main Auk application
 */

import { createAukApp } from "@auk/common"
import { invoke } from "@tauri-apps/api/core"
import { onAppLanguageChange } from "@auk/common/modules/i18n"
import { platform } from "./platform"

// Import Desktop-specific styles (must be after createAukApp imports to override)
import "./assets/scss/tailwind.scss"
import "./assets/scss/styles.scss"

// Initialize the Auk application
const appName = "Auk"

onAppLanguageChange((_locale: string, t) => {
  const labels = {
    app: {
      about: t("menu.about", { app: appName }),
      settings: t("menu.settings"),
      check_for_updates: t("menu.check_for_updates"),
      services: t("menu.services"),
      hide: t("menu.hide"),
      hide_others: t("menu.hide_others"),
      quit: t("menu.quit"),
    },
    file: {
      label: t("menu.file"),
      close_window: t("menu.close_window"),
      quit: t("menu.quit"),
    },
    edit: {
      label: t("menu.edit"),
      undo: t("menu.undo"),
      redo: t("menu.redo"),
      cut: t("menu.cut"),
      copy: t("menu.copy"),
      paste: t("menu.paste"),
      select_all: t("menu.select_all"),
    },
    view: {
      label: t("menu.view"),
      fullscreen: t("menu.fullscreen"),
    },
    window: {
      label: t("menu.window"),
      minimize: t("menu.minimize"),
      maximize: t("menu.maximize"),
      close_window: t("menu.close_window"),
    },
    help: {
      label: t("menu.help"),
      about: t("menu.about", { app: appName }),
      documentation: t("menu.documentation"),
      source_code: t("menu.source_code"),
      release_notes: t("menu.release_notes"),
      report_issue: t("menu.report_issue"),
    },
  }

  invoke("set_app_menu", { labels }).catch((error) => {
    console.error("Failed to set app menu", error)
  })
})

createAukApp("#app", platform)
