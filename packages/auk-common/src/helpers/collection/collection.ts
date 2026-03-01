import { AukCollection, AukRESTAuth, AukRESTHeaders } from "@auk/data"
import { getAffectedIndexes } from "./affectedIndex"
import { getService } from "~/modules/dioc"
import { RESTTabService } from "~/services/tab/rest"
import { GQLTabService } from "~/services/tab/graphql"
import { cascadeParentCollectionForProperties } from "~/store/collections"

// Type definitions for local-only mode
export interface CollectionDataProps {
  auth: AukRESTAuth
  headers: AukRESTHeaders
  variables: AukCollection["variables"]
  description: string | null
}

export interface CollectionFolder {
  id?: string
  name: string
  folders: CollectionFolder[]
  requests: AukCollection["requests"]
  data: string
}

/**
 * Resolve save context on reorder
 */
export function resolveSaveContextOnCollectionReorder(
  payload: {
    lastIndex: number
    newIndex: number
    folderPath: string
    length?: number // better way to do this? now it could be undefined
  },
  type: "remove" | "drop" = "remove"
) {
  const { lastIndex, folderPath, length } = payload
  let { newIndex } = payload

  if (newIndex > lastIndex) newIndex-- // there is a issue when going down? better way to resolve this?
  if (lastIndex === newIndex) return

  const affectedIndexes = getAffectedIndexes(
    lastIndex,
    newIndex === -1 ? length! : newIndex
  )

  if (newIndex === -1) {
    // if (newIndex === -1) remove it from the map because it will be deleted
    affectedIndexes.delete(lastIndex)
    // when collection deleted opened requests from that collection be affected
    if (type === "remove") {
      resetSaveContextForAffectedRequests(
        folderPath ? `${folderPath}/${lastIndex}` : lastIndex.toString()
      )
    }
  }

  // add folder path as prefix to the affected indexes
  const affectedPaths = new Map<string, string>()
  for (const [key, value] of affectedIndexes) {
    if (folderPath) {
      affectedPaths.set(`${folderPath}/${key}`, `${folderPath}/${value}`)
    } else {
      affectedPaths.set(key.toString(), value.toString())
    }
  }

  const tabService = getService(RESTTabService)

  const tabs = tabService.getTabsRefTo((tab) => {
    if (tab.document.type === "test-runner") return false
    return (
      tab.document.saveContext?.originLocation === "user-collection" &&
      affectedPaths.has(tab.document.saveContext.folderPath)
    )
  })

  for (const tab of tabs) {
    if (
      tab.value.document.type !== "test-runner" &&
      tab.value.document.saveContext?.originLocation === "user-collection"
    ) {
      const newPath = affectedPaths.get(
        tab.value.document.saveContext.folderPath
      )!
      tab.value.document.saveContext.folderPath = newPath
    }
  }
}

/**
 * Returns the last folder path from the given path.
 *  * @param path Path can be folder path or collection path
 * @returns Get the last folder path from the given path
 */
const getLastParentFolderPath = (path?: string) => {
  if (!path) return ""
  const pathArray = path.split("/")
  return pathArray[pathArray.length - 1] ?? ""
}

/**
 * Resolve save context for affected requests on drop folder
 * @param oldFolderPath Old folder path
 * @param newFolderPath New folder path
 */
export function updateSaveContextForAffectedRequests(
  oldFolderPath: string,
  newFolderPath: string | null
) {
  const tabService = getService(RESTTabService)
  const tabs = tabService.getTabsRefTo((tab) => {
    if (tab.document.type === "test-runner") return false

    return tab.document.saveContext?.originLocation === "user-collection"
      ? tab.document.saveContext.folderPath.startsWith(oldFolderPath)
      : false
  })

  for (const tab of tabs) {
    if (tab.value.document.type === "test-runner") return

    if (
      tab.value.document.saveContext?.originLocation === "user-collection" &&
      newFolderPath
    ) {
      tab.value.document.saveContext = {
        ...tab.value.document.saveContext,
        folderPath: tab.value.document.saveContext.folderPath.replace(
          oldFolderPath,
          newFolderPath
        ),
      }
    }
  }
}

export function updateInheritedPropertiesForAffectedRequests(
  path: string,
  type: "rest" | "graphql"
) {
  const tabService =
    type === "rest" ? getService(RESTTabService) : getService(GQLTabService)

  const effectedTabs = tabService.getTabsRefTo((tab) => {
    if ("type" in tab.document && tab.document.type === "test-runner")
      return false
    const saveContext = tab.document.saveContext

    const saveContextPath = saveContext?.folderPath

    return (
      (saveContextPath?.startsWith(path) ||
        getLastParentFolderPath(saveContextPath) ===
          getLastParentFolderPath(path)) ??
      false
    )
  })

  effectedTabs.forEach((tab) => {
    if (
      "type" in tab.value.document &&
      tab.value.document.type === "test-runner"
    )
      return
    if (!("inheritedProperties" in tab.value.document)) return

    if (
      tab.value.document.saveContext?.originLocation === "user-collection" &&
      tab.value.document.inheritedProperties
    ) {
      tab.value.document.inheritedProperties =
        cascadeParentCollectionForProperties(
          tab.value.document.saveContext.folderPath,
          type
        )
    }
  })
}

function resetSaveContextForAffectedRequests(folderPath: string) {
  const tabService = getService(RESTTabService)
  const tabs = tabService.getTabsRefTo((tab) => {
    if (tab.document.type === "test-runner") return false
    return (
      tab.document.saveContext?.originLocation === "user-collection" &&
      tab.document.saveContext.folderPath.startsWith(folderPath)
    )
  })

  for (const tab of tabs) {
    if (tab.value.document.type === "test-runner") return
    tab.value.document.saveContext = null
    tab.value.document.isDirty = true

    if (tab.value.document.type === "request") {
      // since the request is deleted, we need to remove the saved responses as well
      tab.value.document.request.responses = {}

      // remove inherited properties
      tab.value.document.inheritedProperties = undefined
    }
  }
}

export function getFoldersByPath(
  collections: AukCollection[],
  path: string
): AukCollection[] {
  if (!path) return collections

  // path will be like this "0/0/1" these are the indexes of the folders
  const pathArray = path.split("/").map((index) => parseInt(index))
  let currentCollection = collections[pathArray[0]]

  if (pathArray.length === 1) {
    return currentCollection.folders
  }

  for (let i = 1; i < pathArray.length; i++) {
    const folder = currentCollection.folders[pathArray[i]]
    if (folder) currentCollection = folder
  }

  return currentCollection.folders
}

/**
 * Transforms a collection to the format expected by collections.
 * @param collection The collection to transform
 * @returns The transformed collection
 */
export function transformCollectionForImport(
  collection: AukCollection
): CollectionFolder {
  const folders = (collection.folders ?? []).map(transformCollectionForImport)

  const data: CollectionDataProps = {
    auth: collection.auth,
    headers: collection.headers,
    variables: collection.variables,
    description: collection.description,
  }

  const obj: CollectionFolder = {
    name: collection.name,
    folders: folders,
    requests: collection.requests,
    data: JSON.stringify(data),
  }

  if (collection.id) obj.id = collection.id

  return obj
}
