import {
  Environment,
  AukCollection,
  AukCollectionVariable,
  AukRESTRequest,
} from "@auk/data";
import { z } from "zod";

import { TestReport } from "../interfaces/response";
import { AukCLIError } from "./errors";

export type FormDataEntry = {
  key: string;
  value: string | Blob;
  contentType?: string;
};

export type AukEnvPair = Environment["variables"][number];

export const AukEnvKeyPairObject = z.record(z.string(), z.string());

export type AukEnvs = {
  global: AukEnvPair[];
  selected: AukEnvPair[];
};

export type CollectionQueue = {
  path: string;
  collection: AukCollection;
};

export type RequestReport = {
  path: string;
  tests: TestReport[];
  errors: AukCLIError[];
  result: boolean;
  duration: { test: number; request: number; preRequest: number };
};

export type ProcessRequestParams = {
  request: AukRESTRequest;
  envs: AukEnvs;
  path: string;
  delay: number;
  legacySandbox?: boolean;
  collectionVariables?: AukCollectionVariable[];
};
