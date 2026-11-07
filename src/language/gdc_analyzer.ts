
import {
	GDCDiagnostic,
	GDCDiagnosticSeverity
} from "./gdc_diagnostic";

import {
	GDCDocument,
	GDCSourceLine
} from "./gdc_document";


interface DialogueDeclaration {
	identifier: string;
	line: number;
	hasEnd: boolean;
}


const DIALOGUE_PATTERN =
	/^dialogue\s+([A-Za-z_][A-Za-z0-9_]*)\s*:\s*(?:#.*)?$/;

const CHARACTER_PATTERN =
	/^character\s+([A-Za-z_][A-Za-z0-9_]*)\s*(?:#.*)?$/;

const END_PATTERN = /^end\s*(?:#.*)?$/;


export class GDCAnalyzer {
	static analyze(source: string): GDCDiagnostic[] {
		const document = new GDCDocument(source);
		const diagnostics: GDCDiagnostic[] = [];
		const lines = document.significantLines;

		let characterDeclaration: {
			identifier: string;
			line: number;
		} | null = null;

		const dialogues: DialogueDeclaration[] = [];

		let currentDialogue: DialogueDeclaration | null = null;


		const report = (
			line: GDCSourceLine,
			message: string,
			severity: GDCDiagnosticSeverity = "error",
			startCharacter: number = 0,
			endCharacter?: number
		): void => {
			diagnostics.push({
				message,
				severity,
				start: {
					line: line.number,
					character: startCharacter
				},
				end: {
					line: line.number,
					character: endCharacter ?? line.text.length
				}
			});
		};


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
						report(
							line,
							"Malformed character declaration. Expected 'character Identifier'."
						);
					}

					continue;
				}

				if (line.indentationLevel !== 0) {
					report(
						line,
						"'character' declarations must be at the root level."
					);

					continue;
				}

				if (characterDeclaration !== null) {
					report(
						line,
						"Only one 'character' declaration is allowed per file."
					);

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
						report(
							line,
							"Malformed dialogue declaration. Expected 'dialogue Identifier:'."
						);
					}

					continue;
				}

				if (line.indentationLevel !== 0) {
					report(
						line,
						"'dialogue' declarations must be at the root level."
					);

					continue;
				}

				if (currentDialogue !== null && !currentDialogue.hasEnd) {
					const previousLine = document.getLine(currentDialogue.line);

					if (previousLine) {
						report(
							previousLine,
							`Dialogue '${currentDialogue.identifier}' is missing its required 'end' terminator.`
						);
					}
				}

				const identifier = match[1];

				const duplicate = dialogues.find(
					dialogue => dialogue.identifier === identifier
				);

				if (duplicate) {
					report(
						line,
						`Duplicate dialogue identifier '${identifier}'.`
					);

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
				report(
					line,
					"Instruction found outside a dialogue declaration."
				);

				continue;
			}


			// Dialogue terminator.

			if (END_PATTERN.test(content)) {
				if (line.indentationLevel === 0) {
					report(
						line,
						"'end' must be indented inside its dialogue."
					);

					continue;
				}

				if (currentDialogue.hasEnd) {
					report(
						line,
						"Duplicate 'end' terminator."
					);

					continue;
				}

				currentDialogue.hasEnd = true;
				currentDialogue = null;

				continue;
			}


			// Check indentation characters.

			if (line.hasSpaceIndentation) {
				report(
					line,
					"GDC uses tabs for indentation, not spaces."
				);
			}


			// Instructions must be indented.

			if (line.indentationLevel === 0) {
				report(
					line,
					"Instructions must be indented inside their dialogue."
				);
			}
		}


		// Report an unterminated final dialogue.

		if (currentDialogue !== null && !currentDialogue.hasEnd) {
			const declarationLine = document.getLine(currentDialogue.line);

			if (declarationLine) {
				report(
					declarationLine,
					`Dialogue '${currentDialogue.identifier}' is missing its required 'end' terminator.`
				);
			}
		}


		// A character declaration is required when dialogue exists.

		if (dialogues.length > 0 && characterDeclaration === null) {
			const firstDialogueLine = document.getLine(dialogues[0].line);

			if (firstDialogueLine) {
				report(
					firstDialogueLine,
					"A 'character' declaration is required before dialogue declarations."
				);
			}
		}


		return diagnostics;
	}
}
