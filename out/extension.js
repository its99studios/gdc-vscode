"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const GDC_DOCUMENTATION = {
    character: `
Declares the character associated with this GDC file.

The character is declared once per file and becomes the default speaker for its dialogues.

**Syntax**
\`\`\`gdc
character CharacterName
\`\`\`

**Example**
\`\`\`gdc
character BullyWalker
\`\`\`
`,
    dialogue: `
Declares a dialogue that can be executed independently.

A GDC file can contain multiple dialogue declarations. Each dialogue must end with an \`end\` instruction.

**Syntax**
\`\`\`gdc
dialogue identifier:
\`\`\`

**Example**
\`\`\`gdc
dialogue introduction:
\tsay "Hello!"
end
\`\`\`
`,
    say: `
Displays a line of dialogue.

By default, execution waits for the player to click before advancing. An immediately following \`autoadvance\` instruction can change this behavior.

**Syntax**
\`\`\`gdc
say "Text"
\`\`\`

**Example**
\`\`\`gdc
say "Hello!"
\`\`\`
`,
    speaker: `
Changes the speaker of a dialogue line.

A standalone \`speaker\` instruction changes the persistent speaker until another speaker is selected.

An inline speaker declaration overrides the speaker for that line only.

**Syntax**
\`\`\`gdc
speaker CharacterName
speaker CharacterName say "Text"
\`\`\`

**Example**
\`\`\`gdc
speaker Player
say "Who are you?"

speaker BullyWalker say "Your worst nightmare."
\`\`\`
`,
    autoadvance: `
Sets the preceding \`say\` instruction to automatically advance after a specified duration.

This instruction modifies only the immediately preceding dialogue line.

**Syntax**
\`\`\`gdc
autoadvance <seconds>
\`\`\`

**Example**
\`\`\`gdc
say "Hello!"
autoadvance 1.5
\`\`\`
`,
    wait: `
Pauses dialogue execution for a specified duration.

Unlike \`autoadvance\`, this is an independent instruction and does not modify a preceding dialogue line.

**Syntax**
\`\`\`gdc
wait <seconds>
\`\`\`

**Example**
\`\`\`gdc
wait 2.0
say "Welcome back!"
\`\`\`
`,
    choice: `
Creates a choice block containing options the player can select.

Each option has a quoted label followed by an indented block of instructions.

**Syntax**
\`\`\`gdc
choice:
	"Option label":
		# Instructions
\`\`\`

**Example**
\`\`\`gdc
choice:
	"Fight":
		say "Let's fight!"

	"Leave":
		say "Goodbye."
\`\`\`
`,
    event: `
Requests a Godot-side event.

The GDC runtime passes the event identifier to the game's event-handling system.

**Syntax**
\`\`\`gdc
event event_identifier
\`\`\`

**Example**
\`\`\`gdc
event start_boss_fight
\`\`\`
`,
    end: `
Terminates the current dialogue declaration.

Every dialogue must contain an \`end\` instruction as its final instruction.

**Syntax**
\`\`\`gdc
end
\`\`\`

**Example**
\`\`\`gdc
dialogue introduction:
	say "Hello!"
	end
\`\`\`
`
};
function activate(context) {
    const hoverProvider = vscode.languages.registerHoverProvider("gdc", {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position);
            if (!range) {
                return undefined;
            }
            const word = document.getText(range);
            const documentation = GDC_DOCUMENTATION[word];
            if (!documentation) {
                return undefined;
            }
            const markdown = new vscode.MarkdownString(documentation.trim());
            markdown.isTrusted = false;
            return new vscode.Hover(markdown, range);
        }
    });
    context.subscriptions.push(hoverProvider);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map