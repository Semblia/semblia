import * as cdk from "aws-cdk-lib";
import { WidgetsCdnStack } from "./widgets-cdn-stack.js";

const app = new cdk.App();

new WidgetsCdnStack(app, "SembliaWidgetsCdnStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
