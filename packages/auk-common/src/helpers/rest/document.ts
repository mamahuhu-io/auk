import {
  AukCollection,
  AukRESTRequest,
  AukRESTRequestResponse,
} from "@auk/data"
import { RESTOptionTabs } from "~/components/http/RequestOptions.vue"
import { AukInheritedProperty } from "../types/AukInheritedProperties"
import { AukRESTResponse } from "../types/AukRESTResponse"
import { AukTestResult } from "../types/AukTestResult"
import { TestRunnerRequest } from "~/services/test-runner/test-runner.service"

export type AukRESTSaveContext = {
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
  requestIndex?: number
  /**
   * ID of the example response
   */
  exampleID?: string
  /**
   * Reference ID of the request, if available
   */
  requestRefID?: string
} | null

/**
 * Defines a live 'document' (something that is open and being edited) in the app
 */

export type AukCollectionSaveContext = {
  /**
   * The origin source of the request
   */
  originLocation: "user-collection"
  /**
   * Path to the request folder
   */
  folderPath: string
} | null

export type TestRunnerConfig = {
  iterations: number
  delay: number
  stopOnError: boolean
  persistResponses: boolean
  keepVariableValues: boolean
}

export type AukTestRunnerDocument = {
  /**
   * The document type
   */
  type: "test-runner"

  /**
   * The test runner configuration
   */
  config: TestRunnerConfig

  /**
   * initiate test runner on tab open
   */
  status: "idle" | "running" | "stopped" | "error"

  /**
   * The collection as it is in the document
   */
  collection: AukCollection

  /**
   * The type of the collection
   */
  collectionType: "my-collections"

  /**
   * Collection ID for this document
   * (_ref_id will be used as collectionID for personal collections)
   */
  collectionID: string

  /**
   * Selected request id
   * (if any)
   */
  selectedRequestPath?: string

  /**
   * The request as it is in the document
   */
  resultCollection?: AukCollection

  /**
   * The test runner meta information
   */
  testRunnerMeta: {
    totalRequests: number
    completedRequests: number
    totalTests: number
    passedTests: number
    failedTests: number
    totalTime: number
  }

  /**
   * Selected test runner request
   */
  request: TestRunnerRequest | null

  /**
   * The response of the selected request in collections after running the test
   * (if any)
   */
  response?: AukRESTResponse | null

  /**
   * The test results of the selected request in collections after running the test
   * (if any)
   */
  testResults?: AukTestResult | null

  /**
   * Whether the request has any unsaved changes
   * (atleast as far as we can say)
   */
  isDirty: boolean

  /**
   * The inherited properties from the parent collection also the collection itself
   * (if any)
   */
  inheritedProperties?: AukInheritedProperty
}

export type AukRequestDocument = {
  /**
   * The document type
   */
  type: "request"

  /**
   * The request as it is in the document
   */
  request: AukRESTRequest

  /**
   * Whether the request has any unsaved changes
   * (atleast as far as we can say)
   */
  isDirty: boolean

  /**
   * Info about where this request should be saved.
   * This contains where the request is originated from basically.
   */
  saveContext?: AukRESTSaveContext

  /**
   * The response as it is in the document
   * (if any)
   */
  response?: AukRESTResponse | null

  /**
   * The test results as it is in the document
   * (if any)
   */
  testResults?: AukTestResult | null

  /**
   * Response tab preference for the current tab's document
   */
  responseTabPreference?: string

  /**
   * Options tab preference for the current tab's document
   */
  optionTabPreference?: RESTOptionTabs

  /**
   * The inherited properties from the parent collection
   * (if any)
   */
  inheritedProperties?: AukInheritedProperty

  /**
   * The function responsible for cancelling the tab request call
   */
  cancelFunction?: () => void
}

export type AukSavedExampleDocument = {
  /**
   * The type of the document
   */
  type: "example-response"

  /**
   * The response as it is in the document
   */
  response: AukRESTRequestResponse

  /**
   * Info about where this response should be saved.
   * This contains where the response is originated from basically.
   */
  saveContext?: AukRESTSaveContext

  /**
   * Whether the response has any unsaved changes
   * (atleast as far as we can say)
   */
  isDirty: boolean

  /**
   * The inherited properties from the parent collection
   * (if any)
   */
  inheritedProperties?: AukInheritedProperty
}

/**
 * Defines a live 'document' (something that is open and being edited) in the app
 */
export type AukTabDocument =
  | AukSavedExampleDocument
  | AukRequestDocument
  | AukTestRunnerDocument
