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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const node_1 = require("vscode-languageclient/node");
let client;
async function activate(context) {
    const serverModule = context.asAbsolutePath("out/server.js");
    const serverOptions = {
        run: {
            module: serverModule,
            transport: node_1.TransportKind.ipc
        },
        debug: {
            module: serverModule,
            transport: node_1.TransportKind.ipc
        }
    };
    const clientOptions = {
        documentSelector: [
            {
                scheme: "file",
                language: "gdc"
            }
        ]
    };
    client = new node_1.LanguageClient("gdcLanguageServer", "GDC Language Server", serverOptions, clientOptions);
    await client.start();
    const hoverProvider = vscode.languages.registerHoverProvider("gdc", {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position);
            if (!range) {
                return undefined;
            }
            const word = document.getText(range);
            const documentation = GDC_DOCUMENTATION[word];
            if (!documentation) {
                return undefined;
            }
            const markdown = new vscode.MarkdownString(documentation.trim());
            markdown.isTrusted = false;
            return new vscode.Hover(markdown, range);
        }
    });
    context.subscriptions.push(hoverProvider);
    context.subscriptions.push(client);
}
function deactivate() {
    return client?.stop();
}
const GDC_DOCUMENTATION = {
    character: "Declares the character associated with this GDC file.",
    dialogue: "Declares a dialogue that can be executed independently.",
    say: "Displays a line of dialogue.",
    speaker: "Changes the speaker of a dialogue line.",
    autoadvance: "Sets the preceding say instruction to automatically advance.",
    wait: "Pauses dialogue execution for a specified duration.",
    choice: "Creates a choice block containing selectable options.",
    event: "Requests a Godot-side event.",
    end: "Terminates the current dialogue declaration."
};
//# sourceMappingURL=extension.js.map