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
} from "./official-import-provider-shared.js";

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
    const accountPage = await this.listResourcePage({
      token,
      url: "https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
      pageToken: state.accountPageToken,
      field: "accounts",
      pageSize: GOOGLE_ACCOUNT_PAGE_SIZE,
    });
    const accountItems = accountPage.items;
    const accountNextPageToken = accountPage.nextPageToken;
    if (!accountItems.length)
      return emptyGoogleResourcePage(accountNextPageToken);
    const account = accountItems[state.accountIndex];
    if (!account) throw invalidCursor();
    const accountName = googleResourceName({
      value: requiredString(account, "name"),
      prefix: "accounts",
      invalid: invalidProviderResponse,
    });
    const locationPage = await this.listResourcePage({
      token,
      url: `https://mybusinessbusinessinformation.googleapis.com/v1/${accountName}/locations`,
      pageToken: state.locationPageToken,
      field: "locations",
      pageSize: GOOGLE_LOCATION_PAGE_SIZE,
      readMask: "name,title",
    });
    const locationItems = locationPage.items;
    const locationNextPageToken = locationPage.nextPageToken;
    return {
      items: locationItems.map((location) =>
        googleLocationResource({ account, accountName, location }),
      ),
      nextCursor: nextGoogleResourceCursor({
        state,
        accountCount: accountItems.length,
        accountNextPageToken,
        locationNextPageToken,
      }),
    };
  }

  private async listResourcePage(input: GoogleResourcePageRequest) {
    const body = requiredRecord(
      (
        await this.request({
          url: input.url,
          token: input.token,
          params: {
            pageSize: String(input.pageSize),
            pageToken: input.pageToken ?? undefined,
            ...(input.readMask ? { readMask: input.readMask } : {}),
          },
        })
      ).body,
    );
    return {
      items: requiredArrayField(body, input.field, input.pageSize).map(record),
      nextPageToken: optionalEnvelopeString(body, "nextPageToken"),
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

type GoogleResourcePageRequest = {
  token: string;
  url: string;
  pageToken?: string | null;
  field: "accounts" | "locations";
  pageSize: number;
  readMask?: string;
};

function emptyGoogleResourcePage(accountNextPageToken: string | null) {
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
  const locationName = googleResourceName({
    value: requiredString(location, "name"),
    prefix: "locations",
    invalid: invalidProviderResponse,
  });
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
