import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { FormsRuntimeStack } from "./forms-runtime-stack.js";

function stackWith(context: Record<string, string> = {}) {
  const app = new cdk.App({
    context: {
      formsRuntimeMode: "api",
      formsRuntimeApiBaseUrl: "https://api.semblia.test/v2",
      formsRuntimeSigningSecretArn:
        "arn:aws:secretsmanager:us-east-1:123456789012:secret:forms-runtime-abcdef",
      formsRuntimeCertificateArn:
        "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012",
      ...context,
    },
  });
  return new FormsRuntimeStack(app, "TestStack", { env: { account: "123456789012", region: "us-east-1" } });
}

describe("FormsRuntimeStack", () => {
  it("uses the secret ARN only, exact and wildcard aliases, and host-safe policies", () => {
    const template = Template.fromStack(stackWith());
    template.hasResourceProperties("AWS::Lambda::Function", {
      Environment: {
        Variables: Match.objectLike({
          FORMS_RUNTIME_SIGNING_SECRET_ARN:
            "arn:aws:secretsmanager:us-east-1:123456789012:secret:forms-runtime-abcdef",
        }),
      },
    });
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: Match.objectLike({
        Statement: Match.arrayWith([Match.objectLike({ Action: Match.arrayWith(["secretsmanager:GetSecretValue"]) })]),
      }),
    });
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Aliases: ["forms.semblia.com", "*.forms.semblia.com"],
      }),
    });
    template.hasResourceProperties("AWS::CloudFront::CachePolicy", {
      CachePolicyConfig: Match.objectLike({
        MinTTL: 0,
        ParametersInCacheKeyAndForwardedToOrigin: Match.objectLike({
          HeadersConfig: { HeaderBehavior: "whitelist", Headers: ["x-semblia-original-host"] },
          QueryStringsConfig: { QueryStringBehavior: "whitelist", QueryStrings: ["projectId", "submitted"] },
          CookiesConfig: { CookieBehavior: "none" },
        }),
      }),
    });
    template.hasResourceProperties("AWS::CloudFront::OriginRequestPolicy", {
      OriginRequestPolicyConfig: Match.objectLike({
        HeadersConfig: Match.objectLike({ Headers: Match.arrayWith(["x-semblia-original-host"]) }),
        QueryStringsConfig: { QueryStringBehavior: "all" },
      }),
    });
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        DefaultCacheBehavior: Match.objectLike({ CachedMethods: ["GET", "HEAD"] }),
      }),
    });
    template.hasResourceProperties("AWS::CloudFront::Function", {
      FunctionCode: Match.stringLikeRegexp("delete request\\.headers\\[\\\"x-semblia-signature\\\"\\]"),
    });
    template.hasResourceProperties("AWS::CloudFront::Function", {
      FunctionCode: Match.stringLikeRegexp("delete request\\.headers\\[\\\"x-semblia-runtime-signature\\\"\\]"),
    });
    const rendered = JSON.stringify(template.toJSON());
    expect(rendered).not.toContain("FORMS_RUNTIME_SIGNING_SECRET\":\"");
  });

  it("rejects missing deployment inputs and non-us-east-1 certificates", () => {
    expect(() => stackWith({ formsRuntimeSigningSecretArn: "" })).toThrow();
    expect(() => stackWith({ formsRuntimeCertificateArn: "arn:aws:acm:ap-south-1:123456789012:certificate/x" })).toThrow();
    expect(() => stackWith({ formsRuntimeCustomDomains: "custom.example" })).toThrow();
    expect(() => stackWith({ formsRuntimeMode: "production" })).toThrow("formsRuntimeMode must be exactly api or mock");
    const mockApp = new cdk.App({ context: { formsRuntimeMode: "mock", formsRuntimeSigningSecretArn: "arn:aws:secretsmanager:us-east-1:123456789012:secret:forms-runtime-abcdef" } });
    expect(() => new FormsRuntimeStack(mockApp, "MockSecretStack", { env: { account: "123456789012", region: "us-east-1" } })).toThrow("formsRuntimeSigningSecretArn is not allowed in mock mode");
  });
});
