"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GDCEndSyntax = exports.GDCChoiceOptionSyntax = exports.GDCChoiceSyntax = exports.GDCEventSyntax = exports.GDCWaitSyntax = exports.GDCSpeakerSyntax = exports.GDCSaySyntax = exports.GDCInstructionSyntax = exports.GDCDialogueSyntax = exports.GDCCharacterSyntax = exports.GDCFileSyntax = exports.GDCSyntaxNode = void 0;
// Base syntax node.
class GDCSyntaxNode {
    range;
    constructor(range) {
        this.range = range;
    }
}
exports.GDCSyntaxNode = GDCSyntaxNode;
// Complete GDC file.
class GDCFileSyntax extends GDCSyntaxNode {
    character;
    dialogues;
    constructor(range, character, dialogues) {
        super(range);
        this.character = character;
        this.dialogues = dialogues;
    }
}
exports.GDCFileSyntax = GDCFileSyntax;
// Character declaration.
class GDCCharacterSyntax extends GDCSyntaxNode {
    identifier;
    constructor(range, identifier) {
        super(range);
        this.identifier = identifier;
    }
}
exports.GDCCharacterSyntax = GDCCharacterSyntax;
// Dialogue declaration.
class GDCDialogueSyntax extends GDCSyntaxNode {
    identifier;
    instructions;
    constructor(range, identifier, instructions) {
        super(range);
        this.identifier = identifier;
        this.instructions = instructions;
    }
}
exports.GDCDialogueSyntax = GDCDialogueSyntax;
// Base instruction.
class GDCInstructionSyntax extends GDCSyntaxNode {
}
exports.GDCInstructionSyntax = GDCInstructionSyntax;
// Say instruction.
class GDCSaySyntax extends GDCInstructionSyntax {
    text;
    // Overrides the current speaker for this line only.
    speakerOverride;
    // Configured by the autoadvance instruction.
    autoAdvance;
    constructor(range, text, speakerOverride = null, autoAdvance = null) {
        super(range);
        this.text = text;
        this.speakerOverride = speakerOverride;
        this.autoAdvance = autoAdvance;
    }
}
exports.GDCSaySyntax = GDCSaySyntax;
// Persistent speaker instruction.
class GDCSpeakerSyntax extends GDCInstructionSyntax {
    speaker;
    constructor(range, speaker) {
        super(range);
        this.speaker = speaker;
    }
}
exports.GDCSpeakerSyntax = GDCSpeakerSyntax;
// Wait instruction.
class GDCWaitSyntax extends GDCInstructionSyntax {
    duration;
    constructor(range, duration) {
        super(range);
        this.duration = duration;
    }
}
exports.GDCWaitSyntax = GDCWaitSyntax;
// Event instruction.
class GDCEventSyntax extends GDCInstructionSyntax {
    identifier;
    constructor(range, identifier) {
        super(range);
        this.identifier = identifier;
    }
}
exports.GDCEventSyntax = GDCEventSyntax;
// Choice block.
class GDCChoiceSyntax extends GDCInstructionSyntax {
    options;
    constructor(range, options) {
        super(range);
        this.options = options;
    }
}
exports.GDCChoiceSyntax = GDCChoiceSyntax;
// Individual choice option.
class GDCChoiceOptionSyntax extends GDCSyntaxNode {
    text;
    instructions;
    constructor(range, text, instructions) {
        super(range);
        this.text = text;
        this.instructions = instructions;
    }
}
exports.GDCChoiceOptionSyntax = GDCChoiceOptionSyntax;
// Dialogue terminator.
class GDCEndSyntax extends GDCInstructionSyntax {
}
exports.GDCEndSyntax = GDCEndSyntax;
//# sourceMappingURL=gdc_syntax.js.map