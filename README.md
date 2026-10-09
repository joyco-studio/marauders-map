# JOYCO Lab — 3D Template

Starter template for building interactive 3D web experiences with [Three.js](https://threejs.org), [XYZ](https://hub.joyco.studio/toolbox/xyz), and [Next.js](https://nextjs.org).

## Quick Start

The fastest way to get started is with the [JOYCO CLI](https://github.com/joyco-studio/joyco-cli):

```bash
npx joyco create
```

Or clone and install manually:

```bash
git clone https://github.com/joyco-studio/lab-template-3d.git
cd lab-template-3d
npm install
npm run dev
```

## Stack

- **Next.js 16** — App Router
- **React 19** — UI
- **Three.js** — 3D graphics
- **@joycostudio/xyz** — Lifecycle, state, debug, and Three.js warmup utilities
- **Tailwind CSS 4** — Styling
- **TypeScript** — Type safety

## Scripts

| Command         | Description              |
| --------------- | ------------------------ |
| `npm run dev`   | Start dev server         |
| `npm run build` | Production build         |
| `npm start`     | Start production server  |
| `npm run lint`  | Run ESLint               |

## Themes

Switch themes via URL parameter:

```
?theme=dark      # default
?theme=light
?theme=radio
?theme=terminal
```

Use `?lab=true` to hide the header for a full-screen 3D experience.

## Project Structure

```
app/
  layout.tsx        # Root layout with theme support
  page.tsx          # Home page
  globals.css       # Global styles and theme variables
components/
  scene.tsx         # Three.js canvas, native OrbitControls, and XYZ teardown
  header.tsx        # Header with logo
  theme-init.tsx    # Theme initialization
```

## License

MIT
