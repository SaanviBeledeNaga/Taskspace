# Taskspace

A calm, single-page to-do app built for a club tech-lead selection project. Create, edit, complete, and delete tasks in a simple list, arrange those same cards on a connected canvas, and keep ideas on a sticky-note board.

## Features

- **Task management:** quick add, descriptions, completion, active/completed filters, and an eight-second undo for task deletion.
- **Freeform canvas:** drag cards, zoom/pan, and connect either dot to either dot by dragging or clicking two dots. Larger connection handles show a plus on hover. Select a line to remove it.
- **Smart Arrange:** an explicit canvas action that lays out visible cards and connects them in sequence. Scheduled cards come first, in start-time order; untimed cards follow in creation order. Creation time breaks start-time ties; identical timestamps retain their original order. It keeps existing connections and hidden cards. Nothing rearranges automatically when a task is added or scheduled; cards remain draggable afterward. Lines represent visual associations, not enforced dependencies.
- **Scheduling:** start/end dates and times, allocated duration, elapsed/remaining time, overtime, and recorded completion time. A live HH:MM:SS clock and timezone selector control display without changing scheduled instants.
- **Reminders and sound:** enable alerts to unlock audio and optionally allow desktop notifications. Completion plays a short chime. Deadline alarms repeat until dismissed, muted, or the task is completed, deleted, or rescheduled. Adjustable volume and test controls are included.
- **Daily overview:** historical task statuses, completion rate, completed versus unfinished counts, average duration for timed completed tasks, overdue counts, and a seven-day trend.
- **Sticky notes:** click a note to edit its title and body; apply bold, italic, underline, strikethrough, highlight, text colour, and fonts to selected text. Add checklists, pictures, and documents, choose a pastel note colour, and save automatically as you write.
- **Task attachments:** the 📎 control beneath each card description accepts documents such as PDF, Word, Excel, and PowerPoint, as well as other files. Download or remove attached files; each file is limited to 20 MB.
- **Cinematic design:** locally served looping video, glass surfaces, Instrument Serif and Inter typography, gentle context transitions, a sparkle cursor on controls, and a soft white cursor glow over clickable elements. Text editing keeps the normal selection cursor. Reduced-motion preferences are respected.

## Video themes

Use the Themes button beside the clock to choose Golden Morning, Winter Retreat, Spring Garden, Autumn Library, or Rainy Evening. Each scene plays a locally bundled, muted looping MP4 featuring a woman reading, writing, or sketching. The original cinematic video is also available. Only the selected video is mounted; JPEG posters provide thumbnails and a still fallback. Selection, coordinated glass-surface colours, and a 0–60% background-dimming setting are saved per browser. Changing themes leaves tasks, notes, schedules, connections, and alert playback intact. All six scenes support pause/play and reduced-motion preferences.

The seasonal reference images were generated using Codex's built-in image-generation tool and revised to match the seated woman in the creator’s reference. The creator supplied five resulting video files; Google Flow was used for the project's background-video workflow. Full generation prompts and asset credits are in [public/themes/prompts.txt](public/themes/prompts.txt). No image-generation API runs in the deployed app.

## Google tools and development credits

The creator confirmed using all the following Google tools during project development. These are development credits; the deployed app does not call Gemini or these design tools at runtime.

| Tool | Purpose in the project workflow |
| --- | --- |
| Google Stitch | UI planning and interface exploration. |
| Google AI Studio / Gemini | Concept development, prompt iteration, and AI assistance while building the project. |
| Google Antigravity | AI-assisted development and implementation iteration. |
| Nano Banana | Visual and imagery exploration during the design process. |
| Google Flow | Visual planning and generation of the background video supplied for the app. |
| Firebase Hosting | Hosting the production build; GitHub Actions are configured to deploy changes from `main`. |
| Google Fonts | Instrument Serif for display text and Inter for the interface. |

Implementation and refinements in this repository were also assisted by Codex. See [log.txt](log.txt) for the available build history and actual prompts from this conversation. Separate external tool sessions are not reproduced or invented.

## Stack and structure

React 19, TypeScript, Vite, Tailwind CSS, React Flow (`@xyflow/react`), Zustand, Lucide icons, and accessible Radix primitives with locally owned shadcn-style UI components.

