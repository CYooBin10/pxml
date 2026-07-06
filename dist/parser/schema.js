"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectSchema = exports.NodeSchema = exports.TestCaseSchema = exports.TestExpectSchema = exports.ConstraintSchema = exports.FieldSchema = exports.MetaSchema = exports.ImportSchema = void 0;
const zod_1 = require("zod");
exports.ImportSchema = zod_1.z.object({
    src: zod_1.z.string(),
    as: zod_1.z.string()
});
exports.MetaSchema = zod_1.z.object({
    path: zod_1.z.string(),
    depends_on: zod_1.z.array(zod_1.z.string()).default([])
});
exports.FieldSchema = zod_1.z.object({
    name: zod_1.z.string(),
    type: zod_1.z.string(),
    required: zod_1.z.boolean().default(true),
    format: zod_1.z.string().optional()
});
exports.ConstraintSchema = zod_1.z.object({
    verify: zod_1.z.enum(['static', 'llm-judge']).default('static'),
    description: zod_1.z.string()
});
exports.TestExpectSchema = zod_1.z.object({
    field: zod_1.z.string().optional(),
    status: zod_1.z.number().optional(),
    body: zod_1.z.any().optional(),
    contains: zod_1.z.string().optional(),
    match: zod_1.z.string().optional()
});
exports.TestCaseSchema = zod_1.z.object({
    name: zod_1.z.string(),
    given: zod_1.z.any(),
    expect: exports.TestExpectSchema
});
exports.NodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['api-route', 'ui-component', 'db-model', 'middleware']), // EXTENSION POINT: Add custom node types here
    flow: zod_1.z.string(),
    extends: zod_1.z.string().optional(),
    meta: exports.MetaSchema,
    input: zod_1.z.array(exports.FieldSchema).default([]),
    output: zod_1.z.array(exports.FieldSchema).default([]),
    constraints: zod_1.z.array(exports.ConstraintSchema).default([]),
    tests: zod_1.z.array(exports.TestCaseSchema).default([])
});
exports.ProjectSchema = zod_1.z.object({
    name: zod_1.z.string(),
    stack: zod_1.z.enum(['nextjs']), // EXTENSION POINT: Expand backend/frontend stack types
    version: zod_1.z.string(),
    imports: zod_1.z.array(exports.ImportSchema).default([]),
    nodes: zod_1.z.array(exports.NodeSchema).default([])
});
