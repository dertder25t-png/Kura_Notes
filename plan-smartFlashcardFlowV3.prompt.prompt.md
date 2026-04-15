## Plan: Smart Flashcard Flow v3

Redesign the Smart :: flow to be keyboard-first and instant in class: auto-create the best card on high-confidence lines, preserve one-direction defaults for definition lines, improve context extraction from neighboring lines, and move expensive classification work off hot typing paths so large notes stay responsive.

**Steps**
1. Phase 1 - Define Fast Path Rules (blocks all later phases)
2. Specify confidence policy in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): high-confidence Smart :: events bypass palette and create a card immediately with a short undo window; low-confidence events still open the palette.
3. Lock directional defaults in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): definition-like patterns default to one direction; explicit reverse/bidirectional markers are opt-in.
4. Phase 2 - Context Accuracy Model (depends on 1, parallelizable with Phase 3)
5. Define a context window contract in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): include parent heading, nearest sibling lines at same indent, and optional prior-definition lookup with strict size guards.
6. Document context provenance metadata in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): store which surrounding lines informed each card so users can validate source context in review/editor UI.
7. Define fallback behavior in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): if surrounding context is noisy/large, use current line + nearest parent only.
8. Phase 3 - Performance Architecture (depends on 1, parallel with Phase 2)
9. Add line-level classification cache strategy in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): hash by line text+indent, invalidate only changed lines, and cap cache size.
10. Define incremental parsing in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): avoid full-note split/reclassify on every keystroke by processing only edited line neighborhood.
11. Add debounce and scheduling targets in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): quick local marker updates under typing threshold and deferred heavy context scans.
12. Define large-note fast mode in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): for long notes, prioritize high-confidence patterns first and defer expensive pattern families until idle.
13. Phase 4 - UX Contract and Guardrails (depends on 2 and 3)
14. Update Smart :: UX section in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): instant-create toast + undo shortcut, minimal interruption in class mode, and explicit path to open palette when needed.
15. Align editor behavior in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md) with current implementation points from [src/components/notes/NoteEditor.tsx](src/components/notes/NoteEditor.tsx#L923) and [src/utils/paletteActions.ts](src/utils/paletteActions.ts#L12), documenting where autopick check executes before palette render.
16. Add error-handling/ambiguity states in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): if confidence is low or direction uncertain, open compact chooser with keyboard-only defaults.
17. Phase 5 - Validation Plan (depends on 4)
18. Add measurable acceptance criteria to [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): keystroke-to-card latency budget, typing responsiveness budget on long notes, and context-correctness pass rate from sample lecture outlines.
19. Add benchmark scenarios in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): short definition notes, deeply nested outlines, and large pasted lecture text.
20. Add rollout strategy in [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md): feature flag for autopick and perf mode, collect telemetry on undo rate and palette fallback rate.

