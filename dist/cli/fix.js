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
exports.runFixLoop = runFixLoop;
const index_js_1 = require("../patcher/index.js");
const fs = __importStar(require("fs"));
async function runFixLoop(node, projectDir, manifest, codegen, runner, writer, mockFixResponse) {
    const maxRetries = 3;
    let attempt = 0;
    console.log(`[FIX] Starting self-healing loop for node: ${node.id} (Max ${maxRetries} attempts)`);
    while (attempt < maxRetries) {
        attempt++;
        console.log(`[FIX] Attempt ${attempt}/${maxRetries}...`);
        // 1. Gather failure context
        const currentCode = fs.existsSync(node.meta.path) ? fs.readFileSync(node.meta.path, 'utf-8') : '';
        const testResult = runner.runNodeTests(node);
        if (testResult.passed) {
            console.log(`[FIX] Success! Node ${node.id} tests passed on attempt ${attempt}.`);
            // Update manifest
            const existing = manifest.getNode(node.id);
            if (existing) {
                manifest.setNode(node.id, {
                    ...existing,
                    last_test_run: testResult.results
                });
                manifest.save();
            }
            return true;
        }
        // Identify failed cases
        const failedCases = Object.entries(testResult.results)
            .filter(([_, status]) => status === 'fail')
            .map(([name]) => name);
        console.log(`[FIX] Failed test cases: ${failedCases.join(', ')}`);
        // 2. Formulate minimal fix-prompt
        const patchPrompt = `You are a software repair AI. The following code for node '${node.id}' has failed tests:
Path: ${node.meta.path}
Failed Cases: ${failedCases.join(', ')}
Node XML spec:
- Input: ${JSON.stringify(node.input)}
- Output: ${JSON.stringify(node.output)}
- Constraints: ${JSON.stringify(node.constraints)}

Current Code:
\`\`\`typescript
${currentCode}
\`\`\`

Generate a SEARCH/REPLACE block to patch the code and fix the failures. Format:
<<<<<<< SEARCH
[code to replace]
=======
[replacement code]
>>>>>>> REPLACE`;
        // 3. Request diff/patch from AI (or use mock if provided)
        let patch = '';
        if (mockFixResponse) {
            patch = mockFixResponse;
        }
        else {
            // In production, we call the codegen client message creation directly.
            // For this step, we will call our codegen client if configured, otherwise fallback to mock
            // to avoid crash.
            try {
                const client = codegen.client;
                if (client) {
                    const response = await client.messages.create({
                        model: codegen.config.model,
                        max_tokens: 2000,
                        system: "Generate only SEARCH/REPLACE patch block.",
                        messages: [{ role: 'user', content: patchPrompt }]
                    });
                    patch = response.content[0].type === 'text' ? response.content[0].text : '';
                }
                else {
                    throw new Error('AI Client not configured for fix.');
                }
            }
            catch (err) {
                console.error(`[FIX] AI call failed: ${err.message}. Escolating to user.`);
                return false;
            }
        }
        // 4. Apply patch
        try {
            const patchedCode = index_js_1.PxmlPatcher.applyPatch(currentCode, patch);
            writer.write(node.meta.path, patchedCode);
            console.log(`[FIX] Applied patch successfully.`);
        }
        catch (err) {
            console.warn(`[FIX] Failed to apply patch: ${err.message}`);
            // If patch application failed, we retry or escalate
            continue;
        }
    }
    console.error(`[FIX] Failed to self-heal node ${node.id} after ${maxRetries} attempts. Escolating to user.`);
    return false;
}
