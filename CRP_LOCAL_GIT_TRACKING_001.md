# Local Git tracking

The main build is versioned at C:\CRP-NEW on branch main. The initial commit captures the current code, tests, build directives and maintained legal records. It does not certify production readiness.

Git excludes dependencies, generated output/evidence, archives, report/media captures, secrets and private runtime data. Excluded files remain on disk; Git is not a backup of them. Selected maintained legal-source text and ledger records are tracked. Capture pages flagged by the token-pattern check remain local and ignored.

consumer-wizard is an existing independent Git repository, with its own history and local modifications. It is excluded from the parent repository rather than recorded as an inaccessible embedded Git link. Use Git within that folder for its separate changes; the maintained service UI is tracked by the parent repository.

Before each implementation batch, inspect git status. After verifying a coherent batch, inspect its diff and commit only the intended code/directive changes. Never add secrets, consumer reports or private runtime data. Do not use reset --hard, clean, or automatic staging to discard unrelated work.

The configured remote is https://github.com/dpwebb/CRP-NEW.git. Remote configuration does not upload files. No push was performed during setup.

October 6 exception: consumer-wizard/dist/jurisdiction-data.js is now explicitly tracked as a required runtime dependency in the parent baseline and included in the release manifest. Other files in the independent UI repository remain excluded and untouched.
