import { readFile } from "fs/promises";
import type {
    AssignmentExpression,
    SequenceExpression,
    VariableDeclaration,
    SimpleLiteral,
    VariableDeclarator,
    Identifier,
    Node
} from "estree";
import { ImportSpecifier, parse } from "acorn";
import { print } from "esrap";
import { compile } from "../plugins/compile.js";
import * as primitives from "../internal/primitives.js";
import { serialize, deserialize, materialize } from "../internal/index.js";

function adaptImportsExports(source: string): string {
    const ast = parse("const $$exports = {};" + source + ";return $$exports;", {
        sourceType: "module",
        ecmaVersion: "latest",
        allowReturnOutsideFunction: true
    });

    // @ts-expect-error annoying mismatch between estree and acorn
    ast.body = ast.body.flatMap((node) => {
        if (node.type === "ImportDeclaration") {
            // import { imported as local } from "some-module"
            // becomes
            // var { imported: local } = $$imports["some-module"]

            const new_node_declaration = {
                type: "VariableDeclarator",
                id: {
                    type: "ObjectPattern",
                    properties: node.specifiers
                        .filter(
                            (x): x is ImportSpecifier =>
                                x.type === "ImportSpecifier"
                        )
                        .map((specifier) => ({
                            type: "Property",
                            method: false,
                            shorthand: true,
                            computed: false,
                            key: specifier.imported as Identifier,
                            kind: "init",
                            value: specifier.local
                        }))
                },
                init: {
                    type: "MemberExpression",
                    object: {
                        type: "Identifier",
                        name: "$$imports"
                    },
                    property: node.source as SimpleLiteral,
                    computed: true,
                    optional: false
                }
            } satisfies VariableDeclarator;

            return {
                type: "VariableDeclaration",
                kind: "var",
                declarations: [new_node_declaration]
            } satisfies VariableDeclaration;
        } else if (node.type === "ExportNamedDeclaration") {
            if (node.declaration?.type === "VariableDeclaration") {
                // export var x = 1;
                // becomes
                // var x = 1; $$exports.x = x;
                return [
                    node.declaration,
                    {
                        type: "SequenceExpression",
                        expressions: node.declaration.declarations.map(
                            (declaration) => ({
                                type: "AssignmentExpression",
                                operator: "=",
                                left: {
                                    type: "MemberExpression",
                                    object: {
                                        type: "Identifier",
                                        name: "$$exports"
                                    },
                                    property: declaration.id as Identifier,
                                    computed: false,
                                    optional: false
                                },
                                right: declaration.id as Identifier
                            })
                        )
                    } satisfies SequenceExpression
                ];
            } else if (node.declaration) {
                // export function x() {}
                // becomes
                // function x() {} $$exports.x = x;
                return [
                    node.declaration,
                    {
                        type: "AssignmentExpression",
                        operator: "=",
                        left: {
                            type: "MemberExpression",
                            object: {
                                type: "Identifier",
                                name: "$$exports"
                            },
                            property: node.declaration.id,
                            computed: false,
                            optional: false
                        },
                        right: node.declaration.id
                    } satisfies AssignmentExpression
                ];
            } else if (node.source) {
                // export { x, y, z } from "some-module"
                // becomes
                // $$exports.x = $$imports["some-module"].x, $$exports.y = $$imports["some-module"].y, $$exports.z = $$imports["some-module"].z;
                return {
                    type: "SequenceExpression",
                    expressions: node.specifiers.map((specifier) => ({
                        type: "AssignmentExpression",
                        operator: "=",
                        left: {
                            type: "MemberExpression",
                            object: {
                                type: "Identifier",
                                name: "$$exports"
                            },
                            property: specifier.exported as SimpleLiteral,
                            computed: false,
                            optional: false
                        },
                        right: {
                            type: "MemberExpression",
                            object: {
                                type: "MemberExpression",
                                object: {
                                    type: "Identifier",
                                    name: "$$imports"
                                },
                                property: node.source as SimpleLiteral,
                                computed: true,
                                optional: false
                            },
                            property: specifier.exported as Identifier,
                            computed: false,
                            optional: false
                        }
                    }))
                } satisfies SequenceExpression;
            } else {
                // export { x, y, z }
                // becomes
                // $$exports.x = x, $$exports.y = y, $$exports.z = z;
                return {
                    type: "SequenceExpression",
                    expressions: node.specifiers.map((specifier) => ({
                        type: "AssignmentExpression",
                        operator: "=",
                        left: {
                            type: "MemberExpression",
                            object: {
                                type: "Identifier",
                                name: "$$exports"
                            },
                            property: specifier.exported as SimpleLiteral,
                            computed: false,
                            optional: false
                        },
                        right: specifier.exported as Identifier
                    }))
                } satisfies SequenceExpression;
            }
        } else {
            return node;
        }
    });

    return print(ast as unknown as Node).code;
}

type ModuleExports = {
    serialize: typeof import("../internal/index.js").serialize;
    deserialize: typeof import("../internal/index.js").deserialize;
    materialize: typeof import("../internal/index.js").materialize;
} & Record<string, import("../internal/index.js").PestType<unknown>>;

const AsyncFunction = async function () {}.constructor as FunctionConstructor;
export function getModule(source: string): Promise<ModuleExports> {
    const adapted_for_function = adaptImportsExports(source);
    return new AsyncFunction("$$imports", adapted_for_function)({
        "pest/internal": {
            serialize,
            deserialize,
            materialize,
            ...primitives
        }
    });
}

export async function getSingleModule(
    filename: string | URL
): Promise<ModuleExports> {
    const source = await readFile(filename, "utf-8");

    const boilerplate = compile(source, {
        as: "javascript"
    });

    return getModule(boilerplate);
}
