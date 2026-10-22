# Taskspace

A browser-local task workspace with a list and freely connected canvas. Built with React, Vite, TypeScript, Tailwind, React Flow, Zustand, and shadcn-style Radix components.

## Verification status

Source implementation and the supplied video are included. Dependencies are now installed locally. The TypeScript check, automated state/scheduling tests, and production build are checked during the scheduling update. Browser interactions and actual speaker/desktop-notification delivery still need a live browser check. No hosted deployment has been created.

## Run

Install Node.js 20.19+ or 22.12+ and run:

```sh
npm install
npm run dev
```

## Verify and build

```sh
npm test
npm run build
npm run preview
```

The production output is `dist/`. Host its contents using a static hosting service. Configure Vite's `base` when deploying beneath a subdirectory. Video URLs respect that configuration.

## Background video

Your supplied video is copied to `public/videos/background.mp4`. The original source file remains unchanged. Replace this project file to change the background. The video is about 10 MB and is served with the app, never through a Drive link. The app falls back to navy when playback is unavailable. Pause scenery controls playback, and reduced-motion preferences disable automatic playback.

## Saved data

Tasks, positions, visual connections, view, filter, viewport, and daily task history use the `taskspace-workspace-v1` localStorage key. This is browser-specific storage, with no account or cloud synchronization. Clearing site data removes the saved workspace and history. The latest deletion can be undone for eight seconds.

Connections are visual associations. They never block task completion. Select a line to remove it or press Delete/Backspace outside editable fields. Filters hide cards and lines without deleting their saved data.

## Clock, schedules, and alerts

The header clock shows hours, minutes, and seconds. Its timezone selector controls the display of all task schedules. Scheduled instants are stored in UTC, so changing the timezone never moves an existing task. Older saved tasks migrate without requiring a reset.

Each task card has a Set start & end time control. Choose start/end dates and times and an optional reminder 1, 5, 10, 15, or 30 minutes before the deadline. Overnight tasks use the following date for the end. Nonexistent and ambiguous daylight-saving times are rejected with an explanation. A reminder is skipped when it would occur at or before the session start.

Scheduled tasks become In progress at their start time. Cards display allocated duration, elapsed time, remaining time, and overtime. Completion records a timestamp and freezes Time taken. Time taken measures wall-clock time from the scheduled start to completion, including overtime; it does not measure active keyboard work. At the deadline, the task becomes Time is up and stays incomplete until the user checks it off.

Click Enable alerts to unlock sound and request desktop-notification permission. Sound and desktop notifications depend on browser support and permissions. A shared volume slider and separate Test completion / Test alarm actions are available after enabling sound.

A short rising completion chime plays once when a task changes from incomplete to complete, including tasks without schedules, completion in either view, and completion through the deadline alert. Reopening, editing, restoring completed tasks, refreshing, and switching views do not replay it. Checking off a task again after reopening it plays a fresh completion chime. This uses the shared task action, so one completion cannot produce separate sounds from both views.

Deadline alarms use a louder triangle-wave tone repeating every 1.6 seconds, with no automatic timeout. They continue until dismissed, muted, or the task is completed (or removed/rescheduled). The shared volume defaults to 80% and remains adjustable. Completion cancels currently queued alarm tones before playing the brief success chime. Muting and zero volume silence both sounds. Test alarm also loops until Stop test alarm is pressed. The player cleans up audio nodes and resumes suspended audio on a completion click where the browser allows it. All tones are synthesized locally with Web Audio and require no external sound files. In-app alerts remain visible until dismissed. With multiple alarms, dismiss all stops the batch.

Timers compare persisted timestamps with the current clock instead of counting interval ticks. On focus or resume, overdue events catch up with only the latest relevant alert per task, and delivered event keys prevent replay after refresh. Completed/deleted tasks do not alert. Rescheduling invalidates old pending alerts.

Keep the page open and the device awake for alerts. Closed tabs, browser suspension, muted devices, and operating-system restrictions can delay or prevent delivery. This local-only version cannot promise background alarms after closing the app. Background push scheduling would require additional service-worker and server infrastructure.

## Daily overview and statistics

Open Daily overview beside the List/Canvas and filter controls. The panel provides a date picker, a daily task-status list with filters, completion rate, completed versus unfinished counts, average time per timed completed task, overdue/in-progress counts, total recorded session time, on-time completion, and a seven-day stacked trend. Reports use the selected clock timezone and historical day boundaries, including daylight-saving changes.

Productivity means completion rate: completed / (completed + unfinished). It is not a rating of work quality. Unfinished tasks carry forward once their scheduled start date arrives; tasks created that day are also included even if scheduled later. Completed tasks count on their completion date. Repeated check-offs of the same task do not inflate the day's total.

Average time uses only completed tasks with a known scheduled start and a completion at or after it. It includes overtime and measures wall-clock session duration, not active work. Unscheduled completions still count as completed but do not enter time averages. Empty or unavailable averages display a dash rather than a fabricated zero.

Meaningful task changes append immutable snapshots to browser storage. Past dates reconstruct the final state recorded by that day's end; the current day remains live. Reopening or rescheduling tomorrow does not rewrite yesterday. Completion durations use the schedule captured when the task was completed. Deleting completed tasks retains their history. Deleted unfinished tasks are visible as Deleted on the deletion date and excluded from totals. Undo restores current workspace state and records a restoration.

Older workspaces migrate with baseline snapshots at the time of this upgrade. Tracking starts then, and the app explicitly avoids inventing earlier daily activity. Existing completed tasks without completion timestamps cannot be attributed to a day. History is local-only and will be lost if browser storage is cleared.

## Design system

### Cursor

On devices with a mouse or other fine pointer, navigation, buttons, menus, checkboxes, and canvas controls use a small gold ✨ cursor. It is a local SVG cursor asset with no tracking overlay or external service. Readable text and text-entry fields retain the normal I-beam, native selection, and clipboard shortcuts. Disabled controls keep the standard unavailable cursor. Touch devices retain their normal behavior.

Canvas card text uses React Flow's nodrag/nopan exclusions so selecting text does not move the card. A small grip and the card's surrounding padding remain available for dragging. The cursor style does not change the stable-blur transition implementation.

### Context transitions

List/Canvas switches and task filters use a single 460 ms movement of the live content with a gradual ease-in/out. Daily report dates, chart-day selection, report status filters, and timezone changes use the same motion language. The region stays fully opaque and cards retain their final blur throughout. Snapshot View Transitions are deliberately avoided for these glass surfaces, as are ancestor opacity/filter effects and animated workspace width. Rapid switches apply immediately in order and cancel only the previous movement.

Dialogs and overlays animate on both open and close, including task editing, schedules, and the daily overview. Dropdown menus animate from their trigger origin. Toasts and task reminders retain their content briefly for exit animations, with interaction disabled while exiting. Completion checkmarks and chart changes receive subtle feedback. Glass cards and empty-state surfaces do not replay a second entrance animation when the context movement ends.

Motion respects prefers-reduced-motion. The live clock, timer ticks, graph node transforms, and canvas dragging do not trigger context transitions. Animation does not restart the video, reset saved positions, or remount the sound controller. No additional animation package is needed. Browsers without Web Animations apply context changes immediately. Actual browser appearance still needs a live check in the target browser.

Instrument Serif and Inter load from Google Fonts, with local serif/sans-serif fallbacks. Accessible dialogs and menus use Radix primitives with shadcn-style locally owned components.

