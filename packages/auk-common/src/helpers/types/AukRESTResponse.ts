import { AukRESTRequest } from "@auk/data"
import { Component } from "vue"
import { KernelInterceptorError } from "~/services/kernel-interceptor.service"

export type AukRESTResponseHeader = { key: string; value: string }

export type AukRESTSuccessResponse = {
  type: "success"
  headers: AukRESTResponseHeader[]
  body: ArrayBuffer
  statusCode: number
  statusText: string
  meta: {
    responseSize: number // in bytes
    responseDuration: number // in millis
  }
  req: AukRESTRequest
}

export type AukRESTFailureResponse = {
  type: "failure"
  headers: AukRESTResponseHeader[]
  body: ArrayBuffer
  statusCode: number
  statusText: string
  meta: {
    responseSize: number // in bytes
    responseDuration: number // in millis
  }
  req: AukRESTRequest
}

export type AukRESTFailureNetwork = {
  type: "network_fail"
  error: unknown
  req: AukRESTRequest
}

export type AukRESTFailureScript = {
  type: "script_fail"
  error: Error
}

export type AukRESTErrorExtension = {
  type: "extension_error"
  error: string
  component: Component
  req: AukRESTRequest
}

export type AukRESTErrorInterceptor = {
  type: "interceptor_error"
  error: KernelInterceptorError
  req: AukRESTRequest
}

export type AukRESTLoadingResponse = {
  type: "loading"
  req: AukRESTRequest
}

export type AukRESTResponse =
  | AukRESTLoadingResponse
  | AukRESTSuccessResponse
  | AukRESTFailureResponse
  | AukRESTFailureNetwork
  | AukRESTFailureScript
  | AukRESTFailureExtension
  | AukRESTFailureInterceptor
