import { AukCollection } from "@auk/data"
import * as E from "fp-ts/Either"

// TODO: add zod validation
export const aukGqlCollectionsImporter = (
  contents: string[]
): E.Either<"INVALID_JSON", AukCollection[]> => {
  return E.tryCatch(
    () => contents.flatMap((content) => JSON.parse(content)),
    () => "INVALID_JSON"
  )
}
