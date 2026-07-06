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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PxmlCodegen = exports.OpenAICompatibleProvider = exports.AnthropicProvider = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class AnthropicProvider {
    client;
    constructor(apiKey) {
        this.client = new sdk_1.default({ apiKey });
    }
    async generate(prompt, systemPrompt, model) {
        const response = await this.client.messages.create({
            model,
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: 'user', content: prompt }]
        });
        return response.content[0].type === 'text' ? response.content[0].text : '';
    }
}
exports.AnthropicProvider = AnthropicProvider;
class OpenAICompatibleProvider {
    apiKey;
    baseUrl;
    constructor(apiKey, baseUrl = 'https://api.openai.com/v1') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    async generate(prompt, systemPrompt, model) {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.2
            })
        });
        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`OpenAI Provider HTTP error! status: ${response.status}, details: ${errText}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
}
exports.OpenAICompatibleProvider = OpenAICompatibleProvider;
class PxmlCodegen {
    config;
    provider;
    constructor(config) {
        this.config = config;
        if (config.mockResponse) {
            return;
        }
        if (config.customProvider) {
            this.provider = config.customProvider;
        }
        else if (config.provider === 'openai') {
            if (!config.apiKey)
                throw new Error('API Key required for OpenAI provider');
            this.provider = new OpenAICompatibleProvider(config.apiKey, config.baseUrl);
        }
        else {
            // Default to anthropic
            if (!config.apiKey)
                throw new Error('API Key required for Anthropic provider');
            this.provider = new AnthropicProvider(config.apiKey);
        }
    }
    async generateNodeCode(node, projectContext, writer) {
        if (this.config.mockResponse) {
            const mockCode = this.config.mockResponse(node);
            writer.write(node.meta.path, mockCode);
            this.logAIResponse(node.id, "MOCK PROMPT", mockCode);
            return mockCode;
        }
        if (!this.provider) {
            throw new Error(`AI Provider is not configured.`);
        }
        const prompt = this.buildPrompt(node, projectContext);
        const systemPrompt = `You are an expert software engineer generating implementation code for a node specification.
Generate ONLY the file contents. Do not include markdown code block syntax (like \`\`\`typescript) or explanations. Only output code.`;
        const code = await this.provider.generate(prompt, systemPrompt, this.config.model);
        const cleanedCode = this.cleanMarkdown(code);
        writer.write(node.meta.path, cleanedCode);
        this.logAIResponse(node.id, prompt, cleanedCode);
        return cleanedCode;
    }
    buildPrompt(node, projectContext) {
        return `Project Context:
${projectContext}

Generate implementation file for this node:
- ID: ${node.id}
- Type: ${node.type}
- Flow: ${node.flow}
- Destination Path: ${node.meta.path}
- Input Fields: ${JSON.stringify(node.input)}
- Output Fields: ${JSON.stringify(node.output)}
- Constraints:
${node.constraints.map(c => `  - [${c.verify}] ${c.description}`).join('\n')}

Generate the cleanest code matching this specification. Do not include markdown wrapping or explanation.`;
    }
    cleanMarkdown(code) {
        return code.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '').trim();
    }
    logAIResponse(nodeId, prompt, response) {
        const logsDir = path.resolve('.pxml', 'logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        const safeNodeId = nodeId.replace(/:/g, '_');
        const logPath = path.join(logsDir, `${safeNodeId}.log`);
        const logContent = `--- PROMPT ---\n${prompt}\n\n--- RESPONSE ---\n${response}\n`;
        fs.writeFileSync(logPath, logContent, 'utf-8');
    }
}
exports.PxmlCodegen = PxmlCodegen;
