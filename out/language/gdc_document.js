"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDCDocument = exports.GDCSourceLine = void 0;
class GDCSourceLine {
    number;
    text;
    indentation;
    indentationLevel;
    content;
    hasSpaceIndentation;
    isBlank;
    isComment;
    constructor(number, text) {
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
    get isIgnored() {
        return this.isBlank || this.isComment;
    }
}
exports.GDCSourceLine = GDCSourceLine;
class GDCDocument {
    source;
    lines;
    constructor(source) {
        this.source = source;
        const rawLines = source.split(/\r?\n/);
        this.lines = rawLines.map((text, index) => new GDCSourceLine(index, text));
    }
    get lineCount() {
        return this.lines.length;
    }
    get significantLines() {
        return this.lines.filter(line => !line.isIgnored);
    }
    getLine(lineNumber) {
        return this.lines[lineNumber];
    }
    getSignificantLines() {
        return this.significantLines;
    }
    getLinesBetween(startLine, endLine) {
        return this.lines.slice(startLine, endLine + 1);
    }
}
exports.GDCDocument = GDCDocument;
//# sourceMappingURL=gdc_document.js.map