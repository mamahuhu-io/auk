import {
  Environment,
  GQLHeader,
  AukGQLAuth,
  AukGQLRequest,
  AukRESTAuth,
  AukRESTRequest,
  AukRESTHeaders,
  AukRESTRequestResponse,
  AukCollection,
  GlobalEnvironment,
  CollectionVariable,
} from "@auk/data"
import { entityReference } from "verzod"
import { z } from "zod"
import { AukAccentColors, AukBgColors } from "~/store/settings"

const ThemeColorSchema = z.enum([
  "green",
  "teal",
  "blue",
  "indigo",
  "purple",
  "yellow",
  "orange",
  "red",
  "pink",
])

const BgColorSchema = z.enum(["system", "light", "dark", "black"])

const EncodeMode = z.enum(["enable", "disable", "auto"])

const SettingsDefSchema = z.object({
  CURRENT_INTERCEPTOR_ID: z.string(),
  CURRENT_KERNEL_INTERCEPTOR_ID: z.string(),
  URL_EXCLUDES: z.object({
    auth: z.boolean(),
    httpUser: z.boolean(),
    httpPassword: z.boolean(),
    bearerToken: z.boolean(),
    oauth2Token: z.optional(z.boolean()),
  }),
  THEME_COLOR: ThemeColorSchema,
  BG_COLOR: BgColorSchema,
  ENCODE_MODE: EncodeMode.catch("enable"),
  TELEMETRY_ENABLED: z.boolean(),
  EXPAND_NAVIGATION: z.boolean(),
  SIDEBAR: z.boolean(),
  SIDEBAR_ON_LEFT: z.boolean(),
  COLUMN_LAYOUT: z.boolean(),

  WRAP_LINES: z.optional(
    z.object({
      httpRequestBody: z.boolean().catch(true),
      httpResponseBody: z.boolean().catch(true),
      httpHeaders: z.boolean().catch(true),
      httpParams: z.boolean().catch(true),
      httpUrlEncoded: z.boolean().catch(true),
      httpPreRequest: z.boolean().catch(true),
      httpTest: z.boolean().catch(true),
      httpRequestVariables: z.boolean().catch(true),
      graphqlQuery: z.boolean().catch(true),
      graphqlResponseBody: z.boolean().catch(true),
      graphqlHeaders: z.boolean().catch(false),
      graphqlVariables: z.boolean().catch(false),
      graphqlSchema: z.boolean().catch(true),
      importCurl: z.boolean().catch(true),
      codeGen: z.boolean().catch(true),
      cookie: z.boolean().catch(true),
      multipartFormdata: z.boolean().catch(true),
    })
  ),

  HAS_OPENED_SPOTLIGHT: z.optional(z.boolean()),
  ENABLE_AI_EXPERIMENTS: z.optional(z.boolean()),
  AI_REQUEST_NAMING_STYLE: z
    .string()
    .optional()
    .catch("DESCRIPTIVE_WITH_SPACES"),
  CUSTOM_NAMING_STYLE: z.string().optional().catch(""),

  EXPERIMENTAL_SCRIPTING_SANDBOX: z.optional(z.boolean()),
  ENABLE_EXPERIMENTAL_MOCK_SERVERS: z.optional(z.boolean()),
  ENABLE_EXPERIMENTAL_DOCUMENTATION: z.optional(z.boolean()),
})

const AukRESTRequestSchema = entityReference(AukRESTRequest)

const AukGQLRequestSchema = entityReference(AukGQLRequest)

const AukRESTCollectionSchema = entityReference(AukCollection)

const AukGQLCollectionSchema = entityReference(AukCollection)

export const VUEX_SCHEMA = z.object({
  postwoman: z.optional(
    z.object({
      settings: z.optional(SettingsDefSchema),
      //! Versioned entities
      collections: z.optional(z.array(AukRESTCollectionSchema)),
      collectionsGraphql: z.optional(z.array(AukGQLCollectionSchema)),
      environments: z.optional(z.array(entityReference(Environment))),
    })
  ),
})

export const THEME_COLOR_SCHEMA = z.enum(AukAccentColors)

