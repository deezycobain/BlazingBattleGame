# Lebee Idle — v0.5.37

The four supplied idle source frames remain preserved.

Live battlefield loop now uses only:
1. frame_01
2. frame_02
3. frame_01

Timing:
- 480 ms per frame

Additional procedural bob and rotation remain disabled for Lebee.

Reason:
The later idle poses contain noticeably more character movement. They are useful
as source/reference frames, but were causing Lebee to visually travel and clip
during a supposedly stationary idle state.

No Meteor Jutsu, damage, stats, hitboxes, or other units were modified.
