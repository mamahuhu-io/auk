import { AukCLIError } from "../../../types/errors";
import { parseCollectionData } from "../../../utils/mutators";

describe("parseCollectionData", () => {
  test("Reading non-existing file.", () => {
    return expect(
      parseCollectionData("./src/__tests__/samples/notexist.json")
    ).rejects.toMatchObject(<AukCLIError>{
      code: "FILE_NOT_FOUND",
    });
  });

  test("Unparseable JSON contents.", () => {
    return expect(
      parseCollectionData("./src/__tests__/samples/malformed-collection.json")
    ).rejects.toMatchObject(<AukCLIError>{
      code: "UNKNOWN_ERROR",
    });
  });

  test("Invalid AukCollection.", () => {
    return expect(
      parseCollectionData("./src/__tests__/samples/malformed-collection2.json")
    ).rejects.toMatchObject(<AukCLIError>{
      code: "MALFORMED_COLLECTION",
    });
  });

  test("Valid AukCollection.", () => {
    return expect(
      parseCollectionData("./src/__tests__/samples/passes.json")
    ).resolves.toBeTruthy();
  });
});
