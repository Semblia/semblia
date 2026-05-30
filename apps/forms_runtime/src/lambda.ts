import { handle } from "hono/aws-lambda";
import { createFormsRuntimeApp } from "./app.js";
import { loadEnv } from "./env.js";

export const handler = handle(createFormsRuntimeApp(loadEnv(process.env)));
