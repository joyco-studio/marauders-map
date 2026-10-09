# Scene sound effects

Use scene-owned JOYCO Suno playback for the supplied MP3 assets. Unlock on pointer/keyboard interaction. Play paper audio only during opening/closing phases and pen audio only while either right-margin inscription is writing. Stop loops when their animation finishes, on hidden/blurred tabs and teardown; audio failures must not block rendering. Validate source decoding, typecheck, lint, build and browser interaction.

## Validation

Both MP3s decode successfully. Typecheck, lint and the production build pass. The implementation uses one scene-owned Suno instance, exclusive voices and explicit stop/disposal paths. Audio failures are optional and do not prevent map loading.
