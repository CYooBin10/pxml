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
const vitest_1 = require("vitest");
const index_ts_1 = require("../src/parser/index.ts");
const index_ts_2 = require("../src/graph/index.ts");
const path = __importStar(require("path"));
(0, vitest_1.describe)('PxmlParser', () => {
    (0, vitest_1.it)('should parse project, resolve imports, merge extends, and detect cycles', () => {
        const parser = new index_ts_1.PxmlParser();
        const projectXml = path.resolve(__dirname, '../fixtures/project.xml');
        const project = parser.parse(projectXml);
        (0, vitest_1.expect)(project.name).toBe('main-blog');
        (0, vitest_1.expect)(project.nodes.length).toBe(3); // base.api-route, db.post, and api.posts.list (with namespace prefixes)
        const listNode = project.nodes.find(n => n.id === 'read:api.posts.list');
        (0, vitest_1.expect)(listNode).toBeDefined();
        (0, vitest_1.expect)(listNode?.type).toBe('api-route');
        // Inherited metadata and constraints
        (0, vitest_1.expect)(listNode?.meta.path).toBe('app/api/posts/route.ts');
        (0, vitest_1.expect)(listNode?.constraints.length).toBe(3); // 1 from parent, 2 from listNode
        (0, vitest_1.expect)(listNode?.constraints[0].description).toBe('No sensitive data leakage in response or logs');
        (0, vitest_1.expect)(listNode?.constraints[1].description).toBe('Sắp xếp theo publishedAt giảm dần');
    });
    (0, vitest_1.it)('should throw circular import error', () => {
        const parser = new index_ts_1.PxmlParser();
        const fs = require('fs');
        fs.writeFileSync('/tmp/a.xml', `<project name="a" stack="nextjs" version="0.1.0"><import src="b.xml" as="b"/></project>`);
        fs.writeFileSync('/tmp/b.xml', `<project name="b" stack="nextjs" version="0.1.0"><import src="a.xml" as="a"/></project>`);
        (0, vitest_1.expect)(() => parser.parse('/tmp/a.xml')).toThrow('Circular import detected');
    });
});
(0, vitest_1.describe)('DependencyGraph', () => {
    (0, vitest_1.it)('should sort nodes topologically and detect circular dependency', () => {
        const parser = new index_ts_1.PxmlParser();
        const projectXml = path.resolve(__dirname, '../fixtures/project.xml');
        const project = parser.parse(projectXml);
        const graph = new index_ts_2.DependencyGraph(project.nodes);
        const order = graph.getSortOrder();
        // db.post should come before api.posts.list because api.posts.list depends on db.post
        const dbIndex = order.indexOf('read:types:db.post');
        const apiIndex = order.indexOf('read:api.posts.list');
        (0, vitest_1.expect)(dbIndex).toBeGreaterThan(-1);
        (0, vitest_1.expect)(apiIndex).toBeGreaterThan(-1);
        (0, vitest_1.expect)(dbIndex).toBeLessThan(apiIndex);
    });
});
