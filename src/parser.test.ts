import { describe, it, expect } from 'vitest';
import { PxmlParser } from '../src/parser/index.ts';
import { DependencyGraph } from '../src/graph/index.ts';
import * as path from 'path';

describe('PxmlParser', () => {
  it('should parse project, resolve imports, merge extends, and detect cycles', () => {
    const parser = new PxmlParser();
    const projectXml = path.resolve(__dirname, '../fixtures/project.xml');
    const project = parser.parse(projectXml);

    expect(project.name).toBe('main-blog');
    expect(project.nodes.length).toBe(3); // base.api-route, db.post, and api.posts.list (with namespace prefixes)

    const listNode = project.nodes.find(n => n.id === 'read:api.posts.list');
    expect(listNode).toBeDefined();
    expect(listNode?.type).toBe('api-route');
    // Inherited metadata and constraints
    expect(listNode?.meta.path).toBe('app/api/posts/route.ts');
    expect(listNode?.constraints.length).toBe(3); // 1 from parent, 2 from listNode
    expect(listNode?.constraints[0].description).toBe('No sensitive data leakage in response or logs');
    expect(listNode?.constraints[1].description).toBe('Sort by publishedAt descending');
  });

  it('should throw circular import error', () => {
    const parser = new PxmlParser();
    const fs = require('fs');
    fs.writeFileSync('/tmp/a.xml', `<project name="a" stack="nextjs" version="0.1.0"><import src="b.xml" as="b"/></project>`);
    fs.writeFileSync('/tmp/b.xml', `<project name="b" stack="nextjs" version="0.1.0"><import src="a.xml" as="a"/></project>`);

    expect(() => parser.parse('/tmp/a.xml')).toThrow('Circular import detected');
  });
});

describe('DependencyGraph', () => {
  it('should sort nodes topologically and detect circular dependency', () => {
    const parser = new PxmlParser();
    const projectXml = path.resolve(__dirname, '../fixtures/project.xml');
    const project = parser.parse(projectXml);

    const graph = new DependencyGraph(project.nodes);
    const order = graph.getSortOrder();

    // db.post should come before api.posts.list because api.posts.list depends on db.post
    const dbIndex = order.indexOf('read:types:db.post');
    const apiIndex = order.indexOf('read:api.posts.list');
    expect(dbIndex).toBeGreaterThan(-1);
    expect(apiIndex).toBeGreaterThan(-1);
    expect(dbIndex).toBeLessThan(apiIndex);
  });
});
