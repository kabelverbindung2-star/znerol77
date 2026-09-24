// PowerShell scripts as plain strings. Keep this file free of imports and type
// annotations: CI evaluates it directly to run the scripts on a real Windows machine.

export const RUN = {
  'hkcu-run': 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
  'hklm-run': 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run',
  'hklm-run32': 'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Run'
}

// Where Windows (and Task Manager) stores the on/off state of startup entries.
export const SA = 'Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\StartupApproved'
export const APPROVED = {
  'hkcu-run': `HKCU:\\${SA}\\Run`,
  'hklm-run': `HKLM:\\${SA}\\Run`,
  'hklm-run32': `HKLM:\\${SA}\\Run32`,
  'user-folder': `HKCU:\\${SA}\\StartupFolder`,
  'common-folder': `HKLM:\\${SA}\\StartupFolder`
}

export const AUTOSTART_LIST_SCRIPT = `
$ErrorActionPreference = 'SilentlyContinue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false
$list = New-Object System.Collections.Generic.List[object]
$sa = '${SA}'

function Approved($key, $name) {
  $v = (Get-ItemProperty -Path $key -Name $name).$name
  if ($v -is [byte[]] -and $v.Length -gt 0) { return (($v[0] -band 1) -eq 0) }
  return $true
}

# entries parked by ZnerolMonitor 1.x / 2.0: move them back and mark them disabled the Windows way
$old = 'HKCU:\\Software\\ZnerolMonitor\\DisabledAutostart'
if (Test-Path $old) {
  $item = Get-Item $old
  foreach ($n in $item.Property) {
    $v = [string]$item.GetValue($n)
    New-ItemProperty -Path '${RUN['hkcu-run']}' -Name $n -Value $v -PropertyType String -Force | Out-Null
    New-Item -Path "HKCU:\\$sa\\Run" -Force | Out-Null
    $bytes = [byte[]](3,0,0,0) + [BitConverter]::GetBytes([DateTime]::Now.ToFileTime())
    Set-ItemProperty -Path "HKCU:\\$sa\\Run" -Name $n -Value $bytes -Type Binary
  }
  Remove-Item $old -Recurse -Force
}

function Add-Reg($path, $approved, $source, $label, $admin) {
  if (-not (Test-Path $path)) { return }
  $item = Get-Item -Path $path
  foreach ($n in $item.Property) {
    if ([string]::IsNullOrEmpty($n) -or $n -eq '(default)') { continue }
    $list.Add([pscustomobject]@{
      id = "$source|$n"; name = $n; command = [string]$item.GetValue($n); source = $source
      location = $label; enabled = (Approved $approved $n); needsAdmin = $admin
    })
  }
}
Add-Reg '${RUN['hkcu-run']}' '${APPROVED['hkcu-run']}' 'hkcu-run' 'Registry - nur du' $false
Add-Reg '${RUN['hklm-run']}' '${APPROVED['hklm-run']}' 'hklm-run' 'Registry - alle Benutzer' $true
Add-Reg '${RUN['hklm-run32']}' '${APPROVED['hklm-run32']}' 'hklm-run32' 'Registry - alle Benutzer (32-Bit)' $true

$shell = New-Object -ComObject WScript.Shell
function Add-Folder($dir, $approved, $source, $label, $admin) {
  if (-not $dir -or -not (Test-Path $dir)) { return }
  Get-ChildItem -Path $dir -File | Where-Object { $_.Name -ne 'desktop.ini' } | ForEach-Object {
    $target = $_.FullName
    if ($_.Extension -eq '.lnk') { try { $target = $shell.CreateShortcut($_.FullName).TargetPath } catch { } }
    $list.Add([pscustomobject]@{
      id = "$source|$($_.Name)"; name = [IO.Path]::GetFileNameWithoutExtension($_.Name); command = [string]$target
      file = $_.FullName; source = $source; location = $label; enabled = (Approved $approved $_.Name); needsAdmin = $admin
    })
  }
}
Add-Folder ([Environment]::GetFolderPath('Startup')) '${APPROVED['user-folder']}' 'user-folder' 'Autostart-Ordner - nur du' $false
Add-Folder ([Environment]::GetFolderPath('CommonStartup')) '${APPROVED['common-folder']}' 'common-folder' 'Autostart-Ordner - alle Benutzer' $true

# scheduled tasks that start at logon or boot (Windows' own tasks under \\Microsoft\\ are left out)
Get-ScheduledTask | Where-Object {
  $_.TaskPath -notlike '\\Microsoft\\*' -and
  ($_.Triggers | Where-Object { $_.CimClass.CimClassName -in @('MSFT_TaskLogonTrigger', 'MSFT_TaskBootTrigger') })
} | ForEach-Object {
  $a = $_.Actions | Select-Object -First 1
  $list.Add([pscustomobject]@{
    id = "task|$($_.TaskPath)$($_.TaskName)"; name = $_.TaskName
    command = ([string]$a.Execute + ' ' + [string]$a.Arguments).Trim(); taskPath = $_.TaskPath
    source = 'task'; location = 'Aufgabenplanung'; enabled = ($_.State -ne 'Disabled'); needsAdmin = $false
  })
}

ConvertTo-Json -InputObject $list.ToArray() -Depth 3 -Compress
`

