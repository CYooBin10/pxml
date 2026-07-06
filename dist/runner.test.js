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
const index_ts_1 = require("../src/testgen/index.ts");
const index_ts_2 = require("../src/runner/index.ts");
const index_ts_3 = require("../src/writer/index.ts");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const TMP_DIR = '/tmp/pxml-test-runner';
(0, vitest_1.describe)('PxmlTestgen & PxmlRunner', () => {
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
        id: 'api.posts.list',
        type: 'api-route',
        flow: 'blog.read',
        meta: {
            path: path.join(TMP_DIR, 'app/api/posts/route.ts'),
            depends_on: []
        },
        input: [],
        output: [],
        constraints: [],
        tests: [
            {
                name: 'Get posts list default page size',
                given: { query: { limit: 10 } },
                expect: {
                    status: 200,
                    contains: 'posts'
                }
            }
        ]
    };
    (0, vitest_1.it)('should compile XML tests to Vitest format', () => {
        const code = index_ts_1.PxmlTestgen.generateTestFileContent(mockNode, path.join(TMP_DIR, '.pxml/tests/api.posts.list.test.ts'));
        (0, vitest_1.expect)(code).toContain("describe(\"api.posts.list\"");
        (0, vitest_1.expect)(code).toContain("it(\"Get posts list default page size\"");
        (0, vitest_1.expect)(code).toContain("expect(res.status).toBe(200);");
    });
    (0, vitest_1.it)('should run generated test successfully when file code exists', () => {
        const writer = new index_ts_3.FileWriter();
        const runner = new index_ts_2.PxmlRunner(TMP_DIR, writer);
        // Write a mock implementation file that exports a default handler returning posts
        const implCode = `
export default async function handler(req) {
  return {
    status: 200,
    json: async () => ({ posts: [] })
  };
}
`;
        writer.write(mockNode.meta.path, implCode);
        const result = runner.runNodeTests(mockNode);
        (0, vitest_1.expect)(result.passed).toBe(true);
        (0, vitest_1.expect)(result.results['Get posts list default page size']).toBe('pass');
    });
    (0, vitest_1.it)('should report failure when test expectation fails', () => {
        const writer = new index_ts_3.FileWriter();
        const runner = new index_ts_2.PxmlRunner(TMP_DIR, writer);
        // Mock implementation file returning 500
        const implCode = `
export default async function handler(req) {
  return {
    status: 500,
    json: async () => ({ error: 'internal server error' })
  };
}
`;
        writer.write(mockNode.meta.path, implCode);
        const result = runner.runNodeTests(mockNode);
        (0, vitest_1.expect)(result.passed).toBe(false);
        (0, vitest_1.expect)(result.results['Get posts list default page size']).toBe('fail');
    });
});
