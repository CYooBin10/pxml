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
exports.PxmlManifest = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class PxmlManifest {
    manifestPath;
    currentManifest;
    constructor(projectDir, projectName, version) {
        this.manifestPath = path.join(projectDir, '.pxml', 'manifest.json');
        this.currentManifest = this.loadOrCreate(projectName, version);
    }
    loadOrCreate(projectName, version) {
        const dir = path.dirname(this.manifestPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        if (fs.existsSync(this.manifestPath)) {
            try {
                const content = fs.readFileSync(this.manifestPath, 'utf-8');
                return JSON.parse(content);
            }
            catch (err) {
                // Fallback to fresh if corrupted
            }
        }
        return {
            project_name: projectName,
            version: version,
            nodes: {}
        };
    }
    get() {
        return this.currentManifest;
    }
    getNode(nodeId) {
        return this.currentManifest.nodes[nodeId];
    }
    setNode(nodeId, nodeData) {
        const existing = this.currentManifest.nodes[nodeId];
        this.currentManifest.nodes[nodeId] = {
            ...nodeData,
            locked: nodeData.locked ?? existing?.locked ?? false
        };
    }
    save() {
        fs.writeFileSync(this.manifestPath, JSON.stringify(this.currentManifest, null, 2), 'utf-8');
    }
    lockNode(nodeId, locked) {
        const node = this.currentManifest.nodes[nodeId];
        if (node) {
            node.locked = locked;
            this.save();
        }
    }
    clear() {
        this.currentManifest.nodes = {};
        this.save();
    }
}
exports.PxmlManifest = PxmlManifest;
