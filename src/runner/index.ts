import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { Node } from '../parser/schema.js';
import { PxmlTestgen } from '../testgen/index.js';
import { FileWriter } from '../writer/index.js';

export interface TestResult {
  passed: boolean;
  results: Record<string, 'pass' | 'fail'>;
}

export class PxmlRunner {
  private projectDir: string;
  private writer: FileWriter;

  constructor(projectDir: string, writer: FileWriter) {
    this.projectDir = path.resolve(projectDir);
    this.writer = writer;
  }

  runNodeTests(node: Node): TestResult {
    if (node.tests.length === 0) {
      return { passed: true, results: {} };
    }

    const testDir = path.join(this.projectDir, '.pxml', 'tests');
    const safeNodeId = node.id.replace(/:/g, '_');
    const testFilePath = path.join(testDir, `${safeNodeId}.test.ts`);

    const testFileContent = PxmlTestgen.generateTestFileContent(node, testFilePath);
    
    // Write test file temporarily (using physical writer or file system if dry-run allows write tests)
    this.writer.write(testFilePath, testFileContent);

    // If dryRun, return mock pass since we can't run tests on non-existent files
    if (this.writer.getHistory().some(h => h.filePath === testFilePath) && fs.existsSync(testFilePath) === false) {
      const mockResults: Record<string, 'pass' | 'fail'> = {};
      for (const t of node.tests) {
        mockResults[t.name] = 'pass';
      }
      return { passed: true, results: mockResults };
    }

    // Execute vitest
    let passed = false;
    const results: Record<string, 'pass' | 'fail'> = {};

    try {
      execSync(`npx vitest run ${testFilePath}`, { stdio: 'pipe', cwd: this.projectDir });
      passed = true;
      for (const t of node.tests) {
        results[t.name] = 'pass';
      }
    } catch (error: any) {
      passed = false;
      const stdout = error.stdout?.toString() || '';
      const stderr = error.stderr?.toString() || '';
      
      // Parse Vitest stdout to see which exact cases failed
      for (const t of node.tests) {
        if (stdout.includes(`× ${t.name}`) || stderr.includes(`× ${t.name}`) || stdout.includes(`fail`) || error.message.includes('fail')) {
          results[t.name] = 'fail';
        } else {
          // If we can't pinpoint, assume fail if suite failed, otherwise pass
          results[t.name] = 'fail';
        }
      }
    }

    return { passed, results };
  }
}
