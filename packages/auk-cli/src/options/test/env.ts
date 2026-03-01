import { Environment, NonSecretEnvironment } from "@auk/data";
import { entityReference } from "verzod";
import { z } from "zod";

import { TestCmdEnvironmentOptions } from "../../types/commands";
import { error } from "../../types/errors";
import {
  AukEnvKeyPairObject,
  AukEnvPair,
  AukEnvs,
} from "../../types/request";
import { getResourceContents } from "../../utils/getters";

/**
 * Parses environment data from a given path and returns data conforming to the latest version of the `Environment` schema.
 *
 * @param {TestCmdEnvironmentOptions} options Supplied values for CLI flags.
 * @param {string} options.env Path of the environment `.json` file to be parsed.
 * @returns {Promise<AukEnvs>} A promise that resolves to the parsed environment object with global and selected environments.
 */
export async function parseEnvsData(options: TestCmdEnvironmentOptions) {
  const { env: pathOrId } = options;

  const contents = await getResourceContents({
    pathOrId,
  });

  const envPairs: Array<AukEnvPair | Record<string, string>> = [];

  // The legacy key-value pair format that is still supported
  const AukEnvKeyPairResult = AukEnvKeyPairObject.safeParse(contents);

  // Shape of the single environment export object that is exported from the app
  const AukEnvExportObjectResult = Environment.safeParse(contents);

  // Shape of the bulk environment export object that is exported from the app
  const AukBulkEnvExportObjectResult = z
    .array(entityReference(Environment))
    .safeParse(contents);

  // CLI doesnt support bulk environments export
  // Hence we check for this case and throw an error if it matches the format
  if (AukBulkEnvExportObjectResult.success) {
    throw error({ code: "BULK_ENV_FILE", path: pathOrId, data: error });
  }

  //  Checks if the environment file is of the correct format
  // If it doesnt match either of them, we throw an error
  if (
    !AukEnvKeyPairResult.success &&
    AukEnvExportObjectResult.type === "err"
  ) {
    throw error({ code: "MALFORMED_ENV_FILE", path: pathOrId, data: error });
  }

  if (AukEnvKeyPairResult.success) {
    for (const [key, value] of Object.entries(AukEnvKeyPairResult.data)) {
      envPairs.push({
        key,
        initialValue: value,
        currentValue: value,
        secret: false,
      });
    }
  } else if (AukEnvExportObjectResult.type === "ok") {
    // Original environment variables from the supplied export file
    const originalEnvVariables = (contents as Environment).variables;

    // Above environment variables conforming to the latest schema
    // `value` fields if specified will be omitted for secret environment variables
    const migratedEnvVariables = AukEnvExportObjectResult.value.variables;

    // The values supplied for secret environment variables have to be considered in the CLI
    // For each secret environment variable, include the value in case supplied
    const resolvedEnvVariables = migratedEnvVariables.map((variable, idx) => {
      if (variable.secret && originalEnvVariables[idx].initialValue) {
        return {
          ...variable,
          initialValue: originalEnvVariables[idx].initialValue,
        };
      }

      return variable;
    });

    envPairs.push(...resolvedEnvVariables);
  }

  return <AukEnvs>{ global: [], selected: envPairs };
}
