"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDCAnalyzer = void 0;
const gdc_parser_1 = require("./gdc_parser");
const gdc_syntax_1 = require("./gdc_syntax");
class GDCAnalyzer {
    static analyze(source) {
        const result = gdc_parser_1.GDCParser.parse(source);
        const diagnostics = [];
        // Convert parser diagnostics into analyzer diagnostics.
        for (const diagnostic of result.diagnostics) {
            diagnostics.push({
                message: diagnostic.message,
                severity: "error",
                start: {
                    line: diagnostic.line,
                    character: diagnostic.character
                },
                end: {
                    line: diagnostic.line,
                    character: diagnostic.character + 1
                }
            });
        }
        const file = result.syntax;
        this.analyzeFile(file, diagnostics);
        return diagnostics;
    }
    static analyzeFile(file, diagnostics) {
        // A character declaration is required when dialogues exist.
        if (file.dialogues.length > 0 && file.character === null) {
            this.addDiagnostic(diagnostics, "A character declaration is required when a file contains dialogues.", file.dialogues[0], "error");
        }
        // Dialogue identifiers must be unique.
        const dialogueIdentifiers = new Set();
        for (const dialogue of file.dialogues) {
            if (dialogueIdentifiers.has(dialogue.identifier)) {
                this.addDiagnostic(diagnostics, `Duplicate dialogue identifier '${dialogue.identifier}'.`, dialogue, "error");
            }
            dialogueIdentifiers.add(dialogue.identifier);
            this.analyzeDialogue(dialogue, diagnostics);
        }
    }
    static analyzeDialogue(dialogue, diagnostics) {
        const instructions = dialogue.instructions;
        // A dialogue containing only end has no actual content.
        const meaningfulInstructions = instructions.filter(instruction => !(instruction instanceof gdc_syntax_1.GDCEndSyntax));
        if (meaningfulInstructions.length === 0) {
            this.addDiagnostic(diagnostics, `Dialogue '${dialogue.identifier}' contains no instructions.`, dialogue, "warning");
        }
        this.analyzeInstructions(instructions, diagnostics);
    }
    static analyzeInstructions(instructions, diagnostics) {
        for (const instruction of instructions) {
            if (instruction instanceof gdc_syntax_1.GDCChoiceSyntax) {
                this.analyzeChoice(instruction, diagnostics);
            }
            if (instruction instanceof gdc_syntax_1.GDCSaySyntax) {
                if (instruction.autoAdvance !== null &&
                    instruction.autoAdvance <= 0) {
                    this.addDiagnostic(diagnostics, "Autoadvance duration must be greater than zero.", instruction, "error");
                }
            }
            if (instruction instanceof gdc_syntax_1.GDCWaitSyntax) {
                if (instruction.duration < 0) {
                    this.addDiagnostic(diagnostics, "Wait duration cannot be negative.", instruction, "error");
                }
            }
        }
    }
    static analyzeChoice(choice, diagnostics) {
        if (choice.options.length === 0) {
            this.addDiagnostic(diagnostics, "A choice must contain at least one option.", choice, "error");
            return;
        }
        const optionLabels = new Set();
        for (const option of choice.options) {
            if (optionLabels.has(option.text)) {
                this.addDiagnostic(diagnostics, `Duplicate choice option '${option.text}'.`, option, "warning");
            }
            optionLabels.add(option.text);
            if (option.instructions.length === 0) {
                this.addDiagnostic(diagnostics, `Choice option '${option.text}' contains no instructions.`, option, "warning");
            }
            this.analyzeInstructions(option.instructions, diagnostics);
        }
    }
    static addDiagnostic(diagnostics, message, node, severity) {
        diagnostics.push({
            message,
            severity,
            start: node.range.start,
            end: node.range.end
        });
    }
}
exports.GDCAnalyzer = GDCAnalyzer;
//# sourceMappingURL=gdc_analyzer.js.map