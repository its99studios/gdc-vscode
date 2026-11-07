
import {
	GDCParser
} from "./gdc_parser";

import {
	GDCFileSyntax,
	GDCDialogueSyntax,
	GDCChoiceSyntax,
	GDCSaySyntax,
	GDCWaitSyntax,
	GDCEndSyntax
} from "./gdc_syntax";

import {
	GDCDiagnostic
} from "./gdc_diagnostic";


export class GDCAnalyzer {
	static analyze(source: string): GDCDiagnostic[] {
		const result = GDCParser.parse(source);

		const diagnostics: GDCDiagnostic[] = [];

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


	private static analyzeFile(
		file: GDCFileSyntax,
		diagnostics: GDCDiagnostic[]
	): void {
		// A character declaration is required when dialogues exist.
		if (file.dialogues.length > 0 && file.character === null) {
			this.addDiagnostic(
				diagnostics,
				"A character declaration is required when a file contains dialogues.",
				file.dialogues[0],
				"error"
			);
		}

		// Dialogue identifiers must be unique.
		const dialogueIdentifiers = new Set<string>();

		for (const dialogue of file.dialogues) {
			if (dialogueIdentifiers.has(dialogue.identifier)) {
				this.addDiagnostic(
					diagnostics,
					`Duplicate dialogue identifier '${dialogue.identifier}'.`,
					dialogue,
					"error"
				);
			}

			dialogueIdentifiers.add(dialogue.identifier);

			this.analyzeDialogue(dialogue, diagnostics);
		}
	}


	private static analyzeDialogue(
		dialogue: GDCDialogueSyntax,
		diagnostics: GDCDiagnostic[]
	): void {
		const instructions = dialogue.instructions;

		// A dialogue containing only end has no actual content.
		const meaningfulInstructions = instructions.filter(
			instruction => !(instruction instanceof GDCEndSyntax)
		);

		if (meaningfulInstructions.length === 0) {
			this.addDiagnostic(
				diagnostics,
				`Dialogue '${dialogue.identifier}' contains no instructions.`,
				dialogue,
				"warning"
			);
		}

		this.analyzeInstructions(instructions, diagnostics);
	}
	
	private static analyzeInstructions(
		instructions: GDCDialogueSyntax["instructions"],
		diagnostics: GDCDiagnostic[]
	): void {
		for (const instruction of instructions) {
			if (instruction instanceof GDCChoiceSyntax) {
				this.analyzeChoice(instruction, diagnostics);
			}

			if (instruction instanceof GDCSaySyntax) {
				if (
					instruction.autoAdvance !== null &&
					instruction.autoAdvance <= 0
				) {
					this.addDiagnostic(
						diagnostics,
						"Autoadvance duration must be greater than zero.",
						instruction,
						"error"
					);
				}
			}

			if (instruction instanceof GDCWaitSyntax) {
				if (instruction.duration < 0) {
					this.addDiagnostic(
						diagnostics,
						"Wait duration cannot be negative.",
						instruction,
						"error"
					);
				}
			}
		}
	}

	private static analyzeChoice(
		choice: GDCChoiceSyntax,
		diagnostics: GDCDiagnostic[]
	): void {
		if (choice.options.length === 0) {
			this.addDiagnostic(
				diagnostics,
				"A choice must contain at least one option.",
				choice,
				"error"
			);

			return;
		}

		const optionLabels = new Set<string>();

		for (const option of choice.options) {
			if (optionLabels.has(option.text)) {
				this.addDiagnostic(
					diagnostics,
					`Duplicate choice option '${option.text}'.`,
					option,
					"warning"
				);
			}

			optionLabels.add(option.text);

			if (option.instructions.length === 0) {
				this.addDiagnostic(
					diagnostics,
					`Choice option '${option.text}' contains no instructions.`,
					option,
					"warning"
				);
			}

			this.analyzeInstructions(
				option.instructions,
				diagnostics
			);
		}
	}

	private static addDiagnostic(
		diagnostics: GDCDiagnostic[],
		message: string,
		node: { range: { start: { line: number; character: number }; end: { line: number; character: number } } },
		severity: "error" | "warning" | "information" | "hint"
	): void {
		diagnostics.push({
			message,
			severity,
			start: node.range.start,
			end: node.range.end
		});
	}
}
