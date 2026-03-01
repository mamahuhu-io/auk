type AukErrorPath = {
  path: string;
};

type AukErrorCmd = {
  command: string;
};

type AukErrorData = {
  data: any;
};

type AukErrors = {
  UNKNOWN_ERROR: AukErrorData;
  FILE_NOT_FOUND: AukErrorPath;
  UNKNOWN_COMMAND: AukErrorCmd;
  MALFORMED_COLLECTION: AukErrorPath & AukErrorData;
  NO_FILE_PATH: {};
  PRE_REQUEST_SCRIPT_ERROR: AukErrorData;
  PARSING_ERROR: AukErrorData;
  TEST_SCRIPT_ERROR: AukErrorData;
  TESTS_FAILING: AukErrorData;
  SYNTAX_ERROR: AukErrorData;
  REQUEST_ERROR: AukErrorData;
  INVALID_ARGUMENT: AukErrorData;
  MALFORMED_ENV_FILE: AukErrorPath & AukErrorData;
  BULK_ENV_FILE: AukErrorPath & AukErrorData;
  INVALID_FILE_TYPE: AukErrorData;
  INVALID_DATA_FILE_TYPE: AukErrorData;
  INVALID_ID: AukErrorData;
  REPORT_EXPORT_FAILED: AukErrorPath & AukErrorData;
};

export type AukErrorCode = keyof AukErrors;
export type AukError<T extends AukErrorCode> = T extends null
  ? { code: T }
  : { code: T } & AukErrors[T];

export const error = <T extends AukErrorCode>(error: AukError<T>) => error;
export type AukCLIError = AukError<AukErrorCode>;
export type AukErrnoException = NodeJS.ErrnoException;
