/**
 * GQLClient Stub - Local Mode Only
 *
 * This module provides stub implementations for GraphQL client functions.
 * In local mode, these functions are not used, but they need to exist
 * to satisfy imports from platform files that haven't been converted yet.
 */

import * as E from "fp-ts/Either"
import * as TE from "fp-ts/TaskEither"
import { BehaviorSubject, Observable } from "rxjs"

/**
 * GQLError type for compatibility
 */
export type GQLError<T extends string> = {
  type: "network_error" | "gql_error"
  error: Error | T
}

/**
 * Stub for runGQLQuery - always returns an error in local mode
 */
export function runGQLQuery<
  DocType,
  DocVarType,
  DocErrorType extends string = "",
>(_args: {
  query: unknown
  variables: DocVarType
}): Promise<E.Either<GQLError<DocErrorType>, DocType>> {
  return Promise.resolve(
    E.left({
      type: "network_error",
      error: new Error("GraphQL queries are not available in local mode"),
    })
  )
}

/**
 * Stub for runMutation - always returns an error in local mode
 */
export function runMutation<
  DocType,
  DocVarType,
  DocErrorType extends string = "",
>(
  _mutation: unknown,
  _variables: DocVarType,
  _additionalConfig?: {
    fetchPolicy?: string
  }
): TE.TaskEither<GQLError<DocErrorType>, DocType> {
  return TE.left({
    type: "network_error",
    error: new Error("GraphQL mutations are not available in local mode"),
  })
}

/**
 * Stub for runGQLSubscription - returns empty observable in local mode
 */
export function runGQLSubscription<
  DocType,
  DocVarType,
  DocErrorType extends string = "",
>(_args: {
  query: unknown
  variables: DocVarType
}): [
  Observable<E.Either<GQLError<DocErrorType>, DocType>>,
  { unsubscribe: () => void },
] {
  const subject = new BehaviorSubject<
    E.Either<GQLError<DocErrorType>, DocType>
  >(
    E.left({
      type: "network_error",
      error: new Error("GraphQL subscriptions are not available in local mode"),
    })
  )

  return [subject.asObservable(), { unsubscribe: () => subject.complete() }]
}

/**
 * Stub for runAuthOnlyGQLSubscription - same as runGQLSubscription
 */
export function runAuthOnlyGQLSubscription<
  DocType,
  DocVarType,
  DocErrorType extends string = "",
>(args: {
  query: unknown
  variables: DocVarType
}): [
  Observable<E.Either<GQLError<DocErrorType>, DocType>>,
  { unsubscribe: () => void },
] {
  return runGQLSubscription(args)
}
