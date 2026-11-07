
import * as vscode from "vscode";
import {
	LanguageClient,
	LanguageClientOptions,
	ServerOptions,
	TransportKind
} from "vscode-languageclient/node";

let client: LanguageClient;

export async function activate(
	context: vscode.ExtensionContext
): Promise<void> {
	const serverModule = context.asAbsolutePath("out/server.js");
	const serverOptions: ServerOptions = {
		run: {
			module: serverModule,
			transport: TransportKind.ipc
		},
		debug: {
			module: serverModule,
			transport: TransportKind.ipc
		}
	};

	const clientOptions: LanguageClientOptions = {
		documentSelector: [
			{
				scheme: "file",
				language: "gdc"
			}
		]
	};

	client = new LanguageClient(
		"gdcLanguageServer",
		"GDC Language Server",
		serverOptions,
		clientOptions
	);

	await client.start();

	const hoverProvider = vscode.languages.registerHoverProvider(
		"gdc",
		{
			provideHover(
				document: vscode.TextDocument,
				position: vscode.Position
			): vscode.Hover | undefined {
				const range = document.getWordRangeAtPosition(position);

				if (!range) {
					return undefined;
				}

				const word = document.getText(range);
				const documentation = GDC_DOCUMENTATION[word];

				if (!documentation) {
					return undefined;
				}

				const markdown = new vscode.MarkdownString(
					documentation.trim()
				);

				markdown.isTrusted = false;

				return new vscode.Hover(markdown, range);
			}
		}
	);

	context.subscriptions.push(hoverProvider);
	context.subscriptions.push(client);
}

export function deactivate(): Thenable<void> | undefined {
	return client?.stop();
}

const GDC_DOCUMENTATION: Record<string, string> = {
	character: "Declares the character associated with this GDC file.",
	dialogue: "Declares a dialogue that can be executed independently.",
	say: "Displays a line of dialogue.",
	speaker: "Changes the speaker of a dialogue line.",
	autoadvance: "Sets the preceding say instruction to automatically advance.",
	wait: "Pauses dialogue execution for a specified duration.",
	choice: "Creates a choice block containing selectable options.",
	event: "Requests a Godot-side event.",
	end: "Terminates the current dialogue declaration."
};
