import {
  GQLHeader,
  AukGQLAuth,
  AukRESTHeader,
  AukRESTAuth,
  AukCollectionVariable,
} from "@auk/data"

export type AukInheritedProperty = {
  auth: {
    parentID: string
    parentName: string
    inheritedAuth: AukRESTAuth | AukGQLAuth
  }
  headers: {
    parentID: string
    parentName: string
    inheritedHeader: AukRESTHeader | GQLHeader
  }[]
  variables: {
    parentPath?: string
    parentID: string
    parentName: string
    inheritedVariables: AukCollectionVariable[]
  }[]
}
