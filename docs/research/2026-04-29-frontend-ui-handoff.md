# 2026-04-29 Frontend UI Handoff

## Purpose

This document summarizes the recent standalone frontend and UI iteration for `日记络络`, so a forked conversation can continue without re-explaining the visual work.

## Scope Of This Iteration

This round focused on the in-game galgame scene shell only:

- Main in-game scene layout
- Character placement and scale
- Bottom dialogue box structure and styling
- Left-side date/location marker
- Bottom-right hover controls
- Static prototype workflow used to tune the layout

This round did **not** finalize the visual design of:

- Main menu
- Save / load screen
- Log screen
- Modal styling for interact / move / investigate

## Core Files

### Static prototype

- `/root/lologames/docs/research/ui-prototype/src/App.vue`
- Preview URL used during iteration: `http://185.92.181.232:18787/`

### Real desktop renderer

- `/root/lologames/standalone-app/apps/desktop/src/renderer/views/GameView.vue`
- `/root/lologames/standalone-app/apps/desktop/src/renderer/components/GameHud.vue`

### Real assets used

- Background: `lolocard/src/日记络络/图片/背景/学校教室/白天.jpg`
- Portrait: `lolocard/src/日记络络/图片/立绘/开衫/微笑.png`

These were copied into the frontend public assets and used directly in the prototype and app shell.

## Final In-Game UI Decisions

### Overall direction

The previous web-like prototype was rejected. The accepted direction is:

- Image-first galgame composition, not a generic web UI
- Real background and real character art, no placeholders
- Scene-only presentation for the current frame, without central action buttons
- Very light UI presence with most controls hidden until hover

### Character

- Character is centered horizontally
- Character is bottom-aligned so the half-body cut does not show awkwardly
- Character was reduced from full-height to `85vh`
- Goal: leave about one head of empty space above the head

### Left-side date marker

- Moved to vertical layout on the left side
- Sakura ornaments were removed in the accepted version
- Text was changed from `4月17日 - 放学后` to `四月十七日 - 放学后`
- Numbers were intentionally replaced with Chinese characters
- Shadow was repeatedly increased to remain readable over bright background areas

### Bottom dialogue area

- Full-width integrated bottom area
- Dialogue box and bottom bar are visually merged into one piece
- No hard top border line anymore
- Top edge now fades in softly using a mask gradient
- Fade region was expanded to occupy a larger share of the box
- Box height was increased so the bottom area feels more substantial

### Dialogue texture

- The dialogue box uses a very light frosted-glass look
- Added a very faint diagonal white sakura watermark/pattern
- Pattern is intentionally large, slanted, and barely visible

### Speaker name and body text

- Speaker name is on its own line near the upper portion of the dialogue box
- Text remains left-aligned, but the content block is visually pushed toward center by increasing left/right inner padding
- Name and body typography were tuned via an interactive temporary control panel, then hardcoded

### Bottom-right controls

- Controls only appear on hover
- Sakura glyphs were rejected for these controls
- Current accepted icon labels are:
  - `⏵ AUTO`
  - `⏭ SKIP`
  - `📜 LOG`
  - `⚙ MENU`

## Hardcoded Typography / Layout Values

These values came from the temporary visual tuning control panel and were then committed into the frontend:

```json
{
  "nameFontSize": 43,
  "nameMarginTop": 47,
  "nameMarginBottom": 18,
  "nameLetterSpacing": 4,
  "textFontSize": 24,
  "textLineHeight": 3,
  "textLetterSpacing": 2,
  "paddingTop": 7
}
```

Corresponding shell values now in use:

- Character height: `85vh`
- Bottom area min height: `35vh`
- Bottom area padding: `7vh 15vw 4vh`
- Bottom area fade mask: `linear-gradient(to bottom, transparent 0%, black 40%)`

## Temporary Tuning Tool

During this iteration, a temporary slider-based control panel was added to the static prototype so the user could interactively tune:

- Name font size
- Name top / bottom margin
- Name letter spacing
- Text font size
- Text line height
- Text letter spacing
- Dialogue area top padding

That temporary control panel has now been removed from the prototype after the values were captured.

## Frontend / Runtime Status

At this point:

- The approved in-game shell styling has been ported into the real desktop renderer
- The real desktop renderer already contains basic implementations for:
  - Main menu
  - New game view
  - Game view
  - Save / load modal
  - Log drawer
- These non-scene views/components are currently functional skeletons, not visually finalized designs

## Open Visual Items

The following frontend areas are still function-first and visually unresolved:

- Main menu
- Save / load UI
- Log UI
- Interact / move / investigate modal styling

## Recommendation For The Next Conversation

Recommended order:

1. Keep the current in-game scene styling as the accepted baseline.
2. Treat main menu, save/load, and log as a separate design pass.
3. Do that design pass in a clean forked conversation to avoid context pollution.

Reasoning:

- The core scene shell has already consumed many fine-grained visual iterations.
- Menu / save / log deserve their own design pass and should be judged together as one UI family.
- Separating them into the next conversation will keep the new thread focused and easier to steer.

## Suggested Next Task In Forked Chat

Suggested prompt direction for the forked conversation:

"We already finalized the in-game scene UI. Use the handoff doc at `/root/lologames/docs/research/2026-04-29-frontend-ui-handoff.md`. Now design and implement the visual style for main menu, save/load, and log so they match the accepted in-game scene language."
