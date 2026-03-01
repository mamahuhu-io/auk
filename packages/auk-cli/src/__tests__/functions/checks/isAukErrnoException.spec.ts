import { isAukErrnoException } from "../../../utils/checks";

describe("isAukErrnoException", () => {
  test("NULL exception value.", () => {
    expect(isAukErrnoException(null)).toBeFalsy();
  });

  test("Non-existing name property.", () => {
    expect(isAukErrnoException({ what: "what" })).toBeFalsy();
  });

  test("Invalid name value.", () => {
    expect(isAukErrnoException({ name: 3 })).toBeFalsy();
  });

  test("Valid name value.", () => {
    expect(isAukErrnoException({ name: "name" })).toBeTruthy();
  });
});
