"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const node_1 = require("vscode-languageserver/node");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
const gdc_analyzer_1 = require("./language/gdc_analyzer");
const connection = (0, node_1.createConnection)(node_1.ProposedFeatures.all);
const documents = new node_1.TextDocuments(vscode_languageserver_textdocument_1.TextDocument);
connection.onInitialize((_params) => {
    return {
        capabilities: {
            textDocumentSync: node_1.TextDocumentSyncKind.Incremental
        }
    };
});
function validateDocument(document) {
    const diagnostics = gdc_analyzer_1.GDCAnalyzer.analyze(document.getText()).map(diagnostic => ({
        severity: {
            error: node_1.DiagnosticSeverity.Error,
            warning: node_1.DiagnosticSeverity.Warning,
            information: node_1.DiagnosticSeverity.Information,
            hint: node_1.DiagnosticSeverity.Hint
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
//# sourceMappingURL=server.js.map