
import { GDCDocument, GDCSourceLine } from "./gdc_document";

import {
	GDCSyntaxRange,
	GDCFileSyntax,
	GDCCharacterSyntax,
	GDCDialogueSyntax,
	GDCInstructionSyntax,
	GDCSaySyntax,
	GDCSpeakerSyntax,
	GDCWaitSyntax,
	GDCEventSyntax,
	GDCChoiceSyntax,
	GDCChoiceOptionSyntax,
	GDCEndSyntax
} from "./gdc_syntax";

export interface GDCParserDiagnostic {
	message: string;
	line: number;
	character: number;
}

export class GDCParseResult {
	readonly syntax: GDCFileSyntax;
	readonly diagnostics: GDCParserDiagnostic[];

	constructor(
		syntax: GDCFileSyntax,
		diagnostics: GDCParserDiagnostic[]
	) {
		this.syntax = syntax;
		this.diagnostics = diagnostics;
	}

	get successful(): boolean {
		return this.diagnostics.length === 0;
	}
}

export class GDCParser {
	private lines: GDCSourceLine[] = [];
	private diagnostics: GDCParserDiagnostic[] = [];

	private character: GDCCharacterSyntax | null = null;
	private dialogues: GDCDialogueSyntax[] = [];

	private index = 0;

	private static readonly IDENTIFIER_PATTERN =
		"[A-Za-z_][A-Za-z0-9_]*";

	private static readonly NUMBER_PATTERN =
		"[0-9]+(?:\\.[0-9]+)?";

	static parse(source: string): GDCParseResult {
		const parser = new GDCParser();
		return parser.parseSource(source);
	}

	private parseSource(source: string): GDCParseResult {
		const document = new GDCDocument(source);

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
				this.report(
					"Unexpected indentation at the top level.",
					line
				);
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

			this.report(
				"Expected a character or dialogue declaration.",
				line
			);
			this.index++;
		}

		const syntax = new GDCFileSyntax(
			this.createFileRange(document),
			this.character,
			this.dialogues
		);

