import {
  decodeGoogleResourceCursor,
  encodeCursor,
  googleBusinessCandidate,
  GOOGLE_ACCOUNT_PAGE_SIZE,
  GOOGLE_LOCATION_PAGE_SIZE,
  GOOGLE_REVIEW_PAGE_SIZE,
  invalidProviderConfiguration,
  invalidProviderResponse,
  nextGoogleResourceCursor,
  optionalEnvelopeString,
  optionalString,
  record,
  requiredArrayField,
  requiredConfigString,
  requiredRecord,
  requiredString,
  invalidCursor,
  type ImportProviderCandidatePage,
  type ImportProviderHttpClient,
  type ImportProviderHttpResponse,
  type ImportProviderResourcePage,
} from "./official-import-providers.js";

export class GoogleBusinessImportProviderOperations {
  constructor(
    private readonly request: (
      input: Parameters<ImportProviderHttpClient["getJson"]>[0],
    ) => Promise<ImportProviderHttpResponse>,
  ) {}

  async listResources(
    token: string,
    cursor?: string,
  ): Promise<ImportProviderResourcePage> {
    const state = decodeGoogleResourceCursor(cursor);
    const accounts = requiredRecord(
      (
        await this.request({
          url: "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
          token,
          params: {
            pageSize: String(GOOGLE_ACCOUNT_PAGE_SIZE),
            pageToken: state.accountPageToken ?? undefined,
          },
        })
      ).body,
    );
    const accountItems = requiredArrayField(
      accounts,
      "accounts",
      GOOGLE_ACCOUNT_PAGE_SIZE,
    ).map(record);
    const accountNextPageToken = optionalEnvelopeString(
      accounts,
      "nextPageToken",
    );
    if (!accountItems.length)
      return {
        items: [],
        nextCursor: accountNextPageToken
          ? encodeCursor({
              kind: "google-resources",
              accountPageToken: accountNextPageToken,
              accountIndex: 0,
              locationPageToken: null,
            })
          : null,
      };
    const account = accountItems[state.accountIndex];
    if (!account) throw invalidCursor();
    const accountName = googleAccountName(requiredString(account, "name"));
    const locations = requiredRecord(
      (
        await this.request({
          url: `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
          token,
          params: {
            pageSize: String(GOOGLE_LOCATION_PAGE_SIZE),
            pageToken: state.locationPageToken ?? undefined,
            readMask: "name,title",
          },
        })
      ).body,
    );
    const locationItems = requiredArrayField(
      locations,
      "locations",
      GOOGLE_LOCATION_PAGE_SIZE,
    ).map(record);
    return {
      items: locationItems.map((location) =>
        googleLocationResource({ account, accountName, location }),
      ),
      nextCursor: nextGoogleResourceCursor({
        state,
        accountCount: accountItems.length,
        accountNextPageToken,
        locationNextPageToken: optionalEnvelopeString(
          locations,
          "nextPageToken",
        ),
      }),
    };
  }

  async fetchCandidates(
    token: string,
    config: Record<string, unknown>,
    cursor?: string,
  ): Promise<ImportProviderCandidatePage> {
    const accountName = googleAccountConfigName(config);
    const locationName = googleLocationConfigName(config);
    const body = requiredRecord(
      (
        await this.request({
          url: `https://mybusiness.googleapis.com/v4/${accountName}/${locationName}/reviews`,
          token,
          params: {
            pageSize: String(GOOGLE_REVIEW_PAGE_SIZE),
            pageToken: cursor,
          },
        })
      ).body,
    );
    return {
      candidates: requiredArrayField(body, "reviews", GOOGLE_REVIEW_PAGE_SIZE)
        .map(record)
        .flatMap(googleBusinessCandidate),
      nextCursor: optionalEnvelopeString(body, "nextPageToken"),
    };
  }
}

function googleLocationResource({
  account,
  accountName,
  location,
}: {
  account: Record<string, unknown>;
  accountName: string;
  location: Record<string, unknown>;
}) {
  const locationName = googleLocationName(requiredString(location, "name"));
  return {
    id: `${accountName}/${locationName}`,
    label: `${optionalString(account, "accountName") ?? accountName} - ${optionalString(location, "title") ?? locationName}`,
    config: { accountName, locationName },
  };
}

function googleAccountConfigName(config: Record<string, unknown>) {
  return googleResourceName({
    value: requiredConfigString(config, "accountName"),
    prefix: "accounts",
    invalid: invalidProviderConfiguration,
  });
}

function googleLocationConfigName(config: Record<string, unknown>) {
  return googleResourceName({
    value: requiredConfigString(config, "locationName"),
    prefix: "locations",
    invalid: invalidProviderConfiguration,
  });
}

function googleAccountName(value: string) {
  return googleResourceName({
    value,
    prefix: "accounts",
    invalid: invalidProviderResponse,
  });
}

function googleLocationName(value: string) {
  return googleResourceName({
    value,
    prefix: "locations",
    invalid: invalidProviderResponse,
  });
}

function googleResourceName({
  value,
  prefix,
  invalid,
}: {
  value: string;
  prefix: "accounts" | "locations";
  invalid: () => Error;
}) {
  if (!new RegExp(`^${prefix}/[A-Za-z0-9_-]{1,255}$`).test(value)) {
    throw invalid();
  }
  return value;
}
