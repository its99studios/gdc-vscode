"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDCAnalyzer = void 0;
const DIALOGUE_PATTERN = /^dialogue\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?:#.*)?$/;
const CHARACTER_PATTERN = /^character\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:#.*)?$/;
const END_PATTERN = /^end\s*(?:#.*)?$/;
class GDCAnalyzer {
    static analyze(source) {
        const rawLines = source.split(/\r?\n/);
        const diagnostics = [];
        const lines = [];
        let characterDeclaration = null;
        const dialogues = [];
        let currentDialogue = null;
        const report = (line, message, severity = "error", startCharacter = 0, endCharacter) => {
            const lineText = rawLines[line] ?? "";
            diagnostics.push({
                message,
                severity,
                start: {
                    line,
                    character: startCharacter
                },
                end: {
                    line,
                    character: endCharacter ?? lineText.length
                }
            });
        };
        const isCommentOrBlank = (line) => {
            const trimmed = line.trim();
            return trimmed.length === 0 || trimmed.startsWith("#");
        };
        const getIndentation = (line) => {
            let indentation = 0;
            for (const character of line) {
                if (character === "\t" || character === " ") {
                    indentation++;
                }
                else {
                    break;
                }
            }
            return indentation;
        };
        const getContent = (line) => {
            return line.replace(/^[\t ]+/, "");
        };
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
            return diagnostics;
        }
        // Validate declarations and basic dialogue structure.
        for (const line of lines) {
            const content = line.content;
            const isCharacterDeclaration = content.startsWith("character");
            const isDialogueDeclaration = content.startsWith("dialogue");
            // Character declaration.
            if (isCharacterDeclaration) {
                const match = CHARACTER_PATTERN.exec(content);
                if (!match) {
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
        return diagnostics;
    }
}
exports.GDCAnalyzer = GDCAnalyzer;
//# sourceMappingURL=gdc_analyzer.js.map