import { defineVersion, entityReference, entityRefUptoVersion } from "verzod"
import { z } from "zod"
import { AukRESTRequest } from "../../rest"
import { AukGQLRequest } from "../../graphql"
import { AukCollection } from ".."

const baseCollectionSchema = z.object({
  v: z.literal(1),

  name: z.string(),
  requests: z.array(
    z.lazy(() =>
      z.union([
        entityReference(AukRESTRequest),
        entityReference(AukGQLRequest),
      ])
    )
  ),
})

type Input = z.input<typeof baseCollectionSchema> & {
  folders: Input[]
}

type Output = z.output<typeof baseCollectionSchema> & {
  folders: Output[]
}

export const V1_SCHEMA = baseCollectionSchema.extend({
  folders: z.lazy(() => z.array(entityRefUptoVersion(AukCollection, 1))),
}) as z.ZodType<Output, z.ZodTypeDef, Input>

export default defineVersion({
  initial: true,
  schema: V1_SCHEMA,
})
