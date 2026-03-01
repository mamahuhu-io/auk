import { AukFooterMenuItem } from "../../ui"
import IconGift from "~icons/lucide/gift"
import IconMessageCircleQuestionMark from "~icons/lucide/MessageCircleQuestionMark"

export const whatsNew: AukFooterMenuItem = {
  id: "whats-new",
  text: (t) => t("app.whats_new"),
  icon: IconGift,
  action: {
    type: "link",
    href: "https://auk.mamahuhu.dev/documentation/changelog",
  },
}

export const status: AukFooterMenuItem = {
  id: "status",
  text: (t) => t("app.report_issue"),
  icon: IconMessageCircleQuestionMark,
  action: {
    type: "link",
    href: "https://github.com/mamahuhu-io/auk/issues/new",
  },
}

export const stdFooterItems = [whatsNew, status]
