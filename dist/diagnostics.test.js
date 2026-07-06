"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const index_ts_1 = require("../src/diagnostics/index.ts");
const index_ts_2 = require("../src/patcher/index.ts");
(0, vitest_1.describe)('PxmlDiagnostics', () => {
    (0, vitest_1.it)('should map errors to flow heuristics', () => {
        const diag1 = index_ts_1.PxmlDiagnostics.diagnoseHeuristic({
            message: 'Unauthorized access attempts',
            statusCode: 401
        });
        (0, vitest_1.expect)(diag1?.flow).toBe('auth');
        (0, vitest_1.expect)(diag1?.suspectedType).toBe('middleware');
        const diag2 = index_ts_1.PxmlDiagnostics.diagnoseHeuristic({
            message: 'PrismaClientKnownRequestError: Unique constraint failed on the fields: (slug)',
        });
        (0, vitest_1.expect)(diag2?.flow).toBe('db');
        (0, vitest_1.expect)(diag2?.suspectedType).toBe('db-model');
    });
});
(0, vitest_1.describe)('PxmlPatcher', () => {
    (0, vitest_1.it)('should apply search/replace patches cleanly', () => {
        const original = `const a = 1;\nconst b = 2;\nconst c = 3;`;
        const patch = `
<<<<<<< SEARCH
const b = 2;
=======
const b = 20;
const d = 40;
>>>>>>> REPLACE
`;
        const result = index_ts_2.PxmlPatcher.applyPatch(original, patch);
        (0, vitest_1.expect)(result).toBe(`const a = 1;\nconst b = 20;\nconst d = 40;\nconst c = 3;`);
    });
    (0, vitest_1.it)('should throw error when search block is not found', () => {
        const original = `const a = 1;`;
        const patch = `
<<<<<<< SEARCH
const b = 2;
=======
const b = 20;
>>>>>>> REPLACE
`;
        (0, vitest_1.expect)(() => index_ts_2.PxmlPatcher.applyPatch(original, patch)).toThrow('search block not found');
    });
});
