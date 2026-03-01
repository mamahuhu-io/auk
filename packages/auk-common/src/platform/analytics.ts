export type AukRequestEvent =
  | {
      platform: "rest"
      strategy: string
      workspaceType: "personal"
    }
  | {
      platform: "graphql-query" | "graphql-schema"
      strategy: string
    }
  | { platform: "wss" | "sse" | "socketio" | "mqtt" }

export type AukSpotlightSessionEventData = {
  action?: "success" | "close"
  inputLength?: number
  method?: "keyboard-shortcut" | "click-spotlight-bar"
  rank?: string | null
  searcherID?: string | null
  sessionDuration?: string
}

export type AnalyticsEvent =
  | ({ type: "AUK_REQUEST_RUN" } & AukRequestEvent)
  | {
      type: "AUK_CREATE_ENVIRONMENT"
      workspaceType: "personal"
    }
  | {
      type: "AUK_CREATE_COLLECTION"
      platform: "rest" | "gql"
      isRootCollection: boolean
      workspaceType: "personal"
    }
  | { type: "AUK_CREATE_TEAM" }
  | {
      type: "AUK_SAVE_REQUEST"
      createdNow: boolean
      workspaceType: "personal"
      platform: "rest" | "gql"
    }
  | { type: "AUK_SHORTCODE_CREATED" }
  | { type: "AUK_SHORTCODE_RESOLVED" }
  | { type: "AUK_REST_NEW_TAB_OPENED" }
  | {
      type: "AUK_IMPORT_COLLECTION"
      importer: string
      workspaceType: "personal"
      platform: "rest" | "gql"
    }
  | {
      type: "AUK_IMPORT_ENVIRONMENT"
      workspaceType: "personal"
      platform: "rest" | "gql"
    }
  | {
      type: "AUK_EXPORT_COLLECTION"
      exporter: string
      platform: "rest" | "gql"
    }
  | { type: "AUK_EXPORT_ENVIRONMENT"; platform: "rest" | "gql" }
  | { type: "AUK_REST_CODEGEN_OPENED" }
  | { type: "AUK_REST_IMPORT_CURL" }
  | ({
      type: "AUK_SPOTLIGHT_SESSION"
    } & AukSpotlightSessionEventData)
  | {
      type: "EXPERIMENTS_GENERATE_REQUEST_NAME_WITH_AI"
      platform: "rest" | "gql"
    }

export type AnalyticsPlatformDef = {
  initAnalytics: () => void
  logEvent: (ev: AnalyticsEvent) => void
  logPageView: (pagePath: string) => void
}
