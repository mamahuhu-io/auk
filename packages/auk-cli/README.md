# Auk CLI <font size=2><sup>ALPHA</sup></font>

CLI for running Auk collection test scripts in CI.

## Requirements

- Node.js 22+
- npm or pnpm

## Install

```bash
npm i -g @auk/cli
```

## Command

```bash
auk test [options] <collection-file-path>
```

`<collection-file-path>` must be a local JSON file path.

## Global options

- `-v, --ver` show CLI version
- `-h, --help` show help

## `auk test` options

- `-e, --env <file_path>`: environment JSON file path
- `-d, --delay <delay_in_ms>`: delay between requests
- `--reporter-junit [path]`: output JUnit report (default file: `auk-junit-report.xml`)
- `--iteration-count <no_of_iterations>`: run multiple iterations
- `--iteration-data <file_path>`: CSV file for data-driven iterations
- `--legacy-sandbox`: opt out of experimental scripting sandbox

Example:

```bash
auk test ./collections/my-suite.json \
  --env ./env/staging.json \
  --iteration-count 3 \
  --iteration-data ./data/users.csv \
  --reporter-junit ./reports/junit.xml
```

## Iteration CSV format

```text
key1,key2
valueA1,valueA2
valueB1,valueB2
```

Each row becomes one iteration variable set.

## Development

```bash
pnpm install
pnpm --filter @auk/data run build
pnpm --filter @auk/js-sandbox run build
pnpm --filter @auk/cli run build
```

Run tests:

```bash
pnpm --filter @auk/cli run test
```
