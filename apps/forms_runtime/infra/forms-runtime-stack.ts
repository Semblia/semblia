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

export class FormsRuntimeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const baseDomain =
      readContext(this, "formsRuntimeBaseDomain") ?? "collect.tresta.app";
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
    request.headers["x-tresta-original-host"] = {
      value: request.headers.host.value
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
          "x-tresta-original-host",
        ),
        queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
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
          "x-tresta-original-host",
        ),
        queryStringBehavior: cloudfront.OriginRequestQueryStringBehavior.all(),
        cookieBehavior: cloudfront.OriginRequestCookieBehavior.none(),
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

new FormsRuntimeStack(app, "TrestaFormsRuntimeStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
