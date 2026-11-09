# GDC - Godot Dialogue Compositor

![Icon is Godot but pink ;](/images/icon.png)

**This is a VSCode plugin for [GDC](https://github.com/its99studios/gdc) integration.**

GDC is a language and runtime made for handling dialogue in Godot. It has syntax similar to GDScript and integrates perfectly into Godot.

Make sure to use **.ngdc** files,

```
character ExampleGuy

# 1 GDC file can contain multiple conversations for a character!
dialogue introduction:
	say "Hello there! Do you-"
	autoadvance 0.5
	# Dialogue normally waits for user input, but you can autoadvance it

	# Other characters can talk
	Player say "I'm here for a reason."

	say "Oh..."

	say "Did HE bring you here?"

	# Choices!
	choice:
		"YES. YOU KNOW WHAT YOU DID.":
			# Call signals
			event start_fight
		"...No?":
			say "...Ok!"
	
	end
```
