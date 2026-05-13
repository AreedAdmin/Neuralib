import { defineFunction } from "@aws-amplify/backend";

/**
 * Tectonic compile function.
 *
 * NOTE: this is currently a Node-zip function for scaffolding only — Tectonic is
 * NOT in the package. To actually run cloud compiles, switch to a container-image
 * function (see ./Dockerfile) by adapting backend.ts to use CDK-level overrides:
 *
 *   import { DockerImageCode, DockerImageFunction } from "aws-cdk-lib/aws-lambda";
 *   ...
 *   const fn = new DockerImageFunction(stack, "compile-tex", {
 *     code: DockerImageCode.fromImageAsset("amplify/functions/compile-tex"),
 *     memorySize: 1024,
 *     timeout: Duration.seconds(30),
 *   });
 *
 * Until that's wired up, the Next.js `/api/compile` route shells out to a local
 * Tectonic install. Set COMPILE_FUNCTION_URL in env once the cloud function is
 * deployed and the route will switch to invoking the Lambda over HTTPS.
 */
export const compileTex = defineFunction({
  name: "compile-tex",
  entry: "./handler.ts",
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 1024,
});