		return new GDCParseResult(syntax, this.diagnostics);
	}


	// Character declarations.

	private parseCharacter(): void {
		const line = this.currentLine();

		if (line === undefined) {
			return;
		}

		const content = this.removeComment(line.content).trim();

		const match = content.match(
			new RegExp(
				`^character\\s+(${GDCParser.IDENTIFIER_PATTERN})$`
			)
		);

		if (match === null) {
			this.report("Invalid character declaration.", line);
			this.index++;
			return;
		}

		if (this.character !== null) {
			this.report(
				"A GDC file can only declare one character.",
				line
			);
			this.index++;
			return;
		}

		this.character = new GDCCharacterSyntax(
			this.createLineRange(line),
			match[1]
		);

		this.index++;
	}


	// Dialogue declarations.

	private parseDialogue(): void {
		const declaration = this.currentLine();

		if (declaration === undefined) {
			return;
		}

		const content = this.removeComment(
			declaration.content
		).trim();

		const match = content.match(
			new RegExp(
				`^dialogue\\s+(${GDCParser.IDENTIFIER_PATTERN})\\s*:$`
			)
		);

		if (match === null) {
			this.report("Invalid dialogue declaration.", declaration);
			this.index++;
			return;
		}

		const identifier = match[1];

		if (this.dialogues.some(
			dialogue => dialogue.identifier === identifier
		)) {
			this.report(`Duplicate dialogue '${identifier}'.`, declaration);
		}

		this.index++;

		const instructions = this.parseInstructionBlock(1);

		if (
			instructions.length === 0 ||
			!(instructions[instructions.length - 1] instanceof GDCEndSyntax)
		) {
			this.report(
				`Dialogue '${identifier}' must end with 'end'.`,
				declaration
			);
		}

		const dialogue = new GDCDialogueSyntax(
			this.createRangeFromLines(
				declaration,
				this.previousLine() ?? declaration
			),
			identifier,
			instructions
		);

		this.dialogues.push(dialogue);
	}


	// Instruction blocks.

	private parseInstructionBlock(
		expectedIndentation: number
	): GDCInstructionSyntax[] {
		const instructions: GDCInstructionSyntax[] = [];

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

			const instruction = this.parseInstruction(
				expectedIndentation,
				instructions
			);

			if (instruction !== null) {
				instructions.push(instruction);
			}
		}

		return instructions;
	}


	// Individual instructions.

	private parseInstruction(
		indentation: number,
		instructions: GDCInstructionSyntax[]
	): GDCInstructionSyntax | null {
		const line = this.currentLine();

		if (line === undefined) {
			return null;
		}

		const content = this.removeComment(line.content).trim();

		if (content === "end") {
			this.index++;

			if (this.index < this.lines.length) {
				const nextLine = this.currentLine();

				if (
					nextLine !== undefined &&
					nextLine.indentationLevel >= indentation
				) {
					this.report(
						"'end' must be the final instruction in a dialogue.",
						line
					);
				}
			}

			return new GDCEndSyntax(this.createLineRange(line));
		}

		if (content === "choice:") {
			return this.parseChoice(indentation, line);
		}

		// Inline speaker override.

		const inlineSpeakerMatch = content.match(
			new RegExp(
				`^speaker\\s+(${GDCParser.IDENTIFIER_PATTERN})\\s+say\\s+(.+)$`
			)
		);

		if (inlineSpeakerMatch !== null) {
			const text = this.parseString(
				inlineSpeakerMatch[2],
				line
			);

			this.index++;

			if (text === null) {
				return null;
			}

			return new GDCSaySyntax(
				this.createLineRange(line),
				text,
				inlineSpeakerMatch[1]
			);
		}

		// Persistent speaker.

		const speakerMatch = content.match(
			new RegExp(
				`^speaker\\s+(${GDCParser.IDENTIFIER_PATTERN})$`
			)
		);

		if (speakerMatch !== null) {
			this.index++;

			return new GDCSpeakerSyntax(
				this.createLineRange(line),
				speakerMatch[1]
			);
		}

		// Say.

		if (content.startsWith("say ")) {
			const text = this.parseString(
				content.slice(4),
				line
			);

			this.index++;

			if (text === null) {
				return null;
			}

			return new GDCSaySyntax(
				this.createLineRange(line),
				text
			);
		}

		// Wait.

		const waitMatch = content.match(
			new RegExp(
				`^wait\\s+(${GDCParser.NUMBER_PATTERN})$`
			)
		);

		if (waitMatch !== null) {
			this.index++;

			return new GDCWaitSyntax(
				this.createLineRange(line),
				Number(waitMatch[1])
			);
		}

		// Autoadvance modifies the preceding say.

		const autoadvanceMatch = content.match(
			new RegExp(
				`^autoadvance\\s+(${GDCParser.NUMBER_PATTERN})$`
			)
		);

		if (autoadvanceMatch !== null) {
			this.index++;

			const previous = instructions[instructions.length - 1];

			if (!(previous instanceof GDCSaySyntax)) {
				this.report(
					"'autoadvance' must immediately follow a 'say' instruction.",
					line
				);
				return null;
			}

			const duration = Number(autoadvanceMatch[1]);

			instructions[instructions.length - 1] = new GDCSaySyntax(
				this.createRangeFromLines(
					this.lines.find(
						sourceLine =>
							sourceLine.number === previous.range.start.line
					) ?? line,
					line
				),
				previous.text,
				previous.speakerOverride,
				duration
			);

			return null;
		}

		// Event.

		const eventMatch = content.match(
			new RegExp(
				`^event\\s+(${GDCParser.IDENTIFIER_PATTERN})$`
			)
		);

		if (eventMatch !== null) {
			this.index++;

			return new GDCEventSyntax(
				this.createLineRange(line),
				eventMatch[1]
			);
		}

		this.report(`Unknown instruction '${content}'.`, line);
		this.index++;
		return null;
	}


	// Choice blocks.

	private parseChoice(
		indentation: number,
		choiceLine: GDCSourceLine
	): GDCChoiceSyntax {
		this.index++;

		const options: GDCChoiceOptionSyntax[] = [];

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
				this.report(
					"Choice options must be indented one level beneath 'choice:'.",
					line
				);
				this.index++;
				continue;
			}

			const label = this.parseChoiceLabel(line);

			if (label === null) {
				this.index++;
				continue;
			}

			this.index++;

			const instructions = this.parseInstructionBlock(
				optionIndentation + 1
			);

			options.push(
				new GDCChoiceOptionSyntax(
					this.createRangeFromLines(
						line,
						this.previousLine() ?? line
					),
					label,
					instructions
				)
			);
		}

		return new GDCChoiceSyntax(
			this.createRangeFromLines(
				choiceLine,
				this.previousLine() ?? choiceLine
			),
			options
		);
	}

	private parseChoiceLabel(
		line: GDCSourceLine
	): string | null {
		const content = this.removeComment(line.content).trim();

		const match = content.match(
			/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*:$/
		);

		if (match === null) {
			this.report(
				"Expected a quoted choice option followed by ':'.",
				line
			);
			return null;
		}

		return this.unquote(match[1]);
	}


	// String parsing.

	private parseString(
		value: string,
		line: GDCSourceLine
	): string | null {
		const match = value.trim().match(
			/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/
		);

		if (match === null) {
			this.report("Expected a quoted string.", line);
			return null;
		}

		return this.unquote(match[1]);
	}

	private unquote(value: string): string {
		const inner = value.slice(1, -1);

		return inner.replace(
			/\\(\\|"|'|n|r|t)/g,
			(_match, escaped: string) => {
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
			}
		);
	}


	// Source utilities.

	private removeComment(content: string): string {
		let quote: string | null = null;
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

			if (
				(character === "\"" || character === "'") &&
				quote === null
			) {
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

	private currentLine(): GDCSourceLine | undefined {
		return this.lines[this.index];
	}

	private previousLine(): GDCSourceLine | undefined {
		return this.lines[this.index - 1];
	}


	// Source ranges.

	private createLineRange(
		line: GDCSourceLine
	): GDCSyntaxRange {
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

	private createRangeFromLines(
		start: GDCSourceLine,
		end: GDCSourceLine
	): GDCSyntaxRange {
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

	private createFileRange(
		document: GDCDocument
	): GDCSyntaxRange {
		const lastLine = document.lines[
			Math.max(0, document.lineCount - 1)
		];

		return {
			start: { line: 0, character: 0 },
			end: {
				line: lastLine?.number ?? 0,
				character: lastLine?.text.length ?? 0
			}
		};
	}


	// Diagnostics.

	private report(
		message: string,
		line: GDCSourceLine
	): void {
		this.diagnostics.push({
			message,
			line: line.number,
			character: line.indentation.length
		});
	}
}
