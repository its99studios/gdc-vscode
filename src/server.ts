
import {
	createConnection,
	CompletionItem,
	CompletionItemKind,
	Diagnostic,
	DiagnosticSeverity,
	Hover,
	InitializeParams,
	InitializeResult,
	ProposedFeatures,
	TextDocuments,
	TextDocumentSyncKind,
	DocumentSymbol,
	SymbolKind,
	FoldingRange,
	FoldingRangeKind
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { GDCAnalyzer } from "./language/gdc_analyzer";
import { GDCParser } from "./language/gdc_parser";


const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);


connection.onInitialize(
	(_params: InitializeParams): InitializeResult => {
		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				hoverProvider: true,
				completionProvider: {
					resolveProvider: false,
					triggerCharacters: [" "]
				},
				documentSymbolProvider: true,
				foldingRangeProvider: true
			}
		};
	}
);


function validateDocument(document: TextDocument): void {
	const diagnostics: Diagnostic[] = GDCAnalyzer.analyze(
		document.getText()
	).map(diagnostic => ({
		severity: {
			error: DiagnosticSeverity.Error,
			warning: DiagnosticSeverity.Warning,
			information: DiagnosticSeverity.Information,
			hint: DiagnosticSeverity.Hint
		}[diagnostic.severity],

		range: {
			start: diagnostic.start,
			end: diagnostic.end
		},

		message: diagnostic.message,
		source: "GDC"
	}));

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


connection.onHover((params): Hover | null => {
	const document = documents.get(params.textDocument.uri);

	if (document === undefined) {
		return null;
	}

	const position = params.position;

	const line = document.getText({
		start: { line: position.line, character: 0 },
		end: { line: position.line, character: Number.MAX_SAFE_INTEGER }
	});

	const match = line.slice(0, position.character + 1).match(/[A-Za-z_][A-Za-z0-9_]*$/);

	if (match === null) {
		return null;
	}

	const word = match[0];

	const documentation: Record<string, string> = {
		character: "Declares the default character for this GDC file.",
		dialogue: "Declares a dialogue block.",
		say: "Displays a line of dialogue.",
		speaker: "Changes the persistent speaker or overrides the speaker for one line.",
		autoadvance: "Automatically advances the preceding dialogue line after the specified number of seconds.",
		wait: "Pauses dialogue execution for the specified number of seconds.",
		choice: "Creates a player choice block containing selectable options.",
		event: "Requests a Godot-side event.",
		end: "Terminates the current dialogue."
	};

	const description = documentation[word];

	if (description === undefined) {
		return null;
	}

	return {
		contents: {
			kind: "markdown",
			value: `**GDC — \`${word}\`**\n\n${description}`
		}
	};
});


function getLine(
	document: TextDocument,
	lineNumber: number
): string {
	return document.getText({
		start: { line: lineNumber, character: 0 },
		end: { line: lineNumber, character: Number.MAX_SAFE_INTEGER }
	});
}


function getPreviousSignificantLine(
	document: TextDocument,
	currentLine: number
): string | null {
	for (let i = currentLine - 1; i >= 0; i--) {
		const line = getLine(document, i).trim();

		if (line.length === 0 || line.startsWith("#")) {
			continue;
		}

		return line;
	}

	return null;
}


function isInsideDialogue(
	document: TextDocument,
	currentLine: number
): boolean {
	let insideDialogue = false;

	for (let i = 0; i < currentLine; i++) {
		const line = getLine(document, i);
		const indentation = line.match(/^\t*/)?.[0].length ?? 0;
		const content = line.trim();

		if (/^dialogue\s+[A-Za-z_][A-Za-z0-9_]*\s*:/.test(content)) {
			insideDialogue = true;
		}

		if (indentation === 1 && /^end\s*(?:#.*)?$/.test(content)) {
			insideDialogue = false;
		}
	}

	return insideDialogue;
}


function createCompletion(
	keyword: string,
	description: string
): CompletionItem {
	return {
		label: keyword,
		kind: CompletionItemKind.Keyword,
		detail: description,
		documentation: description,
		insertText: keyword
	};
}


connection.onCompletion((params): CompletionItem[] => {
	const document = documents.get(params.textDocument.uri);

	if (document === undefined) {
		return [];
	}

	const currentLine = params.position.line;
	const line = getLine(document, currentLine);
	const indentation = line.match(/^\t*/)?.[0].length ?? 0;

	const insideDialogue = isInsideDialogue(
		document,
		currentLine
	);

	// File-level suggestions.
	if (!insideDialogue || indentation === 0) {
		return [
			createCompletion(
				"character",
				"Declares the default character for this file."
			),
			createCompletion(
				"dialogue",
				"Declares a new dialogue block."
			)
		];
	}

	// Dialogue-level suggestions.
	const suggestions: CompletionItem[] = [
		createCompletion("say", "Displays a line of dialogue."),
		createCompletion("speaker", "Changes the persistent speaker or overrides one line."),
		createCompletion("wait", "Pauses dialogue execution."),
		createCompletion("choice", "Creates a player choice block."),
		createCompletion("event", "Requests a Godot-side event."),
		createCompletion("end", "Terminates the current dialogue.")
	];

	// Autoadvance is only suggested after a say instruction.
	const previousLine = getPreviousSignificantLine(
		document,
		currentLine
	);

	if (
		previousLine !== null &&
		/^(?:speaker\s+[A-Za-z_][A-Za-z0-9_]*\s+)?say(?:\s|$)/.test(previousLine)
	) {
		suggestions.push(
			createCompletion(
				"autoadvance",
				"Automatically advances the preceding dialogue line after a specified duration."
			)
		);
	}

	return suggestions;
});


connection.onDocumentSymbol((params): DocumentSymbol[] => {
	const document = documents.get(params.textDocument.uri);

	if (document === undefined) {
		return [];
	}

	const result = GDCParser.parse(document.getText());
	const file = result.syntax;

	const symbols: DocumentSymbol[] = [];

	// Character declaration.
	if (file.character !== null) {
		symbols.push({
			name: file.character.identifier,
			kind: SymbolKind.Class,
			range: file.character.range,
			selectionRange: file.character.range
		});
	}

	// Dialogue declarations.
	for (const dialogue of file.dialogues) {
		symbols.push({
			name: dialogue.identifier,
			kind: SymbolKind.Function,
			range: dialogue.range,
			selectionRange: dialogue.range
		});
	}

	return symbols;
});


connection.onFoldingRanges((params): FoldingRange[] => {
	const document = documents.get(params.textDocument.uri);

	if (document === undefined) {
		return [];
	}

	const lines = document.getText().split(/\r?\n/);
	const foldingRanges: FoldingRange[] = [];

	interface Block {
		startLine: number;
		indentation: number;
		kind: FoldingRangeKind;
	}

	const blocks: Block[] = [];

	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		const content = line.trim();

		if (content.length === 0 || content.startsWith("#")) {
			continue;
		}

		const indentation = line.match(/^\t*/)?.[0].length ?? 0;

		// Close blocks when indentation returns to their level.
		while (
			blocks.length > 0 &&
			indentation <= blocks[blocks.length - 1].indentation
		) {
			const block = blocks.pop()!;

			if (i - 1 > block.startLine) {
				foldingRanges.push({
					startLine: block.startLine,
					endLine: i - 1,
					kind: block.kind
				});
			}
		}

		// Dialogue declaration.
		if (/^dialogue\s+[A-Za-z_][A-Za-z0-9_]*\s*:/.test(content)) {
			blocks.push({
				startLine: i,
				indentation,
				kind: FoldingRangeKind.Region
			});

			continue;
		}

		// Choice block.
		if (content === "choice:") {
			blocks.push({
				startLine: i,
				indentation,
				kind: FoldingRangeKind.Region
			});

			continue;
		}

		// Choice option.
		if (/^(["']).*\1\s*:$/.test(content)) {
			blocks.push({
				startLine: i,
				indentation,
				kind: FoldingRangeKind.Region
			});
		}
	}

	// Close any remaining blocks at the end of the file.
	while (blocks.length > 0) {
		const block = blocks.pop()!;

		if (lines.length - 1 > block.startLine) {
			foldingRanges.push({
				startLine: block.startLine,
				endLine: lines.length - 1,
				kind: block.kind
			});
		}
	}

	return foldingRanges;
});

documents.listen(connection);
connection.listen();
