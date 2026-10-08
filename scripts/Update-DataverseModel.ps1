<#
.SYNOPSIS
    Regenerates the early-bound Dataverse model in shared/RentMaszyny.Dataverse.Model/Generated.

.DESCRIPTION
    Runs pac modelbuilder with builderSettings.json (tables, namespace, options). Run it after a schema change
    in DEV, together with /solution-sync, and commit the result. Uses the active pac auth profile, which must be DEV.

.EXAMPLE
    ./scripts/Update-DataverseModel.ps1
#>
[CmdletBinding()]
param(
    [string]$Pac = "$env:LOCALAPPDATA\Microsoft\PowerAppsCLI\pac.cmd"
)

$ErrorActionPreference = 'Stop'
$project = Join-Path $PSScriptRoot '..\shared\RentMaszyny.Dataverse.Model' | Resolve-Path
$output = Join-Path $project 'Generated'

$org = & $Pac org who | Select-String 'Friendly Name'
if ($org -notmatch 'DEV') {
    throw "The active pac profile is not DEV ($org). Run: pac auth select --name devfresh"
}

# Start from a clean folder so tables removed from the filter do not leave stale classes behind.
if (Test-Path $output) { Remove-Item $output -Recurse -Force }

& $Pac modelbuilder build `
    --settingsTemplateFile (Join-Path $project 'builderSettings.json') `
    --outdirectory $output
if ($LASTEXITCODE -ne 0) { throw "pac modelbuilder failed with exit code $LASTEXITCODE" }

Write-Host "Model regenerated in $output. Run 'dotnet test' in azure/functions before committing."
