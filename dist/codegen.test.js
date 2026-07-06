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
const index_ts_1 = require("../src/codegen/index.ts");
const index_ts_2 = require("../src/writer/index.ts");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TMP_DIR = '/tmp/pxml-test-codegen';
(0, vitest_1.describe)('PxmlCodegen & FileWriter', () => {
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
            path: path.join(TMP_DIR, 'app/api/posts/route.ts'),
            depends_on: []
        },
        input: [],
        output: [],
        constraints: [],
        tests: []
    };
    (0, vitest_1.it)('should write mock generated code and write files', async () => {
        const writer = new index_ts_2.FileWriter();
        const codegen = new index_ts_1.PxmlCodegen({
            model: 'claude-3-5-sonnet',
            mockResponse: (node) => `// generated code for ${node.id}`
        });
        const code = await codegen.generateNodeCode(mockNode, 'Context Info', writer);
        (0, vitest_1.expect)(code).toBe('// generated code for api.posts.create');
        (0, vitest_1.expect)(fs.readFileSync(mockNode.meta.path, 'utf-8')).toBe(code);
    });
    (0, vitest_1.it)('should support dry-run without writing files', async () => {
        const writer = new index_ts_2.FileWriter(true); // dryRun = true
        const codegen = new index_ts_1.PxmlCodegen({
            model: 'claude-3-5-sonnet',
            mockResponse: (node) => `// generated code for ${node.id}`
        });
        await codegen.generateNodeCode(mockNode, 'Context Info', writer);
        (0, vitest_1.expect)(fs.existsSync(mockNode.meta.path)).toBe(false);
    });
    (0, vitest_1.it)('should support rollback to original content', async () => {
        const writer = new index_ts_2.FileWriter();
        const testFile = path.join(TMP_DIR, 'test-rollback.txt');
        fs.mkdirSync(path.dirname(testFile), { recursive: true });
        fs.writeFileSync(testFile, 'original content', 'utf-8');
        writer.write(testFile, 'new content');
        (0, vitest_1.expect)(fs.readFileSync(testFile, 'utf-8')).toBe('new content');
        writer.rollback();
        (0, vitest_1.expect)(fs.readFileSync(testFile, 'utf-8')).toBe('original content');
    });
});
