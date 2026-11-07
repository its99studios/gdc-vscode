export type GDCDiagnosticSeverity =
	| "error"
	| "warning"
	| "information"
	| "hint";

export interface GDCDiagnosticPosition {
	line: number;
	character: number;
}

export interface GDCDiagnostic {
	message: string;
	severity: GDCDiagnosticSeverity;
	start: GDCDiagnosticPosition;
	end: GDCDiagnosticPosition;
}