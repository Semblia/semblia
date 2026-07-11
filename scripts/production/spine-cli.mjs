const VALUE_OPTIONS = new Map([
  ["--app-url", "appUrl"],
  ["--api-url", "apiUrl"],
  ["--compose-file", "composeFile"],
  ["--env-file", "envFile"],
]);

export function parseArguments(argv) {
  const options = {
    appUrl: undefined,
    apiUrl: undefined,
    composeFile: "deploy/production/compose.yaml",
    envFile: "deploy/production/runtime.env",
    publicOnly: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--public-only") {
      options.publicOnly = true;
      continue;
    }

    const option = VALUE_OPTIONS.get(argument);
    if (!option) throw new Error(`unknown option: ${argument}`);

    options[option] = requireOptionValue(argv, index, argument);
    index += 1;
  }

  if (!options.appUrl || !options.apiUrl) {
    throw new Error("--app-url and --api-url are required");
  }

  return options;
}

function requireOptionValue(argv, index, argument) {
  const value = argv[index + 1];

  if (!value || value.startsWith("--")) {
    throw new Error(`missing value for ${argument}`);
  }

  return value;
}
