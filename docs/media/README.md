# Farm animation

[farm-animation.svg](farm-animation.svg) is a standalone copy of the animated drawing at the top of the home page. Use it to show the animation to people outside the codebase, for example in a presentation or a team chat.

## Viewing it

Open the file in a browser (Chrome, Edge, Firefox or Safari), for example by dragging it into a browser window. It also plays when used as an image on a web page.

Many apps don't play SVG animations. WhatsApp, Teams, Slack and most email previews show nothing or a still frame, and so do PowerPoint, Word and Figma. For those, record a video or GIF of one loop instead.

## What moves

| Part | Loop | What happens |
| --- | --- | --- |
| Chicken | 28 s | Stands, turns and walks left, pecks the ground three times, walks to the barn, turns back, tries to fly (flapping and three hops), then walks home. |
| Birds | 24 s and 31 s | A flock of three flies left to right, and a pair flies right to left. Each bird is a flapping "v". |
| Tractor | 45 s | Drives along the back hill, behind the milking parlour, with a spinning wheel and smoke puffs. |
| Sun | – | Stands still in this file. On the website it follows the real sun (see below). |

The animation is plain CSS inside the SVG. There is no JavaScript, so it plays wherever SVG animation is allowed.

## How it differs from the website

The live version is [src/components/FarmIllustration.tsx](../../src/components/FarmIllustration.tsx) with its styles in [FarmIllustration.module.css](../../src/components/FarmIllustration.module.css). On the site:

- The sun stands where the real sun is, looking south from the campsite, and updates every minute. It sets behind the hills at night. The calculation is in [src/lib/sun.ts](../../src/lib/sun.ts).
- A round button in the bottom-left corner pauses and restarts the animation (WCAG 2.2.2).
- The Rustknop and the system setting "reduce motion" stop all motion. The chicken then stands at its usual spot and the tractor stays out of sight.
- Colours come from the design tokens in `src/styles/tokens.css`. This file has the same colours written out as hex values.

## Updating the file

This file is a copy and does not update itself. After you change the home page animation, copy the change across by hand:

1. Keyframes and timings: copy them from `FarmIllustration.module.css`, leaving out the parts for the pause button, the Rustknop and the paused state.
2. Shapes: copy the markup from `FarmIllustration.tsx` and `Chicken.tsx`, with `className` written as `class`, camelCase attributes such as `strokeWidth` written as `stroke-width`, and `var(--color-…)` replaced by the hex value from `tokens.css`.
3. Open the file in a browser and watch one full loop.
