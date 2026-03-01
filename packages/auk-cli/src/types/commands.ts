export type TestCmdOptions = {
  env?: string;
  delay?: string;
  reporterJunit?: string;
  iterationCount?: number;
  iterationData?: string;
  legacySandbox?: boolean;
};

// Consumed in the collection `file_path` argument action handler
export type TestCmdCollectionOptions = Omit<TestCmdOptions, "env" | "delay">;

// Consumed in the `--env, -e` flag action handler
export type TestCmdEnvironmentOptions = Omit<TestCmdOptions, "env"> & {
  env: string;
};

export type AUK_ENV_FILE_EXT = "json";
