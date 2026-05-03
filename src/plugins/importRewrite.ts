import traverse from "@babel/traverse";
import { type TransformerPlugin } from "../transformPlugin.js";

export type extensionMapping = { [from: `.${string}`]: `.${string}` };
/**
 * Rewrite imports to use a different file extension
 * @param options The options for this plugin
 * @returns
 */
export function importRewritePlugin(options: { mappings: extensionMapping }) {
  const { mappings } = options;
  function replaceExtension(value: string) {
    // Inclusive, includes the /
    const extensionStart = value.lastIndexOf(".");
    const extension = value.slice(extensionStart);
    if (extensionStart !== -1) {
      if (extension in mappings) {
        const newExtension = mappings[extension as keyof typeof mappings];
        console.log(
          `${value} => ${value.slice(0, extensionStart) + newExtension}`,
        );
        return value.slice(0, extensionStart) + newExtension;
      }
    }
    return value;
  }
  return function (ast) {
    traverse.default(ast, {
      // All of these handle esm
      ImportDeclaration(path) {
        path.node.source.value = replaceExtension(path.node.source.value);
      },
      ExportAllDeclaration(path) {
        const val = path.node.source.value;
        if (val) {
          path.node.source.value = replaceExtension(path.node.source.value);
        }
      },
      ExportNamedDeclaration(path) {
        if (path.node.source) {
          path.node.source.value = replaceExtension(path.node.source.value);
        }
      },
      Import(path) {
        // Dynamic import
        const parent = path.parent;
        if ("arguments" in parent && parent.arguments.length === 1) {
          const arg = parent.arguments[0];
          if (arg && arg.type === "StringLiteral") {
            arg.value = replaceExtension(arg.value);
          }
        }
      },
      // Commonjs
      CallExpression(path) {
        const callee = path.get("callee");

        if (
          callee.isIdentifier({ name: "require" }) &&
          path.node.arguments.length === 1
        ) {
          const arg = path.node.arguments[0];
          if (arg && arg.type === "StringLiteral") {
            arg.value = replaceExtension(arg.value);
          }
        }
      },
    });
  } satisfies TransformerPlugin;
}
