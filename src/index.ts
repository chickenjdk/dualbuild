import { build, type Plugin } from "esbuild";
import { readDirAll } from "./utils/fs.js";
import * as transformPlugin from "./transformPlugin.js";
import * as corePlugins from "./plugins/index.js";

export * as transformPlugin from "./transformPlugin.js";
export * as corePlugins from "./plugins/index.js";

const typeToExtension = { esm: ".mjs", cjs: ".cjs", iife: ".js" } as const;
export function buildIndividual(
  sourceDirectory: string,
  outputDirectory: string,
  {
    outputFormat,
    rewriteExtensions = true,
    fileExtension = rewriteExtensions ? typeToExtension[outputFormat] : ".js",
    projectRoot = process.cwd(),
    sourceRoot = sourceDirectory,
    extraBabelPlugins = [],
    sourceMaps = true,
  }: {
    outputFormat: "esm" | "cjs" | "iife";
    fileExtension?: `.${string}`;
    rewriteExtensions?: boolean;
    projectRoot?: string;
    sourceRoot?: string;
    extraBabelPlugins?: transformPlugin.TransformerPlugin[];
    extraEsbuildPlugins?: Plugin[];
    sourceMaps?: boolean;
  },
) {
  const usingPlugins: transformPlugin.TransformerPlugin[] = [];

  let outExtension = {};
  if (rewriteExtensions) {
    const allExtensions = Object.values(typeToExtension);
    outExtension = Object.fromEntries(
      allExtensions.map((fromExt) => [fromExt, fileExtension]),
    );
    console.log(outExtension);
    usingPlugins.push(
      corePlugins.importRewrite.importRewritePlugin({
        mappings: outExtension,
      }),
    );
  }

  usingPlugins.push(
    corePlugins.classId.classIdPlugin({
      root: projectRoot,
      filesRoot: sourceRoot,
    }),
  );

  usingPlugins.push(...extraBabelPlugins);

  return build({
    minify: false,
    bundle: false,
    outdir: outputDirectory,
    entryPoints: readDirAll(sourceDirectory),
    plugins: [transformPlugin.babelTransformers(usingPlugins)],
    outExtension: { ".js": fileExtension },
    format: outputFormat,
    sourcemap: sourceMaps,
  });
}
