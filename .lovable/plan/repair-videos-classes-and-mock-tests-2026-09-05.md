# Repair videos, classes, and mock tests

## What will change
- Replace the current text-slide “video” with a real animated teaching-board player: formulas and working appear line by line as Sunny explains them, the board stays visible, and practice questions pause the lesson at the right moment.
- Make narration more lively and comic in an original Indian mentor style, without copying a real person’s voice.
- Make audio recover cleanly: validate each request, regenerate missing files, show the actual failure, and let students retry voice without losing their place.
- Make full-length and topic mocks open reliably instead of depending on one very long generation request. Generate and validate exam sections safely, preserve exact Indore/Rohtak/JIPMAT patterns, and expose useful retry progress/errors.
- Polish the mock screen toward a real computer-based test layout, especially on mobile.

## Verification
- Test a narrated topic lesson through playback, board animation, checkpoint, pause/resume, and audio retry.
- Test one topic test and one full-length paper from opening through the exam instructions and question navigation.
- Confirm exact section/question counts, timers, marking rules, and no app errors on mobile and desktop.

## Technical details
- Extend each lesson scene with short board-writing steps and a visual action cue; older cached lessons will be upgraded automatically.
- Split costly paper creation into smaller recoverable operations and prevent duplicate generation for the same paper.
- Keep generated audio and papers cached so repeat visits open quickly.