```text
src/
  App.tsx              List, canvas, shared task cards, and workspace navigation
  store.ts             Task/note state, persistence, connections, and undo
  arrange.ts           Start-time/creation ordering and canvas layout
  NotesBoard.tsx       Sticky-note board, rich editor, and checklists
  richText.ts          Allowed-format sanitization for note content
  Attachments.tsx      File picker, download/remove controls, image previews
  files.ts             IndexedDB Blob storage and file-size validation
  TaskTiming.tsx       Clock, task schedules, reminders, and alert controls
  timing.ts            Timezone conversion and timestamp-based scheduling
  sounds.ts            Locally synthesized Web Audio tones
  DailyOverview.tsx    Daily reports and charts
  statistics.ts        Historical snapshots and report calculations
  transitions.ts       Live-content context movement
  ClickGlow.tsx        Clickable-control cursor glow
public/videos/background.mp4
.github/workflows/      Firebase Hosting deployment and PR preview workflows
```

## Phone layout

The header, task controls, notes, reports, and theme picker adapt to narrow screens. Mobile inputs use readable text sizes, popups scroll within the available viewport, and safe-area padding accommodates phone notches. The canvas supports touch dragging, tap-to-connect, pinch zoom, and larger zoom/fit controls. The React Flow badge is hidden on the canvas; dependency license notices remain in the project.

## Run locally

Use Node.js 22 LTS and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173/`.

```sh
npm test
npm run build
npm run preview
```

The build checks TypeScript and writes production files to `dist/`. Tests cover shared state, graph ordering and connections, persistence/migration, notes and attachment metadata, scheduling/timezones, statistics, sound behavior, and context transitions. Speaker output, operating-system notifications, and device-specific browser behavior require manual checks.

## Firebase and GitHub deployment

The configured Firebase project is `taskspace-d17c0`. `firebase.json` serves `dist/` and rewrites navigation to `index.html`.

1. Commit reviewed changes and push to `main` in this repository.
2. The Firebase Hosting workflow installs locked dependencies, runs the automated tests and production build, then deploys the live channel.
3. Check the workflow result in GitHub Actions before assuming the live site has updated. Pull requests have a separate preview workflow.

The workflows use GitHub's `GITHUB_TOKEN` and the repository secret `FIREBASE_SERVICE_ACCOUNT_TASKSPACE_D17C0`, created during the Firebase/GitHub setup. Credentials belong in repository secrets, never in source files. A missing/expired service-account secret or insufficient workflow permissions will prevent deployment.

For a manual deployment from an already authorized Firebase CLI session:

```sh
npm run deploy
```

Replace the matching MP4 in `public/videos/` to update a scene; `background.mp4` is the original, with `morning.mp4`, `winter.mp4`, `spring.mp4`, `autumn.mp4`, and `rain.mp4` for the five themes. The current file is the creator's newer Flow video (about 3.35 MB), copied into the project. Playback uses a project-relative URL; no Drive link or computer-specific path is needed. A pause button, reduced-motion behavior, and a navy fallback are provided.

## Storage, privacy, and limits

- Task data, notes, attachment metadata, settings, positions, connections, and daily history are saved under `taskspace-workspace-v1` in localStorage. File contents are Blobs in the `taskspace-files-v1` IndexedDB database. Files are not encoded into localStorage.
- Workspace content and attachments stay in the current browser and website origin. Firebase Hosting distributes the app; it does not synchronize this data. Localhost and the deployed site have separate workspaces. Clearing site data removes both notes/tasks and files. Browser quotas and private browsing can limit saving; errors are shown in the interface.
- Removing an attachment deletes its file locally. Deleting a task keeps its file data available for undo. File data belonging to deleted cards or notes may remain in IndexedDB until site data is cleared.
- Rich note content is restricted to supported text formatting. Paste inserts plain text; documents download as files rather than executing inside the app. Images attached to notes have local previews.
- Reminders require the page to remain open and the device awake. Browsers can suspend tabs or audio; closed-tab/background delivery is not guaranteed. Desktop notifications require permission, and sound needs a user gesture to enable it.
- Time taken is wall-clock time from the scheduled start to completion, including overtime. It does not measure active work. Unscheduled tasks count toward completion totals but are excluded from time averages. Productivity is completion rate, not an assessment of work quality.
- Daily reports use recorded history and the selected timezone. Older workspaces begin tracking at migration time; earlier activity is not fabricated. Connections and daily history are preserved when changing views or filters.

## License

No open-source license has been selected. Third-party dependencies retain their respective licenses. The supplied background video belongs to the creator's project assets.
