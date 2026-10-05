---
name: solution-sync
description: Sync the project Dataverse solution from DEV into solutions/ in Git (first-time clone or later sync), then review the diff for ALM problems. Use after any change made in the DEV environment, or when the user says "sync solution", "pull from DEV", "export solution".
---

# Solution sync: DEV → Git

The solution unique name and the pac profile are listed in CLAUDE.md. `SOLUTION` below means that name.
CLAUDE.local.md says which `pac` executable works on this machine.

## 1. Make sure you are connected to DEV

```powershell
pac org who
```

The friendly name must be **DEV**. If it isn't, run `pac auth select --name devfresh`.
**Never sync from TST**: it holds the managed build.

## 2. Pull the solution

First time (no `solutions/SOLUTION/` folder yet):

```powershell
pac solution clone --name SOLUTION --outputDirectory solutions --packagetype Both --processCanvasApps
```

Every later time:

```powershell
pac solution sync --solution-folder solutions/SOLUTION --packagetype Both --processCanvasApps
```

**Known gap (pac 2.11.2): `sync` drops service endpoints and their steps.** If `Other/Solution.xml` lists root
components of type 95 (service endpoint) or 92 (SDK step), `pac solution sync` leaves `<ServiceEndpoints />` and
`<SdkMessageProcessingSteps />` empty and does not write their files, so the pipeline would deploy without them.
After every sync, refresh them from a plain export:

```powershell
pac solution export --name SOLUTION --path <scratch>/s.zip --overwrite
pac solution unpack --zipfile <scratch>/s.zip --folder <scratch>/un
# copy <scratch>/un/PluginAssemblies and <scratch>/un/SdkMessageProcessingSteps over solutions/SOLUTION/src/
```

Then confirm `git status` shows no deletions in those folders. The export contains the SAS key name only, never the key.

If `sync` fails with "file is used by another process", make sure no shell has its working directory
inside `solutions/` and retry. If it then fails with `SolutionXmlVersioningException`, the folder was left
half-written: restore it with `git restore --source=HEAD -- solutions/SOLUTION` and `git clean -fd solutions/SOLUTION`,
or re-clone it if it was never committed, then sync again.

If the export fails because of a missing component (e.g. "solution does not include corresponding
Business Process entity"), report the exact component and the fix in the maker portal
(Solution → Add existing → …) to the user. Do not try to work around it.

## 3. Review the diff before committing

Run `git status` and `git diff --stat`, then check:

- Only components with the `cr679_` prefix or intentionally added system components (`account`, `contact`).
  System tables should be added **without "include all objects"**, i.e. only the changed columns/forms/views.
- No components from unrelated DEV solutions (TEST2, ShelterManager, …).
- No **environment variable current values** (`environmentvariablevalues.json`). Values belong in
  `config/deployment-settings.<env>.json`.
- No hardcoded URLs, GUIDs, e-mail addresses or secrets in flow JSON or Power Fx.
- Solution version bumped if this is a release.

Report findings to the user. Propose a conventional commit message. Commit only when the user asks.

## 4. (When release is planned) Build and check

```powershell
dotnet build solutions/SOLUTION --configuration Release
pac solution check --path <path-to-managed-zip>
pac solution create-settings --solution-folder solutions/SOLUTION --settings-file config/deployment-settings.tst.json
```

Build output (`bin/`, `obj/`, `*.zip`) is git-ignored.
