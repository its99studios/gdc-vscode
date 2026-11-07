"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
const IDENTIFIER_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
const DIALOGUE_PATTERN = /^dialogue\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?:#.*)?$/;
const CHARACTER_PATTERN = /^character\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:#.*)?$/;
const END_PATTERN = /^end\s*(?:#.*)?$/;
connection.onInitialize((_params) => {
    return {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental
        }
    };
});
function validateDocument(document) {
    const source = document.getText();
    const rawLines = source.split(/\r?\n/);
    const diagnostics = [];
    const lines = [];
    let characterDeclaration = null;
    const dialogues = [];
    let currentDialogue = null;
    let hasDialogueContent = false;
    function report(line, message, severity = node_1.DiagnosticSeverity.Error, startCharacter = 0, endCharacter) {
        const lineText = rawLines[line] ?? "";
        diagnostics.push({
            severity,
            range: {
                start: {
                    line,
                    character: startCharacter
                },
                end: {
                    line,
                    character: endCharacter ?? lineText.length
                }
            },
            message,
            source: "GDC"
        });
    }
    function isCommentOrBlank(line) {
        const trimmed = line.trim();
        return trimmed.length === 0 || trimmed.startsWith("#");
    }
    function getIndentation(line) {
        let indentation = 0;
        for (const character of line) {
            if (character === "\t") {
                indentation++;
            }
            else if (character === " ") {
                indentation++;
            }
            else {
                break;
            }
        }
        return indentation;
    }
    function getContent(line) {
        return line.replace(/^[\t ]+/, "");
    }
    // Build the source-line representation.
    for (let i = 0; i < rawLines.length; i++) {
        const rawLine = rawLines[i];
        if (isCommentOrBlank(rawLine)) {
            continue;
        }
        lines.push({
            number: i,
            text: rawLine,
            indentation: getIndentation(rawLine),
            content: getContent(rawLine)
        });
    }
    // Empty files are valid while being edited.
    if (lines.length === 0) {
        connection.sendDiagnostics({
            uri: document.uri,
            diagnostics: []
        });
        return;
    }
    // Validate declarations and basic dialogue structure.
    for (const line of lines) {
        const content = line.content;
        const isCharacterDeclaration = content.startsWith("character");
        const isDialogueDeclaration = content.startsWith("dialogue");
        if (isCharacterDeclaration || isDialogueDeclaration) {
            hasDialogueContent = true;
        }
        // Character declaration.
        if (isCharacterDeclaration) {
            const match = CHARACTER_PATTERN.exec(content);
            if (!match) {
                // Avoid reporting incomplete declarations while typing.
                if (content.endsWith(":") || content.includes("  ")) {
                    report(line.number, "Malformed character declaration. Expected 'character Identifier'.");
                }
                continue;
            }
            if (line.indentation !== 0) {
                report(line.number, "'character' declarations must be at the root level.");
                continue;
            }
            if (characterDeclaration !== null) {
                report(line.number, "Only one 'character' declaration is allowed per file.");
                continue;
            }
            characterDeclaration = {
                identifier: match[1],
                line: line.number
            };
            continue;
        }
        // Dialogue declaration.
        if (isDialogueDeclaration) {
            const match = DIALOGUE_PATTERN.exec(content);
            if (!match) {
                // Incomplete declarations are ignored while typing.
                if (content.includes(":") || content.trim() === "dialogue") {
                    report(line.number, "Malformed dialogue declaration. Expected 'dialogue Identifier:'.");
                }
                continue;
            }
            if (line.indentation !== 0) {
                report(line.number, "'dialogue' declarations must be at the root level.");
                continue;
            }
            if (currentDialogue !== null && !currentDialogue.hasEnd) {
                report(currentDialogue.line, `Dialogue '${currentDialogue.identifier}' is missing its required 'end' terminator.`);
            }
            const identifier = match[1];
            const duplicate = dialogues.find(dialogue => dialogue.identifier === identifier);
            if (duplicate) {
                report(line.number, `Duplicate dialogue identifier '${identifier}'.`);
                currentDialogue = null;
                continue;
            }
            currentDialogue = {
                identifier,
                line: line.number,
                hasEnd: false
            };
            dialogues.push(currentDialogue);
            continue;
        }
        // Instructions must be inside a dialogue.
        if (currentDialogue === null) {
            report(line.number, "Instruction found outside a dialogue declaration.");
            continue;
        }
        // Dialogue terminator.
        if (END_PATTERN.test(content)) {
            if (line.indentation === 0) {
                report(line.number, "'end' must be indented inside its dialogue.");
                continue;
            }
            if (currentDialogue.hasEnd) {
                report(line.number, "Duplicate 'end' terminator.");
                continue;
            }
            currentDialogue.hasEnd = true;
            currentDialogue = null;
            continue;
        }
        // Check indentation characters.
        if (line.text.startsWith(" ")) {
            report(line.number, "GDC uses tabs for indentation, not spaces.");
        }
        // Instructions must be indented.
        if (line.indentation === 0) {
            report(line.number, "Instructions must be indented inside their dialogue.");
        }
    }
    // Report an unterminated final dialogue.
    if (currentDialogue !== null && !currentDialogue.hasEnd) {
        report(currentDialogue.line, `Dialogue '${currentDialogue.identifier}' is missing its required 'end' terminator.`);
    }
    // A character declaration is required when dialogue exists.
    if (dialogues.length > 0 && characterDeclaration === null) {
        report(dialogues[0].line, "A 'character' declaration is required before dialogue declarations.");
    }
    // Publish diagnostics.
    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics
    });
}
documents.onDidOpen(({ document }) => {
    validateDocument(document);
});
documents.onDidChangeContent(({ document }) => {
    validateDocument(document);
});
documents.onDidClose(({ document }) => {
    connection.sendDiagnostics({
        uri: document.uri,
        diagnostics: []
    });
});
documents.listen(connection);
connection.listen();
//# sourceMappingURL=server.js.map