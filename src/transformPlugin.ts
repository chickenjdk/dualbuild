import fs from "fs";
import generate from "@babel/generator";
import { parse, type ParseResult } from "@babel/parser";
import type { OnLoadArgs, PluginBuild } from "esbuild";

export type TransformerPlugin = (ast: ParseResult, args: OnLoadArgs) => void;
// Careful with this, source maps can easily break
export function babelTransformers(plugins: TransformerPlugin[]) {
  return {
    name: "babel-transformers",
    setup(build: PluginBuild) {
      build.onLoad({ filter: /\.[tj]sx?$/ }, async (args) => {
        const source = await fs.promises.readFile(args.path, "utf8");

        const ast = parse(source, {
          sourceType: "module",
          plugins: ["typescript", "jsx"],
          // Needed for working source maps
          sourceFilename: args.path,
        });

        for (const plugin of plugins) {
          plugin(ast, args);
        }

        const { code, map } = generate.default(
          ast,
          {
            sourceMaps: true,
          },
          // Needed for source maps
          source,
        );
        return {
          contents:
            code +
            // Inline the source maps
            "\n//# sourceMappingURL=data:application/json;base64," +
            Buffer.from(JSON.stringify(map)).toString("base64"),
          loader: "ts",
        };
      });
    },
  };
}
