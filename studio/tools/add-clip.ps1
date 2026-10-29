<#
	Add a video to the studio clip library.

	    .\add-clip.ps1 "C:\path\to\clip.mp4" -Title "Cold open"
	    .\add-clip.ps1 https://youtu.be/dQw4w9WgXcQ -Title "The reaction"
	    .\add-clip.ps1 -List
	    .\add-clip.ps1 -Remove cold-open

	A local file is re-encoded to a web-friendly MP4 and written into studio/clips/,
	so every guest and OBS pulls it from the GitHub Pages CDN instead of from your
	uplink. Deploy afterwards and the clip appears in the control room.

	GitHub refuses any single file over 100 MB, so the encode targets well under that.
	A clip longer than about four minutes at this bitrate will not fit: trim it first.
#>
[CmdletBinding()]
param(
	[Parameter(Position = 0)][string]$Source,
	[string]$Title,
	[int]$Bitrate = 3000,
	[switch]$List,
	[switch]$Remove,
	[string]$Id
)

$ErrorActionPreference = "Stop"
$clipDir = Join-Path (Split-Path $PSScriptRoot -Parent) "clips"
$manifestPath = Join-Path $clipDir "clips.json"
$MaxBytes = 95MB

if (-not (Test-Path $clipDir)) { New-Item -ItemType Directory -Path $clipDir | Out-Null }
if (-not (Test-Path $manifestPath)) { [IO.File]::WriteAllText($manifestPath, "[]", (New-Object Text.UTF8Encoding($false))) }

function Read-Manifest {
	$raw = Get-Content -Path $manifestPath -Raw -Encoding utf8
	if ([string]::IsNullOrWhiteSpace($raw)) { return @() }
	$parsed = $raw | ConvertFrom-Json
	if ($null -eq $parsed) { return @() }
	return @($parsed)
}

function Write-Manifest($items) {
	$json = ConvertTo-Json -InputObject @($items) -Depth 5
	if ($items.Count -eq 0) { $json = "[]" }
	# Windows PowerShell's -Encoding utf8 always writes a byte order mark, and a BOM
	# in front of "[" makes the file fail a plain JSON.parse. Write it clean.
	[IO.File]::WriteAllText($manifestPath, $json, (New-Object Text.UTF8Encoding($false)))
}

function New-Slug($text) {
	$s = $text.ToLowerInvariant()
	$s = [Text.RegularExpressions.Regex]::Replace($s, "[^a-z0-9]+", "-")
	$s = $s.Trim("-")
	if ([string]::IsNullOrWhiteSpace($s)) { $s = "clip" }
	if ($s.Length -gt 48) { $s = $s.Substring(0, 48).Trim("-") }
	return $s
}

# ---- list ----------------------------------------------------------------
if ($List) {
	$items = @(Read-Manifest)
	if ($items.Count -eq 0) { Write-Host "No clips yet. Add one with: .\add-clip.ps1 <file-or-youtube-url>"; exit 0 }
	Write-Host ""
	foreach ($c in $items) {
		$where = if ($c.type -eq "youtube") { "YouTube " + $c.src } else { $c.src }
		$size = ""
		if ($c.type -eq "file") {
			$p = Join-Path $clipDir (Split-Path $c.src -Leaf)
			if (Test-Path $p) { $size = "  [" + [math]::Round((Get-Item $p).Length / 1MB, 1) + " MB]" }
		}
		Write-Host ("  {0,-24} {1}{2}" -f $c.id, $where, $size)
		Write-Host ("  {0,-24} {1}" -f "", $c.title) -ForegroundColor DarkGray
	}
	Write-Host ""
	exit 0
}

# ---- remove --------------------------------------------------------------
if ($Remove) {
	$target = if ($Id) { $Id } else { $Source }
	if (-not $target) { Write-Host "Which clip? .\add-clip.ps1 -Remove <id>" -ForegroundColor Red; exit 1 }
	$items = @(Read-Manifest)
	$hit = $items | Where-Object { $_.id -eq $target }
	if (-not $hit) { Write-Host "No clip with id '$target'." -ForegroundColor Red; exit 1 }
	if ($hit.type -eq "file") {
		$p = Join-Path $clipDir (Split-Path $hit.src -Leaf)
		if (Test-Path $p) { Remove-Item $p -Force; Write-Host "Deleted $p" }
	}
	Write-Manifest (@($items | Where-Object { $_.id -ne $target }))
	Write-Host "Removed '$target'. Deploy to publish the change." -ForegroundColor Green
	exit 0
}

