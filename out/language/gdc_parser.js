"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDCParser = exports.GDCParseResult = void 0;
const gdc_document_1 = require("./gdc_document");
const gdc_syntax_1 = require("./gdc_syntax");
class GDCParseResult {
    syntax;
    diagnostics;
    constructor(syntax, diagnostics) {
        this.syntax = syntax;
        this.diagnostics = diagnostics;
    }
    get successful() {
        return this.diagnostics.length === 0;
    }
}
exports.GDCParseResult = GDCParseResult;
class GDCParser {
    lines = [];
    diagnostics = [];
    character = null;
    dialogues = [];
    index = 0;
    static IDENTIFIER_PATTERN = "[A-Za-z_][A-Za-z0-9_]*";
    static NUMBER_PATTERN = "[0-9]+(?:\\.[0-9]+)?";
    static parse(source) {
        const parser = new GDCParser();
        return parser.parseSource(source);
    }
    parseSource(source) {
        const document = new gdc_document_1.GDCDocument(source);
        this.lines = document.significantLines;
        this.diagnostics = [];
        this.character = null;
        this.dialogues = [];
        this.index = 0;
        while (this.index < this.lines.length) {
            const line = this.currentLine();
            if (line === undefined) {
                break;
            }
            if (line.indentationLevel !== 0) {
                this.report("Unexpected indentation at the top level.", line);
                this.index++;
                continue;
            }
            if (line.content.startsWith("character ")) {
                this.parseCharacter();
                continue;
            }
            if (line.content.startsWith("dialogue ")) {
                this.parseDialogue();
                continue;
            }
            this.report("Expected a character or dialogue declaration.", line);
            this.index++;
        }
        const syntax = new gdc_syntax_1.GDCFileSyntax(this.createFileRange(document), this.character, this.dialogues);
        return new GDCParseResult(syntax, this.diagnostics);
    }
    // Character declarations.
    parseCharacter() {
        const line = this.currentLine();
        if (line === undefined) {
            return;
        }
        const content = this.removeComment(line.content).trim();
        const match = content.match(new RegExp(`^character\\s+(${GDCParser.IDENTIFIER_PATTERN})$`));
        if (match === null) {
            this.report("Invalid character declaration.", line);
            this.index++;
            return;
        }
        if (this.character !== null) {
            this.report("A GDC file can only declare one character.", line);
            this.index++;
            return;
        }
        this.character = new gdc_syntax_1.GDCCharacterSyntax(this.createLineRange(line), match[1]);
        this.index++;
    }
    // Dialogue declarations.
    parseDialogue() {
        const declaration = this.currentLine();
        if (declaration === undefined) {
            return;
        }
        const content = this.removeComment(declaration.content).trim();
        const match = content.match(new RegExp(`^dialogue\\s+(${GDCParser.IDENTIFIER_PATTERN})\\s*:$`));
        if (match === null) {
            this.report("Invalid dialogue declaration.", declaration);
            this.index++;
            return;
        }
        const identifier = match[1];
        if (this.dialogues.some(dialogue => dialogue.identifier === identifier)) {
            this.report(`Duplicate dialogue '${identifier}'.`, declaration);
        }
        this.index++;
        const instructions = this.parseInstructionBlock(1);
        if (instructions.length === 0 ||
            !(instructions[instructions.length - 1] instanceof gdc_syntax_1.GDCEndSyntax)) {
            this.report(`Dialogue '${identifier}' must end with 'end'.`, declaration);
        }
        const dialogue = new gdc_syntax_1.GDCDialogueSyntax(this.createRangeFromLines(declaration, this.previousLine() ?? declaration), identifier, instructions);
        this.dialogues.push(dialogue);
    }
    // Instruction blocks.
    parseInstructionBlock(expectedIndentation) {
        const instructions = [];
        while (this.index < this.lines.length) {
            const line = this.currentLine();
            if (line === undefined) {
                break;
            }
            if (line.indentationLevel < expectedIndentation) {
                break;
            }
            if (line.indentationLevel > expectedIndentation) {
                this.report("Unexpected indentation.", line);
                this.index++;
                continue;
            }
            const instruction = this.parseInstruction(expectedIndentation, instructions);
            if (instruction !== null) {
                instructions.push(instruction);
            }
        }
        return instructions;
    }
    // Individual instructions.
    parseInstruction(indentation, instructions) {
        const line = this.currentLine();
        if (line === undefined) {
            return null;
        }
        const content = this.removeComment(line.content).trim();
        if (content === "end") {
            this.index++;
            if (this.index < this.lines.length) {
                const nextLine = this.currentLine();
                if (nextLine !== undefined &&
                    nextLine.indentationLevel >= indentation) {
                    this.report("'end' must be the final instruction in a dialogue.", line);
                }
            }
            return new gdc_syntax_1.GDCEndSyntax(this.createLineRange(line));
        }
        if (content === "choice:") {
            return this.parseChoice(indentation, line);
        }
        // Inline speaker override.
        const inlineSpeakerMatch = content.match(new RegExp(`^speaker\\s+(${GDCParser.IDENTIFIER_PATTERN})\\s+say\\s+(.+)$`));
        if (inlineSpeakerMatch !== null) {
            const text = this.parseString(inlineSpeakerMatch[2], line);
            this.index++;
            if (text === null) {
                return null;
            }
            return new gdc_syntax_1.GDCSaySyntax(this.createLineRange(line), text, inlineSpeakerMatch[1]);
        }
        // Persistent speaker.
        const speakerMatch = content.match(new RegExp(`^speaker\\s+(${GDCParser.IDENTIFIER_PATTERN})$`));
        if (speakerMatch !== null) {
            this.index++;
            return new gdc_syntax_1.GDCSpeakerSyntax(this.createLineRange(line), speakerMatch[1]);
        }
        // Say.
        if (content.startsWith("say ")) {
            const text = this.parseString(content.slice(4), line);
            this.index++;
            if (text === null) {
                return null;
            }
            return new gdc_syntax_1.GDCSaySyntax(this.createLineRange(line), text);
        }
        // Wait.
        const waitMatch = content.match(new RegExp(`^wait\\s+(${GDCParser.NUMBER_PATTERN})$`));
        if (waitMatch !== null) {
            this.index++;
            return new gdc_syntax_1.GDCWaitSyntax(this.createLineRange(line), Number(waitMatch[1]));
        }
        // Autoadvance modifies the preceding say.
        const autoadvanceMatch = content.match(new RegExp(`^autoadvance\\s+(${GDCParser.NUMBER_PATTERN})$`));
        if (autoadvanceMatch !== null) {
            this.index++;
            const previous = instructions[instructions.length - 1];
            if (!(previous instanceof gdc_syntax_1.GDCSaySyntax)) {
                this.report("'autoadvance' must immediately follow a 'say' instruction.", line);
                return null;
            }
            const duration = Number(autoadvanceMatch[1]);
            instructions[instructions.length - 1] = new gdc_syntax_1.GDCSaySyntax(this.createRangeFromLines(this.lines.find(sourceLine => sourceLine.number === previous.range.start.line) ?? line, line), previous.text, previous.speakerOverride, duration);
            return null;
        }
        // Event.
        const eventMatch = content.match(new RegExp(`^event\\s+(${GDCParser.IDENTIFIER_PATTERN})$`));
        if (eventMatch !== null) {
            this.index++;
            return new gdc_syntax_1.GDCEventSyntax(this.createLineRange(line), eventMatch[1]);
        }
        this.report(`Unknown instruction '${content}'.`, line);
        this.index++;
        return null;
    }
    // Choice blocks.
    parseChoice(indentation, choiceLine) {
        this.index++;
        const options = [];
        while (this.index < this.lines.length) {
            const line = this.currentLine();
            if (line === undefined) {
                break;
            }
            if (line.indentationLevel <= indentation) {
                break;
            }
            const optionIndentation = indentation + 1;
            if (line.indentationLevel !== optionIndentation) {
                this.report("Choice options must be indented one level beneath 'choice:'.", line);
                this.index++;
                continue;
            }
            const label = this.parseChoiceLabel(line);
            if (label === null) {
                this.index++;
                continue;
            }
            this.index++;
            const instructions = this.parseInstructionBlock(optionIndentation + 1);
            options.push(new gdc_syntax_1.GDCChoiceOptionSyntax(this.createRangeFromLines(line, this.previousLine() ?? line), label, instructions));
        }
        return new gdc_syntax_1.GDCChoiceSyntax(this.createRangeFromLines(choiceLine, this.previousLine() ?? choiceLine), options);
    }
    parseChoiceLabel(line) {
        const content = this.removeComment(line.content).trim();
        const match = content.match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*:$/);
        if (match === null) {
            this.report("Expected a quoted choice option followed by ':'.", line);
            return null;
        }
        return this.unquote(match[1]);
    }
    // String parsing.
    parseString(value, line) {
        const match = value.trim().match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/);
        if (match === null) {
            this.report("Expected a quoted string.", line);
            return null;
        }
        return this.unquote(match[1]);
    }
    unquote(value) {
        const inner = value.slice(1, -1);
        return inner.replace(/\\(\\|"|'|n|r|t)/g, (_match, escaped) => {
            switch (escaped) {
                case "n":
                    return "\n";
                case "r":
                    return "\r";
                case "t":
                    return "\t";
                default:
                    return escaped;
            }
        });
    }
    // Source utilities.
    removeComment(content) {
        let quote = null;
        let escaped = false;
        for (let i = 0; i < content.length; i++) {
            const character = content[i];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (character === "\\" && quote !== null) {
                escaped = true;
                continue;
            }
            if ((character === "\"" || character === "'") &&
                quote === null) {
                quote = character;
                continue;
            }
            if (character === quote) {
                quote = null;
                continue;
            }
            if (character === "#" && quote === null) {
                return content.slice(0, i);
            }
        }
        return content;
    }
    currentLine() {
        return this.lines[this.index];
    }
    previousLine() {
        return this.lines[this.index - 1];
    }
    // Source ranges.
    createLineRange(line) {
        return {
            start: {
                line: line.number,
                character: 0
            },
            end: {
                line: line.number,
                character: line.text.length
            }
        };
    }
    createRangeFromLines(start, end) {
        return {
            start: {
                line: start.number,
                character: 0
            },
            end: {
                line: end.number,
                character: end.text.length
            }
        };
    }
    createFileRange(document) {
        const lastLine = document.lines[Math.max(0, document.lineCount - 1)];
        return {
            start: { line: 0, character: 0 },
            end: {
                line: lastLine?.number ?? 0,
                character: lastLine?.text.length ?? 0
            }
        };
    }
    // Diagnostics.
    report(message, line) {
        this.diagnostics.push({
            message,
            line: line.number,
            character: line.indentation.length
        });
    }
}
exports.GDCParser = GDCParser;
//# sourceMappingURL=gdc_parser.js.map