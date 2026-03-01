import fs from "fs/promises";
import { describe, expect, test, vi } from "vitest";

import { DEFAULT_DURATION_PRECISION } from "../../utils/constants";
import {
  getDurationInSeconds,
  getEffectiveFinalMetaData,
  getResolvedVariables,
  getResourceContents,
} from "../../utils/getters";
import * as mutators from "../../utils/mutators";

describe("getters", () => {
  describe("getDurationInSeconds", () => {
    const testDurations = [
      { end: [1, 111111111], precision: 1, expected: 1.1 },
      { end: [2, 333333333], precision: 2, expected: 2.33 },
      {
        end: [3, 555555555],
        precision: DEFAULT_DURATION_PRECISION,
        expected: 3.556,
      },
      { end: [4, 777777777], precision: 4, expected: 4.7778 },
    ];

    test.each(testDurations)(
      "($end.0 s + $end.1 ns) rounded-off to $expected",
      ({ end, precision, expected }) => {
        expect(getDurationInSeconds(end as [number, number], precision)).toBe(
          expected
        );
      }
    );
  });

  describe("getEffectiveFinalMetaData", () => {
    const environmentVariables = [
      {
        key: "PARAM",
        initialValue: "parsed_param",
        currentValue: "parsed_param",
        secret: false,
      },
    ];

    test("Empty list of meta-data", () => {
      expect(
        getEffectiveFinalMetaData([], environmentVariables)
      ).toSubsetEqualRight([]);
    });

    test("Non-empty active list of meta-data with unavailable ENV", () => {
      expect(
        getEffectiveFinalMetaData(
          [
            {
              active: true,
              key: "<<UNKNOWN_KEY>>",
              value: "<<UNKNOWN_VALUE>>",
              description: "",
            },
          ],
          environmentVariables
        )
      ).toSubsetEqualRight([{ active: true, key: "", value: "" }]);
    });

    test("Inactive list of meta-data", () => {
      expect(
        getEffectiveFinalMetaData(
          [{ active: false, key: "KEY", value: "<<PARAM>>", description: "" }],
          environmentVariables
        )
      ).toSubsetEqualRight([]);
    });

    test("Active list of meta-data", () => {
      expect(
        getEffectiveFinalMetaData(
          [{ active: true, key: "PARAM", value: "<<PARAM>>", description: "" }],
          environmentVariables
        )
      ).toSubsetEqualRight([
        { active: true, key: "PARAM", value: "parsed_param" },
      ]);
    });
  });

  describe("getResourceContents", () => {
    test("Reads from file system if the supplied file exists in the path", async () => {
      fs.access = vi.fn().mockResolvedValueOnce(undefined);

      const expected = { id: "valid-collection-id" };
      vi.spyOn(mutators, "readJsonFile").mockResolvedValueOnce(expected);

      const pathOrId = "valid-collection-file-path";
      const contents = await getResourceContents({ pathOrId });

      expect(fs.access).toHaveBeenCalledWith(pathOrId);
      expect(mutators.readJsonFile).toHaveBeenCalledWith(pathOrId, true);
      expect(contents).toEqual(expected);
    });

    test("Falls back to readJsonFile with missing-file state when path is invalid", async () => {
      fs.access = vi.fn().mockRejectedValueOnce(undefined);

      const expected = { code: "FILE_NOT_FOUND", path: "missing.json" };
      vi.spyOn(mutators, "readJsonFile").mockRejectedValueOnce(expected);

      await expect(
        getResourceContents({ pathOrId: "missing.json" })
      ).rejects.toEqual(expected);
      expect(mutators.readJsonFile).toHaveBeenCalledWith("missing.json", false);
    });
  });

  describe("getResolvedVariables", () => {
    const requestVariables = [
      {
        key: "SHARED_KEY_I",
        value: "request-variable-shared-value-I",
        active: true,
      },
      {
        key: "SHARED_KEY_II",
        value: "",
        active: true,
      },
      {
        key: "REQUEST_VAR_III",
        value: "request-variable-value-III",
        active: true,
      },
      {
        key: "REQUEST_VAR_IV",
        value: "request-variable-value-IV",
        active: false,
      },
      {
        key: "REQUEST_VAR_V",
        value: "request-variable-value-V",
        active: false,
      },
    ];

    const environmentVariables = [
      {
        key: "SHARED_KEY_I",
        initialValue: "environment-variable-shared-value-I",
        currentValue: "environment-variable-shared-value-I",
        secret: false,
      },
      {
        key: "SHARED_KEY_II",
        initialValue: "environment-variable-shared-value-II",
        currentValue: "environment-variable-shared-value-II",
        secret: false,
      },
      {
        key: "ENV_VAR_III",
        initialValue: "environment-variable-value-III",
        currentValue: "environment-variable-value-III",
        secret: false,
      },
      {
        key: "ENV_VAR_IV",
        initialValue: "environment-variable-value-IV",
        currentValue: "environment-variable-value-IV",
        secret: false,
      },
      {
        key: "ENV_VAR_V",
        initialValue: "environment-variable-value-V",
        currentValue: "environment-variable-value-V",
        secret: false,
      },
    ];

    test("Filters request variables by active status and value fields, then remove environment variables sharing the same keys", () => {
      const expected = [
        {
          key: "SHARED_KEY_I",
          currentValue: "request-variable-shared-value-I",
          initialValue: "request-variable-shared-value-I",
          secret: false,
        },
        {
          key: "REQUEST_VAR_III",
          currentValue: "request-variable-value-III",
          initialValue: "request-variable-value-III",
          secret: false,
        },
        {
          key: "SHARED_KEY_II",
          currentValue: "environment-variable-shared-value-II",
          initialValue: "environment-variable-shared-value-II",
          secret: false,
        },
        {
          key: "ENV_VAR_III",
          currentValue: "environment-variable-value-III",
          initialValue: "environment-variable-value-III",
          secret: false,
        },
        {
          key: "ENV_VAR_IV",
          currentValue: "environment-variable-value-IV",
          initialValue: "environment-variable-value-IV",
          secret: false,
        },
        {
          key: "ENV_VAR_V",
          currentValue: "environment-variable-value-V",
          initialValue: "environment-variable-value-V",
          secret: false,
        },
      ];

      expect(
        getResolvedVariables(requestVariables, environmentVariables)
      ).toEqual(expected);
    });
  });
});
