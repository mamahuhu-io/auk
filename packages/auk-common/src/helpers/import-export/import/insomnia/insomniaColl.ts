import {
  AukCollection,
  AukCollectionVariable,
  AukRESTAuth,
  AukRESTHeader,
  AukRESTParam,
  AukRESTReqBody,
  AukRESTRequest,
  AukRESTRequestVariable,
  knownContentTypes,
  makeCollection,
  makeRESTRequest,
} from "@auk/data"

import * as A from "fp-ts/Array"
import * as TE from "fp-ts/TaskEither"
import * as TO from "fp-ts/TaskOption"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import { convert } from "insomnia-importers"

import { IMPORTER_INVALID_FILE_FORMAT } from ".."
import { replaceInsomniaTemplating } from "./insomniaEnv"
import { safeParseJSONOrYAML } from "~/helpers/functional/yaml"
import {
  InsomniaDoc,
  InsomniaDocV5,
  InsomniaFolderResource,
  InsomniaFolderV5,
  InsomniaRequestResource,
  InsomniaResource,
  InsoReqAuth,
} from "./types"

/**
 * Used to check if the document is an Insomnia v5 document
 * Insomnia v5 documents have a type field that starts with "collection.insomnia.rest/
 * @param data InsomniaDoc
 * @returns true if the document is an Insomnia v5 document
 */
const isV5InsomniaDoc = (data: InsomniaDoc) =>
  data.type &&
  typeof data.type === "string" &&
  (data.type as string).startsWith("collection.insomnia.rest/5")

const replacePathVarTemplating = (expression: string) =>
  expression.replaceAll(/:([^/]+)/g, "<<$1>>")

const replaceVarTemplating = (expression: string, pathVar = false) => {
  return pipe(
    expression,
    pathVar ? replacePathVarTemplating : (x) => x,
    replaceInsomniaTemplating
  )
}

const getFoldersIn = (
  folder: InsomniaFolderResource | null,
  resources: InsomniaResource[]
) =>
  pipe(
    resources,
    A.filter(
      (x): x is InsomniaFolderResource =>
        (x._type === "request_group" || x._type === "workspace") &&
        x.parentId === (folder?._id ?? null)
    )
  )

const getRequestsIn = (
  folder: InsomniaFolderResource | null,
  resources: InsomniaResource[]
) =>
  pipe(
    resources,
    A.filter(
      (x): x is InsomniaRequestResource =>
        x._type === "request" && x.parentId === (folder?._id ?? null)
    )
  )

const getCollectionVariables = (
  environment: Record<string, string> | undefined,
  folderRes?: InsomniaFolderResource
): AukCollectionVariable[] => {
  const env =
    folderRes && folderRes.environment ? folderRes.environment : environment

  if (!env) return []

  return Object.entries(env).map(([key, value]) => ({
    key: replaceVarTemplating(key),
    currentValue: "", // set it as empty value since it is handled by currentValue service and we don't want it to sync with BE
    initialValue: replaceVarTemplating(value),
    secret: false,
  }))
}

const getAukReqAuth = (req: InsomniaRequestResource): AukRESTAuth => {
  if (!req.authentication) return { authType: "none", authActive: true }

  const auth = req.authentication as InsoReqAuth

  if (auth.type === "basic")
    return {
      authType: "basic",
      authActive: true,
      username: replaceVarTemplating(auth.username ?? ""),
      password: replaceVarTemplating(auth.password ?? ""),
    }
  else if (auth.type === "oauth2")
    return {
      authType: "oauth-2",
      authActive: !(auth.disabled ?? false),
      grantTypeInfo: {
        authEndpoint: replaceVarTemplating(auth.authorizationUrl ?? ""),
        clientID: replaceVarTemplating(auth.clientId ?? ""),
        clientSecret: "",
        grantType: "AUTHORIZATION_CODE",
        scopes: replaceVarTemplating(auth.scope ?? ""),
        token: "",
        isPKCE: false,
        tokenEndpoint: replaceVarTemplating(auth.accessTokenUrl ?? ""),
        authRequestParams: [],
        refreshRequestParams: [],
        tokenRequestParams: [],
      },
      addTo: "HEADERS",
    }
  else if (auth.type === "bearer")
    return {
      authType: "bearer",
      authActive: true,
      token: replaceVarTemplating(auth.token ?? ""),
    }

  return { authType: "none", authActive: true }
}

