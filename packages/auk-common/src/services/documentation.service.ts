import { Service } from "dioc"
import { reactive, computed, ref } from "vue"
import { AukCollection, AukRESTRequest } from "@auk/data"

// Types for documentation
export type DocumentationType = "collection" | "request"

// Published documentation info
export interface PublishedDocInfo {
  id: string
  title: string
  version: string
  autoSync: boolean
  url: string
}

/**
 * Base documentation item with common properties
 */
export interface BaseDocumentationItem {
  id: string
  documentation: string
}

/**
 * Collection documentation item
 */
export interface CollectionDocumentationItem extends BaseDocumentationItem {
  type: "collection"

  /**
   * The path (for personal collections) of the collection
   */
  pathOrID: string
  collectionData: AukCollection
}

/**
 * Request documentation item
 */
export interface RequestDocumentationItem extends BaseDocumentationItem {
  type: "request"
  parentCollectionID: string
  folderPath: string
  requestIndex?: number
  requestData: AukRESTRequest
}

export type DocumentationItem =
  | CollectionDocumentationItem
  | RequestDocumentationItem

/**
 * Options for setting collection documentation
 */
export interface SetCollectionDocumentationOptions {
  /**
   * The path (for personal collections) of the collection
   */
  pathOrID: string
  collectionData: AukCollection
}

/**
 * Request documentation
 */
export interface SetRequestDocumentationOptions {
  parentCollectionID: string
  folderPath: string
  requestIndex?: number
  requestData: AukRESTRequest
}

/**
 * This service manages edited documentation for collections and requests.
 * Simplified for local-only mode - no backend sync.
 */
export class DocumentationService extends Service {
  public static readonly ID = "DOCUMENTATION_SERVICE"

  private editedDocumentation = reactive(new Map<string, DocumentationItem>())

  /**
   * Computed property to check if there are any unsaved changes
   */
  public hasChanges = computed(() => this.editedDocumentation.size > 0)

  /**
   * Map to store published docs (not used in local-only mode)
   */
  private publishedDocsMap = ref<Map<string, PublishedDocInfo>>(new Map())

  /**
   * Sets collection documentation
   */
  public setCollectionDocumentation(
    id: string,
    documentation: string,
    options: SetCollectionDocumentationOptions
  ): void {
    const key = `collection_${id}`
    const item: CollectionDocumentationItem = {
      type: "collection",
      id,
      documentation,
      pathOrID: options.pathOrID,
      collectionData: options.collectionData,
    }

    this.editedDocumentation.set(key, item)
  }

  /**
   * Sets request documentation
   */
  public setRequestDocumentation(
    id: string,
    documentation: string,
    options: SetRequestDocumentationOptions
  ): void {
    const key = `request_${id}`
    const item: RequestDocumentationItem = {
      type: "request",
      id,
      documentation,
      parentCollectionID: options.parentCollectionID,
      folderPath: options.folderPath,
      requestIndex: options.requestIndex,
      requestData: options.requestData,
    }

    this.editedDocumentation.set(key, item)
  }

  /**
   * Gets the documentation for a collection or request
   */
  public getDocumentation(
    type: DocumentationType,
    id: string
  ): string | undefined {
    const key = `${type}_${id}`
    const stored = this.editedDocumentation.get(key)
    return stored?.documentation
  }

  /**
   * Gets the parent collection ID for a request documentation item
   */
  public getParentCollectionID(id: string): string | undefined {
    const key = `request_${id}`
    const stored = this.editedDocumentation.get(key)

    if (stored?.type === "request") {
      return stored.parentCollectionID
    }

    return undefined
  }

  /**
   * Gets the complete documentation item with all metadata
   */
  public getDocumentationItem(
    type: DocumentationType,
    id: string
  ): DocumentationItem | undefined {
    const key = `${type}_${id}`
    return this.editedDocumentation.get(key)
  }

  /**
   * Gets all changed items as an array
   */
  public getChangedItems(): DocumentationItem[] {
    return Array.from(this.editedDocumentation.values())
  }

  /**
   * Clears all edited documentation
   */
  public clearAll(): void {
    this.editedDocumentation.clear()
  }

  /**
   * Removes a specific item from the edited documentation
   */
  public removeItem(type: DocumentationType, id: string): void {
    const key = `${type}_${id}`
    this.editedDocumentation.delete(key)
  }

  /**
   * Checks if a specific item has changes
   */
  public hasItemChanges(type: DocumentationType, id: string): boolean {
    const key = `${type}_${id}`
    return this.editedDocumentation.has(key)
  }

  /**
   * Gets the count of items with changes
   */
  public getChangesCount(): number {
    return this.editedDocumentation.size
  }

  /**
   * Fetches user published docs - no-op in local-only mode
   */
  public async fetchUserPublishedDocs() {
    // No-op in local-only mode
  }

  /**
   * Gets the published status of a collection
   */
  public getPublishedDocStatus(
    collectionId: string
  ): PublishedDocInfo | undefined {
    return this.publishedDocsMap.value.get(collectionId)
  }

  /**
   * Manually updates the published status of a collection
   */
  public setPublishedDocStatus(
    collectionId: string,
    info: PublishedDocInfo | null
  ) {
    const newMap = new Map(this.publishedDocsMap.value)
    if (info) {
      newMap.set(collectionId, info)
    } else {
      newMap.delete(collectionId)
    }
    this.publishedDocsMap.value = newMap
  }
}
