import { AukRESTRequest } from "@auk/data";
import { AukEnvs } from "../../../types/request";
import * as E from "fp-ts/Either";
import { AukCLIError } from "../../../types/errors";
import { EffectiveAukRESTRequest } from "../../../interfaces/request";
import { preRequestScriptRunner } from "../../../utils/pre-request";

import "@relmify/jest-fp-ts";

const SAMPLE_ENVS: AukEnvs = {
  global: [],
  selected: [],
};
const VALID_PRE_REQUEST_SCRIPT = `
	pw.env.set("ENDPOINT","https://example.com");
`;
const INVALID_PRE_REQUEST_SCRIPT = "d";
const SAMPLE_REQUEST: AukRESTRequest = {
  v: "1",
  name: "request",
  method: "GET",
  endpoint: "<<ENDPOINT>>",
  params: [],
  headers: [],
  preRequestScript: "",
  testScript: "",
  auth: { authActive: false, authType: "none" },
  body: {
    contentType: null,
    body: null,
  },
};

describe("preRequestScriptRunner", () => {
  let SUCCESS_PRE_REQUEST_RUNNER: E.Either<
      AukCLIError,
      EffectiveAukRESTRequest
    >,
    FAILURE_PRE_REQUEST_RUNNER: E.Either<
      AukCLIError,
      EffectiveAukRESTRequest
    >;

  beforeAll(async () => {
    SAMPLE_REQUEST.preRequestScript = VALID_PRE_REQUEST_SCRIPT;
    SUCCESS_PRE_REQUEST_RUNNER = await preRequestScriptRunner(
      SAMPLE_REQUEST,
      SAMPLE_ENVS
    )();

    SAMPLE_REQUEST.preRequestScript = INVALID_PRE_REQUEST_SCRIPT;
    FAILURE_PRE_REQUEST_RUNNER = await preRequestScriptRunner(
      SAMPLE_REQUEST,
      SAMPLE_ENVS
    )();
  });

  test("Parsing of request endpoint with set ENV.", () => {
    expect(SUCCESS_PRE_REQUEST_RUNNER).toSubsetEqualRight(<
      EffectiveAukRESTRequest
    >{
      effectiveFinalURL: "https://example.com",
    });
  });

  test("Failed execution due to unknown variable error.", () => {
    expect(FAILURE_PRE_REQUEST_RUNNER).toSubsetEqualLeft(<AukCLIError>{
      code: "PRE_REQUEST_SCRIPT_ERROR",
    });
  });
});