export const NUXT_COLOR_MODE_SCHEMA = z.enum(AukBgColors)

export const LOCAL_STATE_SCHEMA = z
  .object({
    FIRST_RUN_COMPLETED: z.optional(z.boolean()),
  })
  .strict()

export const SETTINGS_SCHEMA = SettingsDefSchema.extend({
  EXTENSIONS_ENABLED: z.optional(z.boolean()),
  PROXY_ENABLED: z.optional(z.boolean()),
})

export const REST_HISTORY_ENTRY_SCHEMA = z
  .object({
    v: z.number(),
    //! Versioned entity
    request: AukRESTRequestSchema,
    responseMeta: z
      .object({
        duration: z.nullable(z.number()),
        statusCode: z.nullable(z.number()),
      })
      .strict(),
    star: z.boolean(),
    updatedOn: z.optional(z.union([z.date(), z.string()])),
  })
  .strict()

export const GQL_HISTORY_ENTRY_SCHEMA = z
  .object({
    v: z.number(),
    //! Versioned entity
    request: AukGQLRequestSchema,
    response: z.string(),
    star: z.boolean(),
    id: z.optional(z.string()),
    updatedOn: z.optional(z.union([z.date(), z.string()])),
  })
  .strict()

export const REST_COLLECTION_SCHEMA = AukRESTCollectionSchema

export const GQL_COLLECTION_SCHEMA = AukGQLCollectionSchema

export const ENVIRONMENTS_SCHEMA = z.array(entityReference(Environment))

export const GLOBAL_ENVIRONMENT_SCHEMA = entityReference(GlobalEnvironment)

export const SELECTED_ENV_INDEX_SCHEMA = z.nullable(
  z.union([
    z
      .object({
        type: z.literal("NO_ENV_SELECTED"),
      })
      .strict(),
    z
      .object({
        type: z.literal("WORKSPACE_ENV"),
        index: z.number(),
      })
      .strict(),
    // Backward compatibility: transform MY_ENV to WORKSPACE_ENV
    z
      .object({
        type: z.literal("MY_ENV"),
        index: z.number(),
      })
      .strict()
      .transform((val) => ({
        type: "WORKSPACE_ENV" as const,
        index: val.index,
      })),
  ])
)

export const WEBSOCKET_REQUEST_SCHEMA = z.nullable(
  z
    .object({
      endpoint: z.string(),
      protocols: z.array(
        z
          .object({
            value: z.string(),
            active: z.boolean(),
          })
          .strict()
      ),
    })
    .strict()
)

export const SOCKET_IO_REQUEST_SCHEMA = z.nullable(
  z
    .object({
      endpoint: z.string(),
      path: z.string(),
      version: z.union([z.literal("v4"), z.literal("v3"), z.literal("v2")]),
    })
    .strict()
)

export const SSE_REQUEST_SCHEMA = z.nullable(
  z
    .object({
      endpoint: z.string(),
      eventType: z.string(),
    })
    .strict()
)

export const MQTT_REQUEST_SCHEMA = z.nullable(
  z
    .object({
      endpoint: z.string(),
      clientID: z.optional(z.string()),
    })
    .strict()
)

const EnvironmentVariablesSchema = z.union([
  z.object({
    key: z.string(),
    initialValue: z.string(),
    currentValue: z.string(),
    secret: z.boolean(),
  }),
  z.object({
    key: z.string(),
    value: z.string(),
  }),
])

const OperationTypeSchema = z.enum([
  "subscription",
  "query",
  "mutation",
  "teardown",
])

const RunQueryOptionsSchema = z
  .object({
    name: z.optional(z.string()),
    url: z.string(),
    headers: z.array(GQLHeader),
    query: z.string(),
    variables: z.string(),
    auth: AukGQLAuth,
    operationName: z.optional(z.string()),
    operationType: OperationTypeSchema,
  })
  .strict()

const AukGQLSaveContextSchema = z.nullable(
  z.discriminatedUnion("originLocation", [
    z
      .object({
        originLocation: z.literal("user-collection"),
        folderPath: z.string(),
        requestIndex: z.number(),
      })
      .strict(),
  ])
)

