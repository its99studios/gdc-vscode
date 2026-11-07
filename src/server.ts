
import {
	createConnection,
	Diagnostic,
	DiagnosticSeverity,
	InitializeParams,
	InitializeResult,
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
				textDocumentSync: TextDocumentSyncKind.Incremental
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


documents.listen(connection);
connection.listen();
