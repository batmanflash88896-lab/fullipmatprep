<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Mock exams
- Keep exam counts, section order, timing and marking in `src/lib/exam-patterns.ts`; all mock metadata and cached-paper validation derive from it to prevent stale database counts.
- Scope the serious CBT theme to the exam runner so classroom styling cannot change the exam workspace.
- Label AI-generated full-length papers as numbered practice mocks, never verified previous-year papers.
