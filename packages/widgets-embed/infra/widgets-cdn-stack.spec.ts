// @vitest-environment node
import * as cdk from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { describe, expect, it } from "vitest";
import { WidgetsCdnStack } from "./widgets-cdn-stack.js";

const CERT_ARN =
  "arn:aws:acm:us-east-1:123456789012:certificate/12345678-1234-1234-1234-123456789012";

function stackWith(context: Record<string, string> = {}) {
  const app = new cdk.App({
    context: {
      widgetsCdnMode: "api",
      widgetsCdnCertificateArn: CERT_ARN,
      ...context,
    },
  });
  return new WidgetsCdnStack(app, "TestStack", {
    env: { account: "123456789012", region: "us-east-1" },
  });
}

describe("WidgetsCdnStack", () => {
  // CDK synth is CPU-heavy; the default 5s budget flakes when the monorepo
  // gate runs every package's suite in parallel.
  it(
    "serves a locked-down bucket through CloudFront on the widgets host",
    { timeout: 60_000 },
    () => {
      const template = Template.fromStack(stackWith());

      template.hasResourceProperties("AWS::S3::Bucket", {
        PublicAccessBlockConfiguration: Match.objectLike({
          BlockPublicAcls: true,
          BlockPublicPolicy: true,
          IgnorePublicAcls: true,
          RestrictPublicBuckets: true,
        }),
        VersioningConfiguration: { Status: "Enabled" },
      });
      // The bucket must survive a stack teardown — it is the served asset.
      template.hasResource("AWS::S3::Bucket", {
        DeletionPolicy: "Retain",
      });
      template.hasResourceProperties("AWS::S3::BucketPolicy", {
        PolicyDocument: Match.objectLike({
          Statement: Match.arrayWith([
            Match.objectLike({
              Condition: Match.objectLike({
                Bool: { "aws:SecureTransport": "false" },
              }),
              Effect: "Deny",
            }),
          ]),
        }),
      });

      template.hasResourceProperties("AWS::CloudFront::Distribution", {
        DistributionConfig: Match.objectLike({
          Aliases: ["widgets.semblia.com"],
          ViewerCertificate: Match.objectLike({
            AcmCertificateArn: CERT_ARN,
          }),
          DefaultCacheBehavior: Match.objectLike({
            ViewerProtocolPolicy: "redirect-to-https",
            AllowedMethods: ["GET", "HEAD"],
            Compress: true,
          }),
        }),
      });
      // Origin access is OAC-only — no public bucket website, no legacy OAI.
      template.hasResourceProperties(
        "AWS::CloudFront::OriginAccessControl",
        Match.objectLike({
          OriginAccessControlConfig: Match.objectLike({
            SigningBehavior: "always",
            SigningProtocol: "sigv4",
          }),
        }),
      );
    },
  );

  it("refuses api mode without a certificate, and non-us-east-1 certificates", () => {
    expect(() =>
      stackWith({ widgetsCdnCertificateArn: "" }),
    ).toThrow(/widgetsCdnCertificateArn/);
    expect(() =>
      stackWith({
        widgetsCdnCertificateArn: CERT_ARN.replace("us-east-1", "eu-west-1"),
      }),
    ).toThrow(/us-east-1/);
  });

  it("synthesizes without a certificate or aliases in mock mode", () => {
    const app = new cdk.App({ context: { widgetsCdnMode: "mock" } });
    const stack = new WidgetsCdnStack(app, "MockStack", {
      env: { account: "123456789012", region: "us-east-1" },
    });
    const template = Template.fromStack(stack);
    template.hasResourceProperties("AWS::CloudFront::Distribution", {
      DistributionConfig: Match.objectLike({
        Aliases: Match.absent(),
      }),
    });
  });
});
