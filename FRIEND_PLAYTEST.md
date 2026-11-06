# Blazing Battle - Full-Game Friend Playtest

This branch copies the latest development game without modifying the stable `main` branch.

## Player experience
- Open the root of this branch's Cloudflare preview URL, not the old `friend-test.html` launcher.
- New visitors see the normal **Create Your Player** name-entry flow and the complete Home screen.
- Default team pairs: **Itachi / Obito**, **Lebee / Zabuza**, **Sub-Zero / Senku**. The friend-only team save key is `blazingBattle.friendTestTeam.v2`, so prior test sessions receive this lineup once but subsequent team edits persist.
- Every battle-ready playable unit is virtually unlocked for Edit Team. Incomplete/nonplayable units are not represented as finished fighters.
- Every summon is free: Ember display shows `∞` across the Home and Summon interfaces. Summons still use the original result animation and duplicate system.
- All standard menus are present, including Home, Summon, Units/Edit Team, Forge, and battle modes.
- Blazing Road first loads South Sac Approach (Stage 1). After playing Stage 1, the campaign continues through Moon Statue Garden (Stage 2).
- Optional separate test of the second battlefield: append `?bbFriendMap=2` to the *same full-game URL*. The first-login name flow and Home still appear before battle.
- Test map saves use separate browser keys per starting battlefield. The original dev or stable browser game data is not changed by this preview subdomain.

This is a development-only test build. Do not merge its unmetered summon economy into `dev` or `main`.
