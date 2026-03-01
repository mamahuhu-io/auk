import { Environment, AukCollection, AukRESTRequest } from "@auk/data";
import fs from "fs/promises";
import { entityReference } from "verzod";
import { z } from "zod";

import { error } from "../types/errors";
import { FormDataEntry } from "../types/request";
import { isAukErrnoException } from "./checks";
import { getResourceContents } from "./getters";

const getValidRequests = (
  collections: AukCollection[],
  collectionFilePath: string
) => {
  return collections.map((collection) => {
    // Validate requests using zod schema
    const requestSchemaParsedResult = z
      .array(entityReference(AukRESTRequest))
      .safeParse(collection.requests);

    // Handle validation errors
    if (!requestSchemaParsedResult.success) {
      throw error({
        code: "MALFORMED_COLLECTION",
        path: collectionFilePath,
        data: "Please check the collection data.",
      });
    }

    // Recursively validate requests in nested folders
    if (collection.folders.length > 0) {
      collection.folders = getValidRequests(
        collection.folders,
        collectionFilePath
      );
    }

    // Return validated collection
    return {
      ...collection,
      requests: requestSchemaParsedResult.data,
    };
  });
};

/**
 * Parses array of FormDataEntry to FormData.
 * @param values Array of FormDataEntry.
 * @returns FormData with key-value pair from FormDataEntry.
 */
export const toFormData = (values: FormDataEntry[]) => {
  const formData = new FormData();

  values.forEach(({ key, value, contentType }) => {
    if (contentType) {
      formData.append(
        key,
        new Blob([value], {
          type: contentType,
        }),
        key
      );

      return;
    }

    formData.append(key, value);
  });

  return formData;
};

/**
 * Parses provided error message to maintain auk-error messages.
 * @param e Custom error data.
 * @returns Parsed error message without extra spaces.
 */
export const parseErrorMessage = (e: unknown) => {
  let msg: string;
  if (isAukErrnoException(e)) {
    msg = e.message.replace(e.code! + ":", "").replace("error:", "");
  } else if (typeof e === "string") {
    msg = e;
  } else {
    msg = JSON.stringify(e);
  }
  return msg.replace(/\n+$|\s{2,}/g, "").trim();
};

/**
 * Reads a JSON file from the specified path and returns the parsed content.
 *
 * @param {string} path - The path to the JSON file.
 * @param {boolean} fileExistsInPath - Indicates whether the file exists in the specified path.
 * @returns {Promise<unknown>} A Promise that resolves to the parsed JSON contents.
 * @throws {Error} If the file path does not end with `.json`.
 * @throws {Error} If the file does not exist in the specified path.
 * @throws {Error} If an unknown error occurs while reading or parsing the file.
 */
export async function readJsonFile(
  path: string,
  fileExistsInPath: boolean
): Promise<unknown> {
  if (!path.endsWith(".json")) {
    throw error({ code: "INVALID_FILE_TYPE", data: path });
  }

  if (!fileExistsInPath) {
    throw error({ code: "FILE_NOT_FOUND", path });
  }

  try {
    return JSON.parse((await fs.readFile(path)).toString());
  } catch (e) {
    throw error({ code: "UNKNOWN_ERROR", data: e });
  }
}

/**
 * Parses collection data from a given path and returns data conforming to the latest version of the `AukCollection` schema.
 *
 * @param pathOrId Collection JSON file path.
 * @returns {Promise<AukCollection[]>} A promise that resolves to an array of AukCollection objects.
 * @throws Throws an error if the collection data is malformed.
 */
export async function parseCollectionData(
  pathOrId: string
): Promise<AukCollection[]> {
  const contents = await getResourceContents({
    pathOrId,
  });

  const maybeArrayOfCollections: unknown[] = Array.isArray(contents)
    ? contents
    : [contents];

  const collectionSchemaParsedResult = z
    .array(entityReference(AukCollection))
    .safeParse(maybeArrayOfCollections);

  if (!collectionSchemaParsedResult.success) {
    throw error({
      code: "MALFORMED_COLLECTION",
      path: pathOrId,
      data: "Please check the collection data.",
    });
  }

  return getValidRequests(collectionSchemaParsedResult.data, pathOrId);
}