const GQLResponseEventSchema = z.array(
  z
    .object({
      time: z.number(),
      operationName: z.optional(z.string()),
      operationType: OperationTypeSchema,
      data: z.string(),
      rawQuery: z.optional(RunQueryOptionsSchema),
    })
    .strict()
)

const validGqlOperations = [
  "query",
  "headers",
  "variables",
  "authorization",
] as const

const AukInheritedPropertySchema = z
  .object({
    auth: z.object({
      parentID: z.string(),
      parentName: z.string(),
      inheritedAuth: z.union([AukRESTAuth, AukGQLAuth]),
    }),
    headers: z.array(
      z.object({
        parentID: z.string(),
        parentName: z.string(),
        inheritedHeader: z.union([AukRESTHeaders, GQLHeader]),
      })
    ),
    variables: z
      .array(
        z.object({
          parentPath: z.optional(z.string()),
          parentID: z.string(),
          parentName: z.string(),
          inheritedVariables: z.array(CollectionVariable),
        })
      )
      .catch([]),
  })
  .strict()

export const GQL_TAB_STATE_SCHEMA = z
  .object({
    lastActiveTabID: z.string(),
    orderedDocs: z.array(
      z.object({
        tabID: z.string(),
        doc: z
          .object({
            // Versioned entity
            request: entityReference(AukGQLRequest),
            isDirty: z.boolean(),
            saveContext: z.optional(AukGQLSaveContextSchema),
            response: z.optional(z.nullable(GQLResponseEventSchema)),
            responseTabPreference: z.optional(z.string()),
            optionTabPreference: z.optional(z.enum(validGqlOperations)),
            inheritedProperties: z.optional(AukInheritedPropertySchema),
            cursorPosition: z.optional(z.number()),
          })
          .strict(),
      })
    ),
  })
  .strict()

const AukTestExpectResultSchema = z
  .object({
    status: z.enum(["fail", "pass", "error"]),
    message: z.string(),
  })
  .strict()

// @ts-expect-error recursive schema
const AukTestDataSchema = z.lazy(() =>
  z
    .object({
      description: z.string(),
      expectResults: z.array(AukTestExpectResultSchema),
      tests: z.array(AukTestDataSchema),
    })
    .strict()
)

export const SECRET_ENVIRONMENT_VARIABLE_SCHEMA = z.union([
  z.object({}).strict(),

  z.record(
    z.string(),
    z.array(
      z
        .object({
          key: z.string(),
          value: z.string(),
          initialValue: z.string().optional().catch(""),
          varIndex: z.number(),
        })
        .strict()
    )
  ),
])

export const CURRENT_ENVIRONMENT_VALUE_SCHEMA = z.union([
  z.object({}).strict(),

  z.record(
    z.string(),
    z.array(
      z
        .object({
          key: z.string(),
          currentValue: z.string(),
          varIndex: z.number(),
          isSecret: z.boolean().catch(false),
        })
        .strict()
    )
  ),
])

export const CURRENT_SORT_VALUES_SCHEMA = z.union([
  z.object({}).strict(),

  z.record(
    z.string(),
    z.object({
      sortBy: z.enum(["name"]),
      sortOrder: z.enum(["asc", "desc"]),
    })
  ),
])

const AukTestResultSchema = z
  .object({
    tests: z.array(AukTestDataSchema),
    expectResults: z.array(AukTestExpectResultSchema),
    description: z.string(),
    scriptError: z.boolean(),
    envDiff: z
      .object({
        global: z
          .object({
            additions: z.array(EnvironmentVariablesSchema),
            updations: z.array(
              z.intersection(
                EnvironmentVariablesSchema,
                z.object({ previousValue: z.optional(z.string()) })
              )
            ),
            deletions: z.array(EnvironmentVariablesSchema),
          })
          .strict(),
        selected: z
          .object({
            additions: z.array(EnvironmentVariablesSchema),
            updations: z.array(
              z.intersection(
                EnvironmentVariablesSchema,
                z.object({ previousValue: z.optional(z.string()) })
              )
            ),
            deletions: z.array(EnvironmentVariablesSchema),
          })
          .strict(),
      })
      .strict(),
    consoleEntries: z.optional(z.array(z.record(z.string(), z.unknown()))),
  })
  .strict()

