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
const fix_ts_1 = require("../src/cli/fix.ts");
const index_ts_1 = require("../src/manifest/index.ts");
const index_ts_2 = require("../src/codegen/index.ts");
const index_ts_3 = require("../src/runner/index.ts");
const index_ts_4 = require("../src/writer/index.ts");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TMP_DIR = '/tmp/pxml-test-fix';
(0, vitest_1.describe)('Fix self-healing loop', () => {
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
        tests: [
            {
                name: 'Create post successful',
                given: { query: { title: 'hello' } },
                expect: {
                    status: 200,
                    contains: 'success'
                }
            }
        ]
    };
    (0, vitest_1.it)('should run fix loop successfully with AI patches', async () => {
        const writer = new index_ts_4.FileWriter();
        const manifest = new index_ts_1.PxmlManifest(TMP_DIR, 'test-project', '0.1.0');
        // First, compile node which will fail initially (we write empty or broken code)
        const initialCode = `
export default async function handler(req) {
  return {
    status: 500,
    json: async () => ({})
  };
}
`;
        writer.write(mockNode.meta.path, initialCode);
        manifest.setNode(mockNode.id, {
            node_id: mockNode.id,
            source_file: 'project.xml',
            xml_hash: '123',
            output_files: [mockNode.meta.path],
            depends_on: [],
            flow: mockNode.flow
        });
        manifest.save();
        const codegen = new index_ts_2.PxmlCodegen({
            model: 'claude-3-5-sonnet',
            mockResponse: () => ''
        });
        const runner = new index_ts_3.PxmlRunner(TMP_DIR, writer);
        // Patch that AI is supposed to return:
        const mockPatch = `
<<<<<<< SEARCH
export default async function handler(req) {
  return {
    status: 500,
    json: async () => ({})
  };
}
=======
export default async function handler(req) {
  return {
    status: 200,
    json: async () => ({ success: true })
  };
}
>>>>>>> REPLACE
`;
        const success = await (0, fix_ts_1.runFixLoop)(mockNode, TMP_DIR, manifest, codegen, runner, writer, mockPatch);
        (0, vitest_1.expect)(success).toBe(true);
        (0, vitest_1.expect)(fs.readFileSync(mockNode.meta.path, 'utf-8')).toContain('success: true');
    });
});
