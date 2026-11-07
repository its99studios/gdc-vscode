
import {
	createConnection,
	Diagnostic,
	DiagnosticSeverity,
	Hover,
	InitializeParams,
	InitializeResult,
	Position,
	ProposedFeatures,
	TextDocuments,
	TextDocumentSyncKind
} from "vscode-languageserver/node";

import { TextDocument } from "vscode-languageserver-textdocument";
import { GDCAnalyzer } from "./language/gdc_analyzer";


const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);


connection.onInitialize(
	(_params: InitializeParams): InitializeResult => {
		return {
			capabilities: {
				textDocumentSync: TextDocumentSyncKind.Incremental,
				hoverProvider: true
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

documents.listen(connection);
connection.listen();
