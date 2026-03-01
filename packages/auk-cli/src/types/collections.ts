import { AukCollection } from "@auk/data";
import { AukEnvPair, AukEnvs } from "./request";

export type CollectionRunnerParam = {
  collections: AukCollection[];
  envs: AukEnvs;
  delay?: number;
  iterationData?: IterationDataItem[][];
  iterationCount?: number;
  legacySandbox: boolean;
};

export type AukCollectionFileExt = "json";

// Indicates the shape each iteration data entry gets transformed into
export type IterationDataItem = Extract<AukEnvPair, { value: string }>;
