import fs from "fs";
import path from "path";
import crypto from "crypto";
import * as t from "@babel/types";
import traverse from "@babel/traverse";
import type { TransformerPlugin } from "../transformPlugin.js";

export function classIdPlugin(
  options: { root?: string; filesRoot?: string } = {},
) {
  const { root = process.cwd(), filesRoot = root } = options;

  const pkg = JSON.parse(
    fs.readFileSync(path.join(root, "package.json"), "utf8"),
  );

  function hashClass(filePath: string, className: string) {
    const relativePath = path.relative(filesRoot, filePath).replace(/\\/g, "/");

    const input = `${pkg.name}@${pkg.version}/${relativePath}.${className}`;

    return crypto.createHash("sha512").update(input).digest("base64");
  }

  return function (ast, args) {
    traverse.default(ast, {
      Class(pathNode) {
        const node = pathNode.node;

        // Only named classes
        let className = node.id?.name;

        if (!className) {
          // Handle: const A = class {}
          if (
            t.isVariableDeclarator(pathNode.parent) &&
            t.isIdentifier(pathNode.parent.id)
          ) {
            className = pathNode.parent.id.name;
          } else {
            return;
          }
        }

        const hash = hashClass(args.path, className);

        // static ____classID____ = "..."
        const classIdProp = t.classProperty(
          t.identifier("____classID____"),
          t.stringLiteral(hash),
          null,
          null,
        );
        classIdProp.static = true;

        // static [Symbol.hasInstance](instance) { ... }
        const classIdCheck = // if (current?.____classID____ === ${className}.____classID____)
          t.ifStatement(
            t.binaryExpression(
              "===",
              t.optionalMemberExpression(
                t.identifier("current"),
                t.identifier("____classID____"),
                false,
                true,
              ),
              t.memberExpression(
                t.identifier(className),
                t.identifier("____classID____"),
              ),
            ),
            t.blockStatement([t.returnStatement(t.booleanLiteral(true))]),
          );
        const hasInstanceMethod = t.classMethod(
          "method",
          t.identifier("Symbol.hasInstance"),
          [t.identifier("instance")],
          t.blockStatement([
            t.variableDeclaration("let", [
              t.variableDeclarator(
                t.identifier("current"),
                t.optionalMemberExpression(
                  t.identifier("instance"),
                  t.identifier("constructor"),
                  false,
                  true,
                ),
              ),
            ]),

            // if (current === void 0) return;
            t.ifStatement(
              t.binaryExpression(
                "===",
                t.identifier("current"),
                t.unaryExpression("void", t.numericLiteral(0)),
              ),
              t.blockStatement([t.returnStatement(t.booleanLiteral(false))]),
            ),

            classIdCheck,

            // while ((current = Object.getPrototypeOf(current)) !== null)
            t.whileStatement(
              t.binaryExpression(
                "!==",
                t.assignmentExpression(
                  "=",
                  t.identifier("current"),
                  t.callExpression(
                    t.memberExpression(
                      t.identifier("Object"),
                      t.identifier("getPrototypeOf"),
                    ),
                    [t.identifier("current")],
                  ),
                ),
                t.nullLiteral(),
              ),
              t.blockStatement([classIdCheck]),
            ),

            // return false;
            t.returnStatement(t.booleanLiteral(false)),
          ]),
        );

        hasInstanceMethod.static = true;
        hasInstanceMethod.computed = true;

        // Inject into class body
        node.body.body.unshift(hasInstanceMethod);
        node.body.body.unshift(classIdProp);
      },
    });
  } satisfies TransformerPlugin;
}
