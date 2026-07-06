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
exports.PxmlTestgen = void 0;
const path = __importStar(require("path"));
class PxmlTestgen {
    static generateTestFileContent(node, testFileAbsPath) {
        const relativeImplPath = path.relative(path.dirname(testFileAbsPath), node.meta.path);
        // Ensure import path starts with ./ or ../ and has no suffix extension
        let importPath = relativeImplPath.replace(/\.(ts|tsx)$/, '');
        if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
            importPath = './' + importPath;
        }
        let testCasesCode = '';
        for (const test of node.tests) {
            const stringifiedGiven = JSON.stringify(test.given, null, 2);
            const expectedStatus = test.expect.status !== undefined ? `expect(res.status).toBe(${test.expect.status});` : '';
            const expectedContains = test.expect.contains ? `expect(JSON.stringify(body)).toContain(${JSON.stringify(test.expect.contains)});` : '';
            const expectedMatch = test.expect.match ? `expect(JSON.stringify(body)).toMatch(${test.expect.match});` : '';
            testCasesCode += `
  it(${JSON.stringify(test.name)}, async () => {
    // Mock request / execution context
    const req = ${stringifiedGiven};
    
    // We expect the implementation module at ${node.meta.path} to export a handler or default handler
    // We execute it or call a route simulator. For Next.js CRUD:
    let res = { status: 200, json: async () => ({}) };
    let body = {};

    try {
      if (typeof handler === 'function') {
        const response = await handler(req);
        if (response && typeof response.json === 'function') {
          res = response;
          body = await response.json();
        } else {
          body = response;
        }
      } else if (handler && typeof handler.GET === 'function' && req.method === 'GET') {
        const response = await handler.GET(req);
        res = response;
        body = await response.json();
      } else if (handler && typeof handler.POST === 'function' && req.method === 'POST') {
        const response = await handler.POST(req);
        res = response;
        body = await response.json();
      } else {
        // Fallback for custom exports
        body = handler;
      }
    } catch (err: any) {
      res = { status: err.status || 500, json: async () => ({ error: err.message }) };
      body = { error: err.message };
    }

    ${expectedStatus}
    ${expectedContains}
    ${expectedMatch}
  });
`;
        }
        return `import { describe, it, expect, vi } from 'vitest';
// @ts-ignore
import * as handlerModule from '${importPath}';

const handler = handlerModule.default || handlerModule;

describe(${JSON.stringify(node.id)}, () => {
${testCasesCode}
});
`;
    }
}
exports.PxmlTestgen = PxmlTestgen;