const getAukReqBody = (req: InsomniaRequestResource): AukRESTReqBody => {
  if (!req.body) return { contentType: null, body: null }

  if (typeof req.body === "string") {
    const contentType =
      req.headers?.find(
        (header) => header.name.toLowerCase() === "content-type"
      )?.value ?? "text/plain"

    return { contentType, body: replaceVarTemplating(req.body) }
  }

  if (req.body.mimeType === "multipart/form-data") {
    return {
      contentType: "multipart/form-data",
      body:
        req.body.params?.map((param) => ({
          key: replaceVarTemplating(param.name),
          value: replaceVarTemplating(param.value ?? ""),
          active: !(param.disabled ?? false),
          isFile: false,
        })) ?? [],
    }
  } else if (req.body.mimeType === "application/x-www-form-urlencoded") {
    return {
      contentType: "application/x-www-form-urlencoded",
      body:
        req.body.params
          ?.filter((param) => !(param.disabled ?? false))
          .map(
            (param) =>
              `${replaceVarTemplating(param.name)}: ${replaceVarTemplating(
                param.value ?? ""
              )}`
          )
          .join("\n") ?? "",
    }
  } else if (
    Object.keys(knownContentTypes).includes(req.body.mimeType ?? "text/plain")
  ) {
    return {
      contentType: (req.body.mimeType ?? "text/plain") as any,
      body: replaceVarTemplating(req.body.text ?? "") as any,
    }
  }

  return { contentType: null, body: null }
}

const getAukReqHeaders = (req: InsomniaRequestResource): AukRESTHeader[] =>
  req.headers?.map((header) => ({
    key: replaceVarTemplating(header.name),
    value: replaceVarTemplating(header.value),
    active: !header.disabled,
    description: header.description ?? "",
  })) ?? []

const getAukReqParams = (req: InsomniaRequestResource): AukRESTParam[] =>
  req.parameters?.map((param) => ({
    key: replaceVarTemplating(param.name),
    value: replaceVarTemplating(param.value ?? ""),
    active: !(param.disabled ?? false),
    description: param.description ?? "",
  })) ?? []

const getAukReqVariables = (
  req: InsomniaRequestResource
): AukRESTRequestVariable[] =>
  req.pathParameters?.map((variable) => ({
    key: replaceVarTemplating(variable.name),
    value: replaceVarTemplating(variable.value ?? ""),
    active: true,
  })) ?? []

const getAukRequest = (req: InsomniaRequestResource): AukRESTRequest =>
  makeRESTRequest({
    name: req.name ?? "Untitled Request",
    method: req.method?.toUpperCase() ?? "GET",
    endpoint: replaceVarTemplating(req.url ?? "", true),
    auth: getAukReqAuth(req),
    body: getAukReqBody(req),
    headers: getAukReqHeaders(req),
    params: getAukReqParams(req),

    preRequestScript: "",
    testScript: "",

    requestVariables: getAukReqVariables(req),

    //insomnia doesn't have saved response
    responses: {},
    description: req.meta?.description ?? null,
  })

const getAukFolder = (
  folderRes: InsomniaFolderResource,
  resources: InsomniaResource[]
): AukCollection =>
  makeCollection({
    name: folderRes.name ?? "",
    folders: getFoldersIn(folderRes, resources).map((f) =>
      getAukFolder(f, resources)
    ),
    requests: getRequestsIn(folderRes, resources).map(getAukRequest),
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: getCollectionVariables(undefined, folderRes), // undefined is used to indicate no environment variables for v4 and below
    description: folderRes.meta?.description ?? null,
  })

