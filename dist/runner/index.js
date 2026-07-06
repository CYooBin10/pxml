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
exports.PxmlRunner = void 0;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const index_js_1 = require("../testgen/index.js");
class PxmlRunner {
    projectDir;
    writer;
    constructor(projectDir, writer) {
        this.projectDir = path.resolve(projectDir);
        this.writer = writer;
    }
    runNodeTests(node) {
        if (node.tests.length === 0) {
            return { passed: true, results: {} };
        }
        const testDir = path.join(this.projectDir, '.pxml', 'tests');
        const safeNodeId = node.id.replace(/:/g, '_');
        const testFilePath = path.join(testDir, `${safeNodeId}.test.ts`);
        const testFileContent = index_js_1.PxmlTestgen.generateTestFileContent(node, testFilePath);
        // Write test file temporarily (using physical writer or file system if dry-run allows write tests)
        this.writer.write(testFilePath, testFileContent);
        // If dryRun, return mock pass since we can't run tests on non-existent files
        if (this.writer.getHistory().some(h => h.filePath === testFilePath) && fs.existsSync(testFilePath) === false) {
            const mockResults = {};
            for (const t of node.tests) {
                mockResults[t.name] = 'pass';
            }
            return { passed: true, results: mockResults };
        }
        // Execute vitest
        let passed = false;
        const results = {};
        try {
            (0, child_process_1.execSync)(`npx vitest run ${testFilePath}`, { stdio: 'pipe', cwd: this.projectDir });
            passed = true;
            for (const t of node.tests) {
                results[t.name] = 'pass';
            }
        }
        catch (error) {
            passed = false;
            const stdout = error.stdout?.toString() || '';
            const stderr = error.stderr?.toString() || '';
            // Parse Vitest stdout to see which exact cases failed
            for (const t of node.tests) {
                if (stdout.includes(`× ${t.name}`) || stderr.includes(`× ${t.name}`) || stdout.includes(`fail`) || error.message.includes('fail')) {
                    results[t.name] = 'fail';
                }
                else {
                    // If we can't pinpoint, assume fail if suite failed, otherwise pass
                    results[t.name] = 'fail';
                }
            }
        }
        return { passed, results };
    }
}
exports.PxmlRunner = PxmlRunner;
