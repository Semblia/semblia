import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";

/**
 * The `widgets.semblia.com` CDN (WS-B1): a private S3 bucket behind
 * CloudFront serving the built `packages/widgets-embed` bundle evergreen at
 * `/embed.js` — never bundled into customer builds, so the runtime stays in
 * lockstep with the API it talks to. The same host later carries SDK/static
 * embed assets (WS-J). The release workflow's publish job uploads the bundle
 * and invalidates `/embed.js`; this stack owns the serving surface only.
 *
 * Mirrors the reviewed forms-runtime stack patterns: context-driven, mock
 * mode for synth without a certificate, exact us-east-1 ACM requirement in
 * api mode, and the same security-header response policy.
 */

function readContext(scope: Construct, key: string): string | undefined {
  const value = scope.node.tryGetContext(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

interface WidgetsCdnContext {
  domain: string;
  certificateArn: string | undefined;
}

function widgetsCdnDomain(scope: Construct): string {
  const domain = readContext(scope, "widgetsCdnDomain") ?? "widgets.semblia.com";
  if (
    !/^[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9]+(?:[a-z0-9-]*[a-z0-9])?)+$/.test(
      domain,
    )
  ) {
    throw new Error("widgetsCdnDomain must be a normalized hostname");
  }
  return domain;
}

function widgetsCdnMode(scope: Construct): "api" | "mock" {
  const mode = readContext(scope, "widgetsCdnMode") ?? "mock";
  if (mode !== "api" && mode !== "mock") {
    throw new Error("widgetsCdnMode must be exactly api or mock");
  }
  return mode;
}

function widgetsCdnCertificateArn(
  scope: Construct,
  mode: "api" | "mock",
): string | undefined {
  const certificateArn = readContext(scope, "widgetsCdnCertificateArn");
  if (certificateArn && !certificateArn.startsWith("arn:aws:acm:us-east-1:")) {
    throw new Error(
      "widgetsCdnCertificateArn must reference an us-east-1 ACM certificate",
    );
  }
  if (mode === "api" && !certificateArn) {
    throw new Error(
      "Missing required CDK context value: widgetsCdnCertificateArn",
    );
  }
  return certificateArn;
}

/** Context resolution + validation, kept out of the construct orchestration. */
function resolveWidgetsCdnContext(scope: Construct): WidgetsCdnContext {
  const domain = widgetsCdnDomain(scope);
  const mode = widgetsCdnMode(scope);
  return { domain, certificateArn: widgetsCdnCertificateArn(scope, mode) };
}

/**
 * Evergreen delivery: browsers and edges hold the script briefly and
 * revalidate; the publish job's invalidation makes new bundles live in
 * minutes without customers ever re-embedding.
 */
function cdnPolicies(scope: Construct) {
  const cachePolicy = new cloudfront.CachePolicy(scope, "WidgetsCdnCache", {
    defaultTtl: cdk.Duration.minutes(5),
    minTtl: cdk.Duration.seconds(0),
    maxTtl: cdk.Duration.hours(1),
    headerBehavior: cloudfront.CacheHeaderBehavior.none(),
    queryStringBehavior: cloudfront.CacheQueryStringBehavior.none(),
    cookieBehavior: cloudfront.CacheCookieBehavior.none(),
    enableAcceptEncodingBrotli: true,
    enableAcceptEncodingGzip: true,
  });

  const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
    scope,
    "WidgetsCdnSecurityHeaders",
    {
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        referrerPolicy: {
          referrerPolicy:
            cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
      },
    },
  );

  return { cachePolicy, responseHeadersPolicy };
}

export class WidgetsCdnStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const { domain, certificateArn } = resolveWidgetsCdnContext(this);
    const certificate = certificateArn
      ? acm.Certificate.fromCertificateArn(
          this,
          "WidgetsCdnCertificate",
          certificateArn,
        )
      : undefined;

    const bucket = new s3.Bucket(this, "WidgetsEmbedBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: true,
      // A production asset bucket never rides a stack teardown.
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const { cachePolicy, responseHeadersPolicy } = cdnPolicies(this);

    const distribution = new cloudfront.Distribution(
      this,
      "WidgetsCdnDistribution",
      {
        certificate,
        domainNames: certificate ? [domain] : undefined,
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          compress: true,
          cachePolicy,
          responseHeadersPolicy,
        },
      },
    );

    new cdk.CfnOutput(this, "WidgetsCdnDistributionDomainName", {
      value: distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "WidgetsCdnDistributionId", {
      value: distribution.distributionId,
    });
    new cdk.CfnOutput(this, "WidgetsEmbedBucketName", {
      value: bucket.bucketName,
    });
  }
}
