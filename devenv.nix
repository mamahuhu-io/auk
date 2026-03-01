{ pkgs, lib, config, inputs, ... }:

let
  rosettaPkgs =
    if pkgs.stdenv.isDarwin && pkgs.stdenv.isAarch64
    then pkgs.pkgsx86_64Darwin
    else pkgs;

  darwinPackages = with pkgs; [
    apple-sdk
  ];

  linuxPackages = with pkgs; [
    libsoup_3
    webkitgtk_4_1
    librsvg
    libappindicator
    libayatana-appindicator
  ];

in {
  packages = with pkgs; [
    git
    jq
    # NOTE: In case there's `Cannot find module: ... bcrypt ...` error, try `npm rebuild bcrypt`
    # See: https://github.com/kelektiv/node.bcrypt.js/issues/800
    # See: https://github.com/kelektiv/node.bcrypt.js/issues/1055
    nodejs_22
    nodePackages.typescript-language-server
    nodePackages."@volar/vue-language-server"
    nodePackages.prisma
    prisma-engines
    cargo-edit
    cargo-tauri
  ] ++ lib.optionals pkgs.stdenv.isDarwin darwinPackages
    ++ lib.optionals pkgs.stdenv.isLinux linuxPackages;

  env = {
    APP_GREET = "Mamahuhu";
    DATABASE_URL = "postgresql://postgres:testpass@localhost:5432/Mamahuhu?connect_timeout=300";
  } // lib.optionalAttrs pkgs.stdenv.isLinux {
    # NOTE: Setting these `PRISMA_*` environment variable fixes
    # "Error: Failed to fetch sha256 checksum at https://binaries.prisma.sh/all_commits/<hash>/linux-nixos/libquery_engine.so.node.gz.sha256 - 404 Not Found"
    # See: https://github.com/prisma/prisma/discussions/3120
    PRISMA_QUERY_ENGINE_LIBRARY = "${pkgs.prisma-engines}/lib/libquery_engine.node";
    PRISMA_QUERY_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/query-engine";
    PRISMA_SCHEMA_ENGINE_BINARY = "${pkgs.prisma-engines}/bin/schema-engine";

    LD_LIBRARY_PATH = lib.makeLibraryPath [
      pkgs.libappindicator
      pkgs.libayatana-appindicator
    ];
  } // lib.optionalAttrs pkgs.stdenv.isDarwin {
    # Place to put macOS-specific environment variables
  };

  scripts = {
    hello.exec = "echo hello from $APP_GREET";
    e.exec = "emacs";

    db-reset.exec = ''
      echo "Resetting database..."
      psql -U postgres -d mamahuhu -c 'DROP SCHEMA public CASCADE; CREATE SCHEMA public;'
      echo "Database reset complete."
    '';
  };

  enterShell = ''
    git --version
    echo "mamahuhu development environment ready!"
    ${lib.optionalString pkgs.stdenv.isDarwin ''
      # Place to put macOS-specific shell initialization
    ''}
    ${lib.optionalString pkgs.stdenv.isLinux ''
      # Place to put Linux-specific shell initialization
    ''}
  '';

  enterTest = ''
    echo "Running tests"
  '';

  dotenv.enable = true;

  languages = {
    typescript = {
      enable = true;
    };
    javascript = {
      package = pkgs.nodejs_22;
      enable = true;
      npm.enable = true;
      pnpm.enable = true;
    };
    go = {
      enable = true;
      package = pkgs.go_1_24;
    };
    rust = {
      enable = true;
      channel = "nightly";
      components = [
        "rustc"
        "cargo"
        "clippy"
        "rustfmt"
        "rust-analyzer"
        "llvm-tools-preview"
        "rust-src"
        "rustc-codegen-cranelift-preview"
      ];
    };
  };
}
