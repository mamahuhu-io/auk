import { AukCollection } from "@auk/data"
import { stripRefIdReplacer } from "."

export const myCollectionsExporter = (myCollections: AukCollection[]) => {
  return JSON.stringify(myCollections, stripRefIdReplacer, 2)
}
