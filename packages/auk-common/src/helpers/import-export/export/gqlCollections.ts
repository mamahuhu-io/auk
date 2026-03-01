import { AukCollection } from "@auk/data"
import { stripRefIdReplacer } from "."

export const gqlCollectionsExporter = (gqlCollections: AukCollection[]) => {
  return JSON.stringify(gqlCollections, stripRefIdReplacer, 2)
}
