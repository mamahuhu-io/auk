import { isAukCLIError } from "../../../utils/checks";

describe("isAukCLIError", () => {
  test("NULL error value.", () => {
    expect(isAukCLIError(null)).toBeFalsy();
  });

  test("Non-existing code property.", () => {
    expect(isAukCLIError({ name: "name" })).toBeFalsy();
  });

  test("Invalid code value.", () => {
    expect(isAukCLIError({ code: 2 })).toBeFalsy();
  });

  test("Valid code value.", () => {
    expect(isAukCLIError({ code: "TEST_SCRIPT_ERROR" })).toBeTruthy();
  });
});
