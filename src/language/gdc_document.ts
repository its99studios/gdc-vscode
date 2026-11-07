
export class GDCSourceLine {
	readonly number: number;
	readonly text: string;
	readonly indentation: string;
	readonly indentationLevel: number;
	readonly content: string;
	readonly hasSpaceIndentation: boolean;
	readonly isBlank: boolean;
	readonly isComment: boolean;

	constructor(number: number, text: string) {
		this.number = number;
		this.text = text;

		const indentationMatch = text.match(/^[\t ]*/);
		this.indentation = indentationMatch?.[0] ?? "";

		this.indentationLevel = this.indentation.length;
		this.content = text.slice(this.indentation.length);

		this.hasSpaceIndentation = this.indentation.includes(" ");
		this.isBlank = this.content.trim().length === 0;
		this.isComment = this.content.startsWith("#");
	}

	get isIgnored(): boolean {
		return this.isBlank || this.isComment;
	}
}


export class GDCDocument {
	readonly source: string;
	readonly lines: GDCSourceLine[];

	constructor(source: string) {
		this.source = source;

		const rawLines = source.split(/\r?\n/);

		this.lines = rawLines.map(
			(text, index) => new GDCSourceLine(index, text)
		);
	}


	get lineCount(): number {
		return this.lines.length;
	}


	get significantLines(): GDCSourceLine[] {
		return this.lines.filter(line => !line.isIgnored);
	}


	getLine(lineNumber: number): GDCSourceLine | undefined {
		return this.lines[lineNumber];
	}


	getSignificantLines(): GDCSourceLine[] {
		return this.significantLines;
	}


	getLinesBetween(
		startLine: number,
		endLine: number
	): GDCSourceLine[] {
		return this.lines.slice(startLine, endLine + 1);
	}
}
