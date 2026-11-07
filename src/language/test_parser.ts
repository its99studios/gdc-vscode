
import {
	GDCParser
} from "./gdc_parser";

import {
	GDCSaySyntax,
	GDCSpeakerSyntax,
	GDCChoiceSyntax,
	GDCEventSyntax,
	GDCEndSyntax
} from "./gdc_syntax";


const source = `
character BullyWalker

dialogue introduction:
	say "Hello!"
	autoadvance 1.5

	speaker Player
	say "Who are you?"

	choice:
		"Fight me!":
			speaker Player say "Fight me!"
			event start_boss_fight

		"Leave.":
			speaker Player say "I'm leaving."

	end
`;


const result = GDCParser.parse(source);

console.log("--- GDC PARSER TEST ---");

if (!result.successful) {
	console.error("Parser reported errors:");

	for (const diagnostic of result.diagnostics) {
		console.error(
			`Line ${diagnostic.line + 1}: ${diagnostic.message}`
		);
	}

	process.exitCode = 1;
} else {
	console.log("Parsing successful!");

	const file = result.syntax;
	const dialogue = file.dialogues[0];

	console.assert(
		file.character?.identifier === "BullyWalker",
		"Character should be BullyWalker."
	);

	console.assert(
		dialogue?.identifier === "introduction",
		"Dialogue should be introduction."
	);

	const instructions = dialogue.instructions;

	console.assert(
		instructions[0] instanceof GDCSaySyntax,
		"First instruction should be say."
	);

	const firstSay = instructions[0] as GDCSaySyntax;

	console.assert(
		firstSay.text === "Hello!",
		"First line should contain Hello!"
	);

	console.assert(
		firstSay.autoAdvance === 1.5,
		"Autoadvance should be attached to the first say."
	);

	console.assert(
		instructions[1] instanceof GDCSpeakerSyntax,
		"Second instruction should set the persistent speaker."
	);

	const choice = instructions.find(
		instruction => instruction instanceof GDCChoiceSyntax
	) as GDCChoiceSyntax;

	console.assert(
		choice.options.length === 2,
		"Choice should contain two options."
	);

	const firstOptionSay = choice.options[0].instructions[0];

	console.assert(
		firstOptionSay instanceof GDCSaySyntax,
		"First choice option should contain a say instruction."
	);

	console.assert(
		firstOptionSay instanceof GDCSaySyntax &&
		firstOptionSay.speakerOverride === "Player",
		"Inline speaker should override the speaker for that line."
	);

	console.assert(
		choice.options[0].instructions[1] instanceof GDCEventSyntax,
		"First choice option should contain an event."
	);

	console.assert(
		instructions[instructions.length - 1] instanceof GDCEndSyntax,
		"Dialogue should finish with end."
	);

	console.log("Character:", file.character?.identifier);
	console.log("Dialogue:", dialogue.identifier);
	console.log("Instructions:", instructions.length);
	console.log("Choice options:", choice.options.length);
	console.log("Autoadvance:", firstSay.autoAdvance);
	console.log("Inline speaker:", firstOptionSay instanceof GDCSaySyntax
		? firstOptionSay.speakerOverride
		: null);

	console.log("All parser tests passed!");
}
