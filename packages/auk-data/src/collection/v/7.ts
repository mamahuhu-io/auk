import { defineVersion, entityRefUptoVersion } from "verzod"
import { z } from "zod"

import { AukGQLAuth } from "../../graphql/v/8"
import { AukRESTAuth } from "../../rest/v/12/auth"

import { V6_SCHEMA, v6_baseCollectionSchema } from "./6"
import { AukCollection } from ".."

export const v7_baseCollectionSchema = v6_baseCollectionSchema.extend({
  v: z.literal(7),
  auth: z.union([AukRESTAuth, AukGQLAuth]),
})

type Input = z.input<typeof v7_baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof v7_baseCollectionSchema> & {
  folders: Output[]
}

export const V7_SCHEMA = v7_baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(AukCollection, 7))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: false,
  schema: V7_SCHEMA,
  up(old: z.infer<typeof V6_SCHEMA>) {
    const result: z.infer<typeof V7_SCHEMA> = {
      ...old,
      v: 7 as const,
      folders: old.folders.map((folder) => {
        const result = AukCollection.safeParseUpToVersion(folder, 7)

        if (result.type !== "ok") {
          throw new Error("Failed to migrate child collections")
        }

        return result.value
      }),
    }

    return result
  },
})
