import { invokeAction } from "~/helpers/actions"
import { AukSupportOptionsMenuItem } from "~/platform/ui"
import IconBook from "~icons/lucide/book"
import IconGift from "~icons/lucide/gift"
import IconZap from "~icons/lucide/zap"
import IconGitHub from "~icons/lucide/github"
import IconTwitter from "~icons/brands/twitter"
import IconDiscord from "~icons/brands/discord"
import IconUserPlus from "~icons/lucide/user-plus"

export const documentation: AukSupportOptionsMenuItem = {
  id: "documentation",
  text: (t) => t("app.documentation"),
  subtitle: (t) => t("support.documentation"),
  icon: IconBook,
  action: {
    type: "link",
    href: "https://auk.mamahuhu.dev",
  },
}

export const shortcuts: AukSupportOptionsMenuItem = {
  id: "shortcuts",
  text: (t) => t("app.keyboard_shortcuts"),
  subtitle: (t) => t("support.shortcuts"),
  icon: IconZap,
  action: {
    type: "custom",
    do() {
      invokeAction("flyouts.keybinds.toggle")
    },
  },
}

export const changelog: AukSupportOptionsMenuItem = {
  id: "changelog",
  text: (t) => t("app.whats_new"),
  subtitle: (t) => t("support.changelog"),
  icon: IconGift,
  action: {
    type: "link",
    href: "https://auk.mamahuhu.dev/documentation/changelog",
  },
}

export const github: AukSupportOptionsMenuItem = {
  id: "github",
  text: (t) => t("app.github"),
  subtitle: (t) => t("support.github"),
  icon: IconGitHub,
  action: {
    type: "link",
    href: "https://auk.mamahuhu.io/github",
  },
}

export const discord: AukSupportOptionsMenuItem = {
  id: "discord",
  text: (t) => t("app.join_discord_community"),
  subtitle: (t) => t("support.community"),
  icon: IconDiscord,
  action: {
    type: "link",
    href: "https://auk.mamahuhu.io/discord",
  },
}

export const twitter: AukSupportOptionsMenuItem = {
  id: "discord",
  text: (t) => t("app.twitter"),
  subtitle: (t) => t("support.twitter"),
  icon: IconTwitter,
  action: {
    type: "link",
    href: "https://auk.mamahuhu.io/twitter",
  },
}

export const invite: AukSupportOptionsMenuItem = {
  id: "invite",
  text: (t) => t("app.invite"),
  subtitle: (t) => t("shortcut.miscellaneous.invite"),
  icon: IconUserPlus,
  action: {
    type: "custom",
    do() {
      invokeAction("modals.share.toggle")
    },
  },
}

export const stdSupportOptionItems: AukSupportOptionsMenuItem[] = [
  documentation,
  shortcuts,
  changelog,
  github,
  invite,
  discord,
  twitter,
]
