import * as cdk from "aws-cdk-lib";
import { FormsRuntimeStack } from "./forms-runtime-stack.js";

const app = new cdk.App();

new FormsRuntimeStack(app, "SembliaFormsRuntimeStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
});
