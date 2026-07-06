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
const index_ts_1 = require("../src/cache/index.ts");
const index_ts_2 = require("../src/manifest/index.ts");
const fs = __importStar(require("fs"));
const TMP_DIR = '/tmp/pxml-test-manifest';
(0, vitest_1.describe)('PxmlCache & Manifest', () => {
    (0, vitest_1.beforeEach)(() => {
        if (fs.existsSync(TMP_DIR)) {
            fs.rmSync(TMP_DIR, { recursive: true, force: true });
        }
    });
    (0, vitest_1.afterEach)(() => {
        if (fs.existsSync(TMP_DIR)) {
            fs.rmSync(TMP_DIR, { recursive: true, force: true });
        }
    });
    const mockNode = {
        id: 'api.posts.create',
        type: 'api-route',
        flow: 'blog.write',
        meta: {
            path: 'app/api/posts/route.ts',
            depends_on: []
        },
        input: [],
        output: [],
        constraints: [],
        tests: []
    };
    (0, vitest_1.it)('should generate stable hash for same node structure', () => {
        const hash1 = index_ts_1.PxmlCache.hashNode(mockNode);
        const hash2 = index_ts_1.PxmlCache.hashNode({ ...mockNode });
        (0, vitest_1.expect)(hash1).toBe(hash2);
        const changedNode = { ...mockNode, flow: 'blog.admin' };
        const hash3 = index_ts_1.PxmlCache.hashNode(changedNode);
        (0, vitest_1.expect)(hash1).not.toBe(hash3);
    });
    (0, vitest_1.it)('should load, update, save, and lock manifest states', () => {
        const manifest = new index_ts_2.PxmlManifest(TMP_DIR, 'test-project', '0.1.0');
        const hash = index_ts_1.PxmlCache.hashNode(mockNode);
        manifest.setNode(mockNode.id, {
            node_id: mockNode.id,
            source_file: 'blog.xml',
            xml_hash: hash,
            output_files: [mockNode.meta.path],
            depends_on: mockNode.meta.depends_on,
            flow: mockNode.flow,
            generated_at: new Date().toISOString()
        });
        manifest.save();
        // Re-load
        const manifest2 = new index_ts_2.PxmlManifest(TMP_DIR, 'test-project', '0.1.0');
        const node = manifest2.getNode(mockNode.id);
        (0, vitest_1.expect)(node).toBeDefined();
        (0, vitest_1.expect)(node?.xml_hash).toBe(hash);
        (0, vitest_1.expect)(node?.locked).toBe(false);
        // Lock node
        manifest2.lockNode(mockNode.id, true);
        const lockedNode = new index_ts_2.PxmlManifest(TMP_DIR, 'test-project', '0.1.0').getNode(mockNode.id);
        (0, vitest_1.expect)(lockedNode?.locked).toBe(true);
    });
});
