"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PxmlParser = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const fast_xml_parser_1 = require("fast-xml-parser");
const schema_js_1 = require("./schema.js");
class PxmlParser {
    visitedFiles = new Set();
    loadedProjects = new Map();
    parse(filePath) {
        const absolutePath = path.resolve(filePath);
        if (this.visitedFiles.has(absolutePath)) {
            throw new Error(`Circular import detected: ${Array.from(this.visitedFiles).join(' -> ')} -> ${absolutePath}`);
        }
        this.visitedFiles.add(absolutePath);
        if (!fs.existsSync(absolutePath)) {
            throw new Error(`File not found: ${absolutePath}`);
        }
        const xmlContent = fs.readFileSync(absolutePath, 'utf-8');
        const options = {
            ignoreAttributes: false,
            attributeNamePrefix: '@_',
            allowBooleanAttributes: true,
            parseAttributeValue: true,
        };
        const parser = new fast_xml_parser_1.XMLParser(options);
        const parsedObj = parser.parse(xmlContent);
        if (!parsedObj.project) {
            throw new Error(`Invalid pxml file: root element must be <project> in ${absolutePath}`);
        }
        const rawProj = parsedObj.project;
        const name = String(rawProj['@_name'] || '');
        const stack = String(rawProj['@_stack'] || '');
        const version = String(rawProj['@_version'] || '');
        const rawImports = rawProj.import
            ? (Array.isArray(rawProj.import) ? rawProj.import : [rawProj.import])
            : [];
        const parsedImports = rawImports.map(imp => ({
            src: imp['@_src'],
            as: imp['@_as']
        }));
        const rawNodes = rawProj.node
            ? (Array.isArray(rawProj.node) ? rawProj.node : [rawProj.node])
            : [];
        const nodes = rawNodes.map(rn => {
            const dependsRaw = rn.meta?.depends_on;
            const dependsOn = [];
            if (typeof dependsRaw === 'string') {
                dependsOn.push(dependsRaw);
            }
            else if (Array.isArray(dependsRaw)) {
                dependsOn.push(...dependsRaw);
            }
            const inputRaw = rn.input?.field;
            const input = inputRaw
                ? (Array.isArray(inputRaw) ? inputRaw : [inputRaw]).map(f => ({
                    name: f['@_name'],
                    type: f['@_type'],
                    required: f['@_required'] !== undefined ? String(f['@_required']) === 'true' : true,
                    format: f['@_format']
                }))
                : [];
            const outputRaw = rn.output?.field;
            const output = outputRaw
                ? (Array.isArray(outputRaw) ? outputRaw : [outputRaw]).map(f => ({
                    name: f['@_name'],
                    type: f['@_type'],
                    required: f['@_required'] !== undefined ? String(f['@_required']) === 'true' : true,
                    format: f['@_format']
                }))
                : [];
            const constraintRaw = rn.constraint;
            const constraints = constraintRaw
                ? (Array.isArray(constraintRaw) ? constraintRaw : [constraintRaw]).map(c => {
                    const verify = c['@_verify'] || 'static';
                    const description = typeof c === 'object' ? c['#text'] || '' : String(c);
                    return { verify, description };
                })
                : [];
            const testRaw = rn.test;
            const tests = testRaw
                ? (Array.isArray(testRaw) ? testRaw : [testRaw]).map(t => {
                    const nameVal = t.name || '';
                    const given = t.given || {};
                    const expectRaw = t.expect || {};
                    const expect = {
                        field: expectRaw.field,
                        status: expectRaw.status !== undefined ? Number(expectRaw.status) : undefined,
                        body: expectRaw.body,
                        contains: expectRaw.contains,
                        match: expectRaw.match
                    };
                    return { name: nameVal, given, expect };
                })
                : [];
            return schema_js_1.NodeSchema.parse({
                id: rn['@_id'],
                type: rn['@_type'],
                flow: rn['@_flow'],
                extends: rn['@_extends'],
                meta: {
                    path: rn.meta?.path || '',
                    depends_on: dependsOn
                },
                input,
                output,
                constraints,
                tests
            });
        });
        const currentProject = schema_js_1.ProjectSchema.parse({
            name,
            stack,
            version,
            imports: parsedImports,
            nodes
        });
        this.loadedProjects.set(absolutePath, currentProject);
        // Resolve imports recursively and build final flattened project AST
        const baseDir = path.dirname(absolutePath);
        const resolvedNodes = [];
        // Track imported files to avoid duplicate parsing/nodes if imported multiple times
        const importedPaths = new Set();
        const prefixNode = (node, namespace) => {
            const prefixId = (id) => {
                if (id.includes(':')) {
                    // If it already has namespace, prepend new namespace
                    return `${namespace}:${id}`;
                }
                return `${namespace}:${id}`;
            };
            return {
                ...node,
                id: prefixId(node.id),
                extends: node.extends ? prefixId(node.extends) : undefined,
                meta: {
                    ...node.meta,
                    depends_on: node.meta.depends_on.map(prefixId)
                }
            };
        };
        for (const imp of currentProject.imports) {
            const importedPath = path.resolve(baseDir, imp.src);
            if (importedPaths.has(importedPath))
                continue;
            importedPaths.add(importedPath);
            const importedProj = this.parse(importedPath);
            // We only prefix nodes that were defined in the imported project,
            // which includes nodes it has imported. Let's make sure we prefix all of them.
            const prefixedNodes = importedProj.nodes.map(node => prefixNode(node, imp.as));
            resolvedNodes.push(...prefixedNodes);
        }
        // Only include currentProject nodes if this is NOT an imported project,
        // or include them and let the caller manage prefixing.
        // Actually, to make a unified flat AST, the entry project XML (e.g. project.xml) has nodes of its own,
        // and also brings in imported nodes.
        // If we are parsing a nested import, we return its nodes, which get prefixed by the parent parser.
        // So the parser call should just return the currentProject.nodes.
        // But wait! If currentProject has nodes and imports, does currentProject.nodes already get returned? Yes.
        // But does currentProject.nodes contain the resolved import nodes? No, they are only in resolvedNodes.
        // So we should return resolvedNodes (which includes currentProject.nodes plus the prefixed imported nodes).
        resolvedNodes.push(...currentProject.nodes);
        this.visitedFiles.delete(absolutePath);
        // Print resolved node IDs for debugging if needed
        // console.log(resolvedNodes.map(n => n.id));
        // Dedup nodes here to avoid extending issues or duplicate resolve calls
        const resolvedNodesMap = new Map();
        for (const node of resolvedNodes) {
            resolvedNodesMap.set(node.id, node);
        }
        const uniqueResolvedNodes = Array.from(resolvedNodesMap.values());
        const finalNodes = this.resolveExtends(uniqueResolvedNodes);
        // Deduplicate nodes by id, taking the last defined (allows overrides)
        const dedupedMap = new Map();
        for (const node of finalNodes) {
            dedupedMap.set(node.id, node);
        }
        return {
            ...currentProject,
            imports: [], // Empty imports as they are now flattened
            nodes: Array.from(dedupedMap.values())
        };
    }
    resolveExtends(nodes) {
        const nodeMap = new Map(nodes.map(n => [n.id, n]));
        const resolvedMap = new Map();
        const resolveNode = (id, depth = 0) => {
            if (depth > 2) {
                throw new Error(`Inheritance depth limit exceeded (max 2 levels) for node: ${id}`);
            }
            if (resolvedMap.has(id)) {
                return resolvedMap.get(id);
            }
            const node = nodeMap.get(id);
            if (!node) {
                throw new Error(`Node not found to extend: ${id}`);
            }
            if (!node.extends) {
                resolvedMap.set(id, node);
                return node;
            }
            const parentNode = resolveNode(node.extends, depth + 1);
            // Merge constraints and tests
            const mergedConstraints = [...parentNode.constraints];
            for (const childC of node.constraints) {
                // Prevent duplicate constraints if merged already
                if (!mergedConstraints.some(c => c.description === childC.description)) {
                    mergedConstraints.push(childC);
                }
            }
            const mergedTests = [...parentNode.tests];
            for (const childT of node.tests) {
                if (!mergedTests.some(t => t.name === childT.name)) {
                    mergedTests.push(childT);
                }
            }
            const mergedNode = {
                ...node,
                // If meta.path is not specified, inherit from parent
                meta: {
                    path: node.meta.path || parentNode.meta.path,
                    depends_on: Array.from(new Set([...node.meta.depends_on, ...parentNode.meta.depends_on]))
                },
                input: [...parentNode.input, ...node.input],
                output: [...parentNode.output, ...node.output],
                constraints: mergedConstraints,
                tests: mergedTests
            };
            resolvedMap.set(id, mergedNode);
            return mergedNode;
        };
        return nodes.map(node => resolveNode(node.id));
    }
}
exports.PxmlParser = PxmlParser;