const AukRESTResponseHeaderSchema = z
  .object({
    key: z.string(),
    value: z.string(),
  })
  .strict()

const AukRESTResponseSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("loading"),
      // !Versioned entity
      req: AukRESTRequestSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("fail"),
      headers: z.array(AukRESTResponseHeaderSchema),
      body: z.instanceof(ArrayBuffer),
      statusCode: z.number(),
      meta: z
        .object({
          responseSize: z.number(),
          responseDuration: z.number(),
        })
        .strict(),
      // !Versioned entity
      req: AukRESTRequestSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("network_fail"),
      error: z.unknown(),
      // !Versioned entity
      req: AukRESTRequestSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal("script_fail"),
      error: z.instanceof(Error),
    })
    .strict(),
  z
    .object({
      type: z.literal("success"),
      headers: z.array(AukRESTResponseHeaderSchema),
      body: z.instanceof(ArrayBuffer),
      statusCode: z.number(),
      meta: z
        .object({
          responseSize: z.number(),
          responseDuration: z.number(),
        })
        .strict(),
      // !Versioned entity
      req: AukRESTRequestSchema,
    })
    .strict(),
])

const AukRESTSaveContextSchema = z.nullable(
  z.discriminatedUnion("originLocation", [
    z
      .object({
        originLocation: z.literal("user-collection"),
        folderPath: z.string(),
        requestIndex: z.optional(z.number()),
        exampleID: z.optional(z.string()),
        requestRefID: z.optional(z.string()),
      })
      .strict(),
  ])
)

const validRestOperations = [
  "params",
  "bodyParams",
  "headers",
  "authorization",
  "preRequestScript",
  "tests",
  "requestVariables",
] as const

export const REST_TAB_STATE_SCHEMA = z
  .object({
    lastActiveTabID: z.string(),
    orderedDocs: z.array(
      z.object({
        tabID: z.string(),
        doc: z.union([
          z.object({
            type: z.literal("test-runner").catch("test-runner"),
            config: z.object({
              delay: z.number(),
              iterations: z.number(),
              keepVariableValues: z.boolean(),
              persistResponses: z.boolean(),
              stopOnError: z.boolean(),
            }),
            status: z.enum(["idle", "running", "stopped", "error"]),
            collection: AukRESTCollectionSchema,
            collectionType: z.enum(["my-collections"]),
            collectionID: z.optional(z.string()),
            resultCollection: z.optional(AukRESTCollectionSchema),
            testRunnerMeta: z.object({
              totalRequests: z.number(),
              completedRequests: z.number(),
              totalTests: z.number(),
              passedTests: z.number(),
              failedTests: z.number(),
              totalTime: z.number(),
            }),
            request: z.nullable(entityReference(AukRESTRequest)),
            response: z.nullable(AukRESTResponseSchema),
            testResults: z.optional(z.nullable(AukTestResultSchema)),
            isDirty: z.boolean(),
            inheritedProperties: z.optional(AukInheritedPropertySchema),
          }),
          z.object({
            // !Versioned entity
            request: entityReference(AukRESTRequest),
            type: z.literal("request").catch("request"),
            isDirty: z.boolean(),
            saveContext: z.optional(AukRESTSaveContextSchema),
            response: z.optional(z.nullable(AukRESTResponseSchema)),
            testResults: z.optional(z.nullable(AukTestResultSchema)),
            responseTabPreference: z.optional(z.string()),
            optionTabPreference: z.optional(z.enum(validRestOperations)),
            inheritedProperties: z.optional(AukInheritedPropertySchema),
            cancelFunction: z.optional(z.function()),
          }),
          z.object({
            type: z.literal("example-response").catch("example-response"),
            response: entityReference(AukRESTRequestResponse),
            saveContext: z.optional(AukRESTSaveContextSchema),
            isDirty: z.boolean(),
            inheritedProperties: z.optional(AukInheritedPropertySchema),
          }),
        ]),
      })
    ),
  })
  .strict()
