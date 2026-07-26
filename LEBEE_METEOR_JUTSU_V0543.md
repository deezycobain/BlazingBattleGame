# Lebee Meteor Jutsu — v0.5.43

Final-impact flash timing was rebuilt.

Sequence:
- second-to-last meteor lands -> fullscreen yellow flash starts
- final meteor lands -> damage resolves and screen snaps to full white
- white holds briefly
- white fades slowly back to battle
- only after fade completes does the next action begin

The flash now uses a true fixed viewport overlay, not the battle canvas, so it covers the entire phone screen.

Timing:
- yellow lead-in: ~190 ms
- white hold: ~170 ms
- white fade: ~620 ms