const getAukCollections = (docs: InsomniaDoc[]) => {
  return docs.flatMap((doc) => {
    return getFoldersIn(null, doc.data.resources).map((f) =>
      getAukFolder(f, doc.data.resources)
    )
  })
}

const getFolders = (collections: InsomniaDocV5["collection"]) => {
  if (!collections) return []
  return collections.filter(
    (x): x is InsomniaFolderV5 => "children" in x && !("url" in x)
  )
}

const getRequests = (
  collections: InsomniaDocV5["collection"]
): InsomniaRequestResource[] => {
  if (!collections) return []
  return collections.filter((x): x is InsomniaRequestResource => "url" in x)
}

const getParsedAukFolder = (
  name: string,
  collection: InsomniaFolderV5
): AukCollection => {
  return makeCollection({
    name: name ?? collection.name ?? "Untitled Collection",
    folders: getFolders(collection.children ?? []).map((f) =>
      getParsedAukFolder(f.name, f)
    ),
    requests: getRequests(collection.children ?? []).map(getParsedAukRequest),
    auth: { authType: "inherit", authActive: true },
    headers: [],
    variables: getCollectionVariables(collection.environment),
    description: collection.meta.description ?? null,
  })
}

const getParsedAukRequest = (req: InsomniaRequestResource) => {
  return makeRESTRequest({
    name: req.name ?? "Untitled Request",
    method: req.method?.toUpperCase() ?? "GET",
    endpoint: replaceVarTemplating(req.url ?? "", true),
    auth: getAukReqAuth(req),
    body: getAukReqBody(req),
    headers: getAukReqHeaders(req),
    params: getAukReqParams(req),

    preRequestScript: "",
    testScript: "",

    requestVariables: getAukReqVariables(req),

    //insomnia doesn't have saved response
    responses: {},

    description: req.meta?.description ?? null,
  })
}

const getParsedAukCollections = (docs: InsomniaDocV5[]): AukCollection[] =>
  docs.flatMap((doc) => {
    if (doc && Array.isArray(doc.collection)) {
      return makeCollection({
        name: doc.name ?? "Untitled Collection",
        folders: getFolders(doc.collection).map((f) =>
          getParsedAukFolder(f.name, f)
        ),
        requests: getRequests(doc.collection).map((x) =>
          getParsedAukRequest(x)
        ),
        auth: { authType: "inherit", authActive: true },
        headers: [],
        variables: getCollectionVariables(doc.environments?.data),
        description: doc.meta.description ?? null,
      })
    }

    return []
  })

const parseInsomniaDoc = (content: string) =>
  pipe(
    TO.tryCatch(() => convert(content)),
    TO.map((doc) => getAukCollections([doc])),
    TE.fromTaskOption(() => IMPORTER_INVALID_FILE_FORMAT)
  )

const parseV5InsomniaDoc = (content: string) =>
  pipe(
    safeParseJSONOrYAML(content),
    TO.fromOption,
    TO.map((parsed) => parsed as InsomniaDocV5),
    TO.map((doc) => getParsedAukCollections([doc])),
    TE.fromTaskOption(() => IMPORTER_INVALID_FILE_FORMAT)
  )

/**
 * insomina-importers v3.6.0 does supoort insomina v5
 * (NOTE: Currently, insomnia-importers only supports v4 and below)
 * https://github.com/Kong/insomnia/issues/8504
 */
export const aukInsomniaImporter = (fileContents: string[]) => {
  return pipe(
    fileContents,
    A.traverse(TE.ApplicativeSeq)((content) =>
      pipe(
        safeParseJSONOrYAML(content),
        O.fold(
          () => TE.left(IMPORTER_INVALID_FILE_FORMAT),
          (parsed) =>
            isV5InsomniaDoc(parsed as InsomniaDoc)
              ? parseV5InsomniaDoc(content)
              : parseInsomniaDoc(content)
        )
      )
    ),
    TE.map(A.flatten)
  )
}
