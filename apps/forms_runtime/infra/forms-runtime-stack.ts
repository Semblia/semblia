import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

const appDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readContext(scope: Construct, key: string): string | undefined {
  const value = scope.node.tryGetContext(key);
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function readRequiredContext(scope: Construct, key: string): string {
  const value = readContext(scope, key);
  if (!value) {
    throw new Error(`Missing required CDK context value: ${key}`);
  }

  return value;
}

function readContextList(scope: Construct, key: string): string[] {
  const value = scope.node.tryGetContext(key);
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export class FormsRuntimeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const baseDomain =
      readContext(this, "formsRuntimeBaseDomain") ?? "collect.semblia.com";
    const runtimeMode = readContext(this, "formsRuntimeMode") ?? "mock";
    const apiBaseUrl =
      runtimeMode === "api"
        ? readRequiredContext(this, "formsRuntimeApiBaseUrl")
        : readContext(this, "formsRuntimeApiBaseUrl");
    const signingSecret =
      runtimeMode === "api"
        ? readRequiredContext(this, "formsRuntimeSigningSecret")
        : readContext(this, "formsRuntimeSigningSecret");
    const certificateArn = readContext(this, "formsRuntimeCertificateArn");
    const distributionDomain =
      readContext(this, "formsRuntimeDomain") ?? `*.${baseDomain}`;
    const customDomains = readContextList(this, "formsRuntimeCustomDomains");
    if (customDomains.length > 0) {
      throw new Error(
        "FORMS RUNTIME CUSTOM DOMAIN STUB: per-tenant CloudFront alternate-domain/certificate/DNS automation is not implemented yet. Model hosts in api_v2, but do not pass formsRuntimeCustomDomains until that production rollout exists.",
      );
    }

    const environment: Record<string, string> = {
      FORMS_RUNTIME_MODE: runtimeMode,
      FORMS_RUNTIME_PUBLIC_BASE_DOMAIN: baseDomain,
    };
    if (apiBaseUrl) environment.FORMS_RUNTIME_API_BASE_URL = apiBaseUrl;
    if (signingSecret) environment.FORMS_RUNTIME_SIGNING_SECRET = signingSecret;

    const logGroup = new logs.LogGroup(this, "FormsRuntimeLogGroup", {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const runtimeFunction = new lambda.Function(this, "FormsRuntimeLambda", {
      code: lambda.Code.fromAsset(path.join(appDir, "dist"), {
        exclude: ["local.mjs"],
      }),
      handler: "lambda.handler",
      runtime: lambda.Runtime.NODEJS_22_X,
      architecture: lambda.Architecture.ARM_64,
      memorySize: 256,
      timeout: cdk.Duration.seconds(10),
      reservedConcurrentExecutions: 20,
      logGroup,
      environment,
    });

    const functionUrl = runtimeFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.AWS_IAM,
    });

    const originalHostFunction = new cloudfront.Function(
      this,
      "CaptureOriginalHost",
      {
        code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  if (request.headers.host && request.headers.host.value) {
    request.headers["x-semblia-original-host"] = {
      value: request.headers.host.value
    };
  }
  if (request.headers["user-agent"] && request.headers["user-agent"].value) {
    request.headers["x-semblia-original-user-agent"] = {
      value: request.headers["user-agent"].value
    };
  }
  if (event.viewer && event.viewer.ip) {
    request.headers["x-semblia-original-forwarded-for"] = {
      value: event.viewer.ip
    };
  }
  return request;
}
`),
      },
    );

    const cachePolicy = new cloudfront.CachePolicy(
      this,
      "HostedFormCachePolicy",
      {
        defaultTtl: cdk.Duration.seconds(60),
        minTtl: cdk.Duration.seconds(0),
        maxTtl: cdk.Duration.minutes(5),
        headerBehavior: cloudfront.CacheHeaderBehavior.allowList(
          "x-semblia-original-host",
        ),
        queryStringBehavior:
          cloudfront.CacheQueryStringBehavior.allowList("submitted"),
        cookieBehavior: cloudfront.CacheCookieBehavior.none(),
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      },
    );

    const originRequestPolicy = new cloudfront.OriginRequestPolicy(
      this,
      "HostedFormOriginRequestPolicy",
      {
        headerBehavior: cloudfront.OriginRequestHeaderBehavior.allowList(
          "content-type",
          "x-semblia-original-host",
          "x-semblia-original-user-agent",
          "x-semblia-original-forwarded-for",
        ),
        queryStringBehavior:
          cloudfront.OriginRequestQueryStringBehavior.allowList("submitted"),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
      },
    );

    const responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(
      this,
      "HostedFormSecurityHeadersPolicy",
      {
        securityHeadersBehavior: {
          contentSecurityPolicy: {
            override: true,
            contentSecurityPolicy:
              "default-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; img-src 'self' https: data:; style-src 'unsafe-inline'; font-src 'self' https: data:; script-src 'none'; connect-src 'none'",
          },
          contentTypeOptions: { override: true },
          frameOptions: {
            frameOption: cloudfront.HeadersFrameOption.DENY,
            override: true,
          },
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

    const certificate = certificateArn
      ? acm.Certificate.fromCertificateArn(
          this,
          "HostedFormCertificate",
          certificateArn,
        )
      : undefined;

    const distribution = new cloudfront.Distribution(
      this,
      "FormsRuntimeDistribution",
      {
        certificate,
        domainNames: certificate ? [distributionDomain] : undefined,
        defaultBehavior: {
          origin: origins.FunctionUrlOrigin.withOriginAccessControl(
            functionUrl,
            {
              readTimeout: cdk.Duration.seconds(10),
              keepaliveTimeout: cdk.Duration.seconds(5),
            },
          ),
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          compress: true,
          cachePolicy,
          originRequestPolicy,
          responseHeadersPolicy,
          functionAssociations: [
            {
              eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
              function: originalHostFunction,
            },
          ],
        },
      },
    );

    new cdk.CfnOutput(this, "FormsRuntimeDistributionDomainName", {
      value: distribution.distributionDomainName,
    });
    new cdk.CfnOutput(this, "FormsRuntimeFunctionName", {
      value: runtimeFunction.functionName,
    });
  }
}

const app = new cdk.App();

new FormsRuntimeStack(app, "SembliaFormsRuntimeStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
