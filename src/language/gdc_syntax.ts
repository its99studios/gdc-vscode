
export interface GDCSyntaxPosition {
	line: number;
	character: number;
}

export interface GDCSyntaxRange {
	start: GDCSyntaxPosition;
	end: GDCSyntaxPosition;
}


// Base syntax node.

export abstract class GDCSyntaxNode {
	readonly range: GDCSyntaxRange;

	constructor(range: GDCSyntaxRange) {
		this.range = range;
	}
}


// Complete GDC file.

export class GDCFileSyntax extends GDCSyntaxNode {
	readonly character: GDCCharacterSyntax | null;
	readonly dialogues: GDCDialogueSyntax[];

	constructor(
		range: GDCSyntaxRange,
		character: GDCCharacterSyntax | null,
		dialogues: GDCDialogueSyntax[]
	) {
		super(range);

		this.character = character;
		this.dialogues = dialogues;
	}
}


// Character declaration.

export class GDCCharacterSyntax extends GDCSyntaxNode {
	readonly identifier: string;

	constructor(range: GDCSyntaxRange, identifier: string) {
		super(range);
		this.identifier = identifier;
	}
}


// Dialogue declaration.

export class GDCDialogueSyntax extends GDCSyntaxNode {
	readonly identifier: string;
	readonly instructions: GDCInstructionSyntax[];

	constructor(
		range: GDCSyntaxRange,
		identifier: string,
		instructions: GDCInstructionSyntax[]
	) {
		super(range);

		this.identifier = identifier;
		this.instructions = instructions;
	}
}


// Base instruction.

export abstract class GDCInstructionSyntax extends GDCSyntaxNode {}


// Say instruction.

export class GDCSaySyntax extends GDCInstructionSyntax {
	readonly text: string;

	constructor(range: GDCSyntaxRange, text: string) {
		super(range);
		this.text = text;
	}
}


// Speaker instruction.

export class GDCSpeakerSyntax extends GDCInstructionSyntax {
	readonly speaker: string;
	readonly inline: boolean;

	constructor(
		range: GDCSyntaxRange,
		speaker: string,
		inline: boolean
	) {
		super(range);

		this.speaker = speaker;
		this.inline = inline;
	}
}


// Wait instruction.

export class GDCWaitSyntax extends GDCInstructionSyntax {
	readonly duration: number;

	constructor(range: GDCSyntaxRange, duration: number) {
		super(range);
		this.duration = duration;
	}
}


// Autoadvance instruction.

export class GDCAutoadvanceSyntax extends GDCInstructionSyntax {
	readonly duration: number;

	constructor(range: GDCSyntaxRange, duration: number) {
		super(range);
		this.duration = duration;
	}
}


// Event instruction.

export class GDCEventSyntax extends GDCInstructionSyntax {
	readonly identifier: string;

	constructor(range: GDCSyntaxRange, identifier: string) {
		super(range);
		this.identifier = identifier;
	}
}


// Choice block.

export class GDCChoiceSyntax extends GDCInstructionSyntax {
	readonly options: GDCChoiceOptionSyntax[];

	constructor(
		range: GDCSyntaxRange,
		options: GDCChoiceOptionSyntax[]
	) {
		super(range);
		this.options = options;
	}
}


// Individual choice option.

export class GDCChoiceOptionSyntax extends GDCSyntaxNode {
	readonly text: string;
	readonly instructions: GDCInstructionSyntax[];

	constructor(
		range: GDCSyntaxRange,
		text: string,
		instructions: GDCInstructionSyntax[]
	) {
		super(range);

		this.text = text;
		this.instructions = instructions;
	}
}


// Dialogue terminator.

export class GDCEndSyntax extends GDCInstructionSyntax {}
