import { AukRESTRequest } from "@auk/data"

/**
 * We use the save context to figure out
 * how a loaded request is to be saved.
 * These will be set when the request is loaded
 * into the request session
 */
export type AukRequestSaveContext = {
  /**
   * The origin source of the request
   */
  originLocation: "user-collection"
  /**
   * Path to the request folder
   */
  folderPath: string
  /**
   * Index to the request
   */
  requestIndex: number
  /**
   * Current request
   */
  req?: AukRESTRequest
  /**
   * Reference ID of the request, if available
   */
  requestRefID?: string
}
