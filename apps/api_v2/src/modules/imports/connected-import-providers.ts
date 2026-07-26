import { Inject, Injectable } from "@nestjs/common";
import type { ConnectedImportSourceKey } from "./connected-import-policy.js";
import {
  BoundedImportProviderHttpClient,
  GoogleBusinessImportProvider,
  GooglePlayImportProvider,
  LinkedInImportProvider,
  XImportProvider,
  YouTubeImportProvider,
  type ImportProvider,
} from "./providers/official-import-providers.js";

@Injectable()
export class ConnectedImportProviderRegistry {
  private readonly x: XImportProvider;
  private readonly linkedin: LinkedInImportProvider;
  private readonly youtube: YouTubeImportProvider;
  private readonly googleBusiness: GoogleBusinessImportProvider;
  private readonly googlePlay: GooglePlayImportProvider;

  constructor(
    @Inject(BoundedImportProviderHttpClient)
    http: BoundedImportProviderHttpClient,
  ) {
    this.x = new XImportProvider(http);
    this.linkedin = new LinkedInImportProvider(http);
    this.youtube = new YouTubeImportProvider(http);
    this.googleBusiness = new GoogleBusinessImportProvider(http);
    this.googlePlay = new GooglePlayImportProvider(http);
  }

  get(sourceKey: ConnectedImportSourceKey): ImportProvider {
    switch (sourceKey) {
      case "x":
        return this.x;
      case "linkedin":
        return this.linkedin;
      case "youtube":
        return this.youtube;
      case "google-business":
        return this.googleBusiness;
      case "google-play":
        return this.googlePlay;
    }
  }
}

export {
  CONNECTED_IMPORT_POLICIES,
  CONNECTED_IMPORT_SOURCE_KEYS,
  connectedImportPolicy,
  isConnectedImportSourceKey,
  type ConnectedImportPolicy,
  type ConnectedImportSourceKey,
} from "./connected-import-policy.js";