if (-not $Source) {
	Write-Host "Usage: .\add-clip.ps1 <file-or-youtube-url> [-Title ""Name""]" -ForegroundColor Yellow
	Write-Host "       .\add-clip.ps1 -List"
	Write-Host "       .\add-clip.ps1 -Remove <id>"
	exit 1
}

$items = @(Read-Manifest)

# ---- YouTube -------------------------------------------------------------
$ytMatch = [Text.RegularExpressions.Regex]::Match($Source, "(?:youtu\.be/|[?&]v=|/embed/|/shorts/)([A-Za-z0-9_-]{11})")
if ($ytMatch.Success) {
	$vid = $ytMatch.Groups[1].Value
	if (-not $Title) { $Title = "YouTube $vid" }
	$id = New-Slug $Title
	if ($items | Where-Object { $_.id -eq $id }) { $id = $id + "-" + (Get-Random -Maximum 999) }
	$items += [pscustomobject]@{ id = $id; title = $Title; type = "youtube"; src = $vid }
	Write-Manifest $items
	Write-Host ""
	Write-Host "Added YouTube clip '$Title' as id '$id'." -ForegroundColor Green
	Write-Host "Nothing to upload: guests stream it from YouTube themselves."
	Write-Host "Deploy to publish it to the control room."
	exit 0
}

# ---- local file ----------------------------------------------------------
if (-not (Test-Path $Source)) { Write-Host "No such file: $Source" -ForegroundColor Red; exit 1 }
$src = (Resolve-Path $Source).Path
if (-not $Title) { $Title = [IO.Path]::GetFileNameWithoutExtension($src) }
$id = New-Slug $Title
if ($items | Where-Object { $_.id -eq $id }) { $id = $id + "-" + (Get-Random -Maximum 999) }
$outName = "$id.mp4"
$outPath = Join-Path $clipDir $outName

$ffmpeg = (Get-Command ffmpeg -ErrorAction SilentlyContinue)
if (-not $ffmpeg) {
	Write-Host "ffmpeg is not installed. Run:  winget install Gyan.FFmpeg" -ForegroundColor Red
	exit 1
}

Write-Host ""
Write-Host "Encoding for the web (H.264, ${Bitrate}k, faststart)..." -ForegroundColor Cyan
& ffmpeg -v error -y -i $src `
	-c:v libx264 -preset slow -b:v "${Bitrate}k" -maxrate "$([int]($Bitrate*1.4))k" -bufsize "$([int]($Bitrate*2))k" `
	-vf "scale='min(1920,iw)':-2" -pix_fmt yuv420p `
	-c:a aac -b:a 160k -ar 48000 `
	-movflags +faststart $outPath

if (-not (Test-Path $outPath)) { Write-Host "Encoding failed." -ForegroundColor Red; exit 1 }

$bytes = (Get-Item $outPath).Length
$mb = [math]::Round($bytes / 1MB, 1)
if ($bytes -gt $MaxBytes) {
	Remove-Item $outPath -Force
	Write-Host ""
	Write-Host "That came to $mb MB, over the 100 MB GitHub limit." -ForegroundColor Red
	Write-Host "Trim the clip, or re-run with a lower bitrate, for example:" -ForegroundColor Yellow
	Write-Host "  .\add-clip.ps1 ""$Source"" -Bitrate 1800"
	exit 1
}

$dur = ""
try {
	$probe = & ffprobe -v error -show_entries format=duration -of csv=p=0 $outPath
	if ($probe) { $dur = [math]::Round([double]$probe, 1) }
} catch {}

$items += [pscustomobject]@{ id = $id; title = $Title; type = "file"; src = $outName; seconds = $dur }
Write-Manifest $items

Write-Host ""
Write-Host "Added '$Title' as id '$id'  ($mb MB)" -ForegroundColor Green
Write-Host "  $outPath"
Write-Host ""
Write-Host "Deploy to publish it, then it appears in the control room clip library."