**Relevant files**
- [SCHOLR_BLUEPRINT_V2.md](SCHOLR_BLUEPRINT_V2.md) - add new Smart :: subsections for auto-create, direction policy, context window contract, and performance architecture.
- [src/components/notes/NoteEditor.tsx](src/components/notes/NoteEditor.tsx#L923) - reference current trigger path and where autopick gate should be checked before showing palette.
- [src/utils/lineContext.ts](src/utils/lineContext.ts#L20) - reference classifier scope and where context-window and heading metadata rules apply.
- [src/utils/paletteActions.ts](src/utils/paletteActions.ts#L12) - reference action generation path for direction defaults and one-direction card behavior.
- [src/utils/batchCardGen.ts](src/utils/batchCardGen.ts#L5) - reference descendant extraction behavior for large-outline and fast-mode guidance.
- [src/hooks/useDebounce.ts](src/hooks/useDebounce.ts#L1) - reference debounce pattern to separate typing responsiveness from heavier classification work.

**Verification**
1. Validate blueprint completeness by checking every reported pain point is mapped to a section: direction, surrounding context, speed, and in-class interruption.
2. Run a trace review of Smart :: flow against [src/components/notes/NoteEditor.tsx](src/components/notes/NoteEditor.tsx#L923) to confirm the documented autopick decision point is before palette render.
3. Test plan scenarios on sample notes (small, nested, large) and record expected behavior for each: auto-create path, fallback chooser path, and context extraction path.
4. Verify performance targets are explicit and testable (latency and responsiveness thresholds) rather than qualitative.
5. Confirm UX guardrails include undo and low-confidence fallback so users can trust auto mode in live class capture.

**Decisions**
- Auto-create on Smart :: is default for high-confidence lines, with undo affordance.
- Definition-style lines default to one-direction cards; bidirectional output must be explicit or context-triggered for selected types.
- Blueprint scope is architecture and UX contract updates first; code changes happen after plan approval.

**Further Considerations**
1. Confidence threshold recommendation: start at 0.88 in class mode and tune using undo/fallback telemetry.
2. Context window recommendation: start with parent + up to two same-depth siblings to limit noise.
3. Large-note recommendation: enable fast mode above a configurable line-count threshold with idle-time deep scan.


**take focus mode and make it the default for in-class capture, with a streamlined Smart :: flow that minimizes interruptions and maximizes card generation speed and accuracy.**
- this will make it more likely that students can capture cards in real-time during lectures without breaking their flow, while still providing a path to the full palette when needed for edge cases. 
- we could also consider adding a setting to allow users to opt out of auto-create if they prefer the current behavior, but the default should be the faster, more seamless experience for in-class capture.
-and also add a clear undo option for any auto-created cards so users can easily revert if the system misclassifies or they change their mind.
- we could alaso add a small gemma 4.1 model to the backend just for the confidence classification task for while user is paused or not typing it can make sure the flashshard is accurate and also check if there are any issues and also if there are any notes that could be flashcards and sellect them as well, which would allow us to keep the main card generation model focused on accuracy and context extraction without worrying about latency as much.
- we should also make sure to collect telemetry on the auto-create feature, including how often it triggers, how often users undo it, and how often they end up using the full palette after an auto-create. This data will be crucial for tuning the confidence threshold and understanding user behavior around the new flow.
- finally, we should document the new flow and the rationale behind it in our internal documentation so that everyone on the team understands the changes and can provide feedback or suggestions for further improvements.
- we should also consider how this new flow will interact with other features in the note editor, such as bulk card generation or manual card creation. We want to make sure that the auto-create feature complements these existing workflows rather than conflicting with them.
- we should also think about how to handle edge cases, such as when a user is taking notes on a very complex topic with lots of nested information. In these cases, it might be better to default to the full palette rather than auto-creating cards, since the context might be more important for accurate card generation. We could use heuristics based on note structure or user behavior to determine when to trigger auto-create versus showing the palette. and also could have a ai model (gemma 4.1) running in the background to analyze the note structure and user behavior to make smarter decisions about when to auto-create versus show the palette. This model could also help with context extraction for more accurate card generation, especially in complex notes.
- but we need to make sure we consider the performance implications of running an additional model in the background, and we should prioritize optimizing the existing card generation model for speed and accuracy before adding new components to the architecture. and also the battery life implications for users on laptops or mobile devices, since running multiple models could increase resource usage. We should aim to keep the auto-create feature lightweight and efficient, perhaps by only running the background model during idle times or when the user is not actively typing. keeping run time and resource usage in mind will be crucial for ensuring that the new flow is a net positive for users without causing performance issues or draining battery life. we want this app to be as seamless and efficient as possible, especially for students who will be using it during lectures where they need to capture information quickly without distractions.
- we should have tests in place to validate the new flow, including unit tests for the confidence classification logic and integration tests to ensure that the auto-create feature works as expected in the note editor. We should also consider user testing to gather feedback on the new flow and identify any pain points or areas for improvement before rolling it out widely. User feedback will be crucial for refining the experience and ensuring that it meets the needs of our target audience. ( we need to make sure that the flashcards that are genreated are tested, we can see if theres any ai or automated way to test the quality of the flashcards that are being generated, we could also have a user testing group that can provide feedback on the quality and accuracy of the flashcards, this would help us identify any issues with the auto-create feature and make improvements based on real user feedback. we could also consider implementing a feedback mechanism within the app itself, allowing users to easily report any issues with auto-created cards or suggest improvements directly from the note editor. this would create a direct line of communication between users and our development team, helping us to quickly identify and address any problems with the new flow.)