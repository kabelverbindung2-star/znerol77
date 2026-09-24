// PowerShell + C# helper that stays alive for the whole app session. It is written to
// the userData folder and started once; Node talks to it with one JSON object per line.
// Keep this file pure ASCII: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.

const CSHARP = String.raw`
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

namespace Znerol {
  [StructLayout(LayoutKind.Sequential)]
  public struct PropertyKey { public Guid fmtid; public int pid; }

  [StructLayout(LayoutKind.Sequential)]
  public struct PropVariant { public ushort vt; public ushort r1; public ushort r2; public ushort r3; public IntPtr p1; public IntPtr p2; }

  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices);
    [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
    [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
  }

  [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceCollection {
    [PreserveSig] int GetCount(out int count);
    [PreserveSig] int Item(int index, out IMMDevice device);
  }

  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
    [PreserveSig] int OpenPropertyStore(int access, out IPropertyStore store);
    [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
    [PreserveSig] int GetState(out int state);
  }

  [ComImport, Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore {
    [PreserveSig] int GetCount(out int count);
    [PreserveSig] int GetAt(int index, out PropertyKey key);
    [PreserveSig] int GetValue(ref PropertyKey key, out PropVariant value);
  }

  [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioEndpointVolume {
    [PreserveSig] int RegisterControlChangeNotify(IntPtr notify);
    [PreserveSig] int UnregisterControlChangeNotify(IntPtr notify);
    [PreserveSig] int GetChannelCount(out int count);
    [PreserveSig] int SetMasterVolumeLevel(float db, ref Guid ctx);
    [PreserveSig] int SetMasterVolumeLevelScalar(float level, ref Guid ctx);
    [PreserveSig] int GetMasterVolumeLevel(out float db);
    [PreserveSig] int GetMasterVolumeLevelScalar(out float level);
    [PreserveSig] int SetChannelVolumeLevel(int channel, float db, ref Guid ctx);
    [PreserveSig] int SetChannelVolumeLevelScalar(int channel, float level, ref Guid ctx);
    [PreserveSig] int GetChannelVolumeLevel(int channel, out float db);
    [PreserveSig] int GetChannelVolumeLevelScalar(int channel, out float level);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid ctx);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
  }

  [ComImport, Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionManager2 {
    [PreserveSig] int GetAudioSessionControl(IntPtr sessionGuid, int flags, out IntPtr control);
    [PreserveSig] int GetSimpleAudioVolume(IntPtr sessionGuid, int flags, out IntPtr volume);
    [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator sessions);
  }

  [ComImport, Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionEnumerator {
    [PreserveSig] int GetCount(out int count);
    [PreserveSig] int GetSession(int index, out IAudioSessionControl2 session);
  }

  [ComImport, Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionControl2 {
    [PreserveSig] int GetState(out int state);
    [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string name);
    [PreserveSig] int SetDisplayName(IntPtr a, IntPtr b);
    [PreserveSig] int GetIconPath(IntPtr a);
    [PreserveSig] int SetIconPath(IntPtr a, IntPtr b);
    [PreserveSig] int GetGroupingParam(IntPtr a);
    [PreserveSig] int SetGroupingParam(IntPtr a, IntPtr b);
    [PreserveSig] int RegisterAudioSessionNotification(IntPtr a);
    [PreserveSig] int UnregisterAudioSessionNotification(IntPtr a);
    [PreserveSig] int GetSessionIdentifier(IntPtr a);
    [PreserveSig] int GetSessionInstanceIdentifier(IntPtr a);
    [PreserveSig] int GetProcessId(out int pid);
    [PreserveSig] int IsSystemSoundsSession();
  }

  [ComImport, Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISimpleAudioVolume {
    [PreserveSig] int SetMasterVolume(float level, ref Guid ctx);
    [PreserveSig] int GetMasterVolume(out float level);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid ctx);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
  }

  [ComImport, Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioMeterInformation {
    [PreserveSig] int GetPeakValue(out float peak);
  }

  // Undocumented but stable since Windows 7; used by every "switch audio device" tool.
  [ComImport, Guid("f8679f50-850a-41cf-9c72-430f290290c8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPolicyConfig {
    [PreserveSig] int GetMixFormat(IntPtr a, IntPtr b);
    [PreserveSig] int GetDeviceFormat(IntPtr a, int b, IntPtr c);
    [PreserveSig] int ResetDeviceFormat(IntPtr a);
    [PreserveSig] int SetDeviceFormat(IntPtr a, IntPtr b, IntPtr c);
    [PreserveSig] int GetProcessingPeriod(IntPtr a, int b, IntPtr c, IntPtr d);
    [PreserveSig] int SetProcessingPeriod(IntPtr a, IntPtr b);
    [PreserveSig] int GetShareMode(IntPtr a, IntPtr b);
    [PreserveSig] int SetShareMode(IntPtr a, IntPtr b);
    [PreserveSig] int GetPropertyValue(IntPtr a, int b, IntPtr c, IntPtr d);
    [PreserveSig] int SetPropertyValue(IntPtr a, int b, IntPtr c, IntPtr d);
    [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string deviceId, int role);
    [PreserveSig] int SetEndpointVisibility(IntPtr a, int b);
  }

  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
  [ComImport, Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9")] class PolicyConfigClient { }

  public static class Win {
    const int CLSCTX_ALL = 23;
    const int RENDER = 0;
    const int ACTIVE = 1;
    static readonly CultureInfo Inv = CultureInfo.InvariantCulture;
    static readonly Dictionary<int, string> AppNames = new Dictionary<int, string>();

    [DllImport("ole32.dll")] static extern int PropVariantClear(ref PropVariant pvar);
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern void mouse_event(uint flags, uint dx, uint dy, uint data, UIntPtr extra);
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);

    static void Check(int hr) { if (hr < 0) Marshal.ThrowExceptionForHR(hr); }

    public static string J(string s) {
      if (s == null) return "\"\"";
      var sb = new StringBuilder("\"");
      foreach (char c in s) {
        switch (c) {
          case '"': sb.Append("\\\""); break;
          case '\\': sb.Append("\\\\"); break;
          case '\n': sb.Append("\\n"); break;
          case '\r': sb.Append("\\r"); break;
          case '\t': sb.Append("\\t"); break;
          default:
            if (c < 0x20) sb.AppendFormat("\\u{0:x4}", (int)c); else sb.Append(c);
            break;
        }
      }
      return sb.Append('"').ToString();
    }

    static string F(float v) { return v.ToString("0.###", Inv); }

    static IMMDeviceEnumerator Enumerator() { return (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject()); }

    static IMMDevice DefaultDevice() {
      IMMDevice d;
      Check(Enumerator().GetDefaultAudioEndpoint(RENDER, 1, out d));
      return d;
    }

    static string DeviceName(IMMDevice d) {
      IPropertyStore store;
      if (d.OpenPropertyStore(0, out store) < 0) return "";
      var key = new PropertyKey { fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14 };
      PropVariant v;
      if (store.GetValue(ref key, out v) < 0) return "";
      string name = v.vt == 31 ? Marshal.PtrToStringUni(v.p1) : "";
      PropVariantClear(ref v);
      return name ?? "";
    }

    static string DeviceId(IMMDevice d) { string id; Check(d.GetId(out id)); return id; }

    static List<KeyValuePair<string, string>> ListDevices() {
      IMMDeviceCollection col;
      Check(Enumerator().EnumAudioEndpoints(RENDER, ACTIVE, out col));
      int n;
      Check(col.GetCount(out n));
      var list = new List<KeyValuePair<string, string>>();
      for (int i = 0; i < n; i++) {
        IMMDevice d;
        if (col.Item(i, out d) < 0) continue;
        list.Add(new KeyValuePair<string, string>(DeviceId(d), DeviceName(d)));
      }
      return list;
    }

    public static string Devices() {
      string def = "";
      try { def = DeviceId(DefaultDevice()); } catch { }
      var sb = new StringBuilder("[");
      bool first = true;
      foreach (var kv in ListDevices()) {
        if (!first) sb.Append(',');
        first = false;
        sb.Append("{\"id\":").Append(J(kv.Key)).Append(",\"name\":").Append(J(kv.Value))
          .Append(",\"isDefault\":").Append(kv.Key == def ? "true" : "false").Append('}');
      }
      return sb.Append(']').ToString();
    }

    public static void SetDefault(string id) {
      var pc = (IPolicyConfig)(new PolicyConfigClient());
      for (int role = 0; role < 3; role++) Check(pc.SetDefaultEndpoint(id, role));
    }

    public static string CycleDefault() {
      var list = ListDevices();
      if (list.Count == 0) return "null";
      string def = "";
      try { def = DeviceId(DefaultDevice()); } catch { }
      int idx = list.FindIndex(kv => kv.Key == def);
      var next = list[(idx + 1) % list.Count];
      if (next.Key != def) SetDefault(next.Key);
      return "{\"id\":" + J(next.Key) + ",\"name\":" + J(next.Value) + ",\"count\":" + list.Count + "}";
    }

    static IAudioEndpointVolume EndpointVolume() {
      Guid iid = typeof(IAudioEndpointVolume).GUID;
      object o;
      Check(DefaultDevice().Activate(ref iid, CLSCTX_ALL, IntPtr.Zero, out o));
      return (IAudioEndpointVolume)o;
    }

    public static string Master() {
      var v = EndpointVolume();
      float level; Check(v.GetMasterVolumeLevelScalar(out level));
      bool muted; Check(v.GetMute(out muted));
      return "{\"volume\":" + (int)Math.Round(level * 100) + ",\"muted\":" + (muted ? "true" : "false") + "}";
    }

    public static void SetMasterVolume(int percent) {
      Guid ctx = Guid.Empty;
      Check(EndpointVolume().SetMasterVolumeLevelScalar(Math.Max(0, Math.Min(100, percent)) / 100f, ref ctx));
    }

    public static void SetMasterMute(bool mute) {
      Guid ctx = Guid.Empty;
      Check(EndpointVolume().SetMute(mute, ref ctx));
    }

    static List<IAudioSessionControl2> SessionList() {
      Guid iid = typeof(IAudioSessionManager2).GUID;
      object o;
      Check(DefaultDevice().Activate(ref iid, CLSCTX_ALL, IntPtr.Zero, out o));
      IAudioSessionEnumerator en;
      Check(((IAudioSessionManager2)o).GetSessionEnumerator(out en));
      int n;
      Check(en.GetCount(out n));
      var list = new List<IAudioSessionControl2>();
      for (int i = 0; i < n; i++) {
        IAudioSessionControl2 s;
        if (en.GetSession(i, out s) >= 0 && s != null) list.Add(s);
      }
      return list;
    }

    static string AppName(int pid, out string process) {
      process = "";
      try {
        var p = Process.GetProcessById(pid);
        process = p.ProcessName;
        string cached;
        if (AppNames.TryGetValue(pid, out cached)) return cached;
        string name = "";
        try { name = p.MainModule.FileVersionInfo.FileDescription; } catch { }
        if (string.IsNullOrWhiteSpace(name)) name = p.ProcessName;
        AppNames[pid] = name;
        return name;
      } catch { return ""; }
    }

    public static string Sessions() {
      var sb = new StringBuilder("[");
      bool first = true;
      foreach (var s in SessionList()) {
        int state; s.GetState(out state);
        if (state == 2) continue; // expired
        int pid; s.GetProcessId(out pid);
        bool system = s.IsSystemSoundsSession() == 0;
        var vol = (ISimpleAudioVolume)s;
        float level = 0; vol.GetMasterVolume(out level);
        bool muted = false; vol.GetMute(out muted);
        float peak = 0;
        var meter = s as IAudioMeterInformation;
        if (meter != null) meter.GetPeakValue(out peak);
        string process = "system";
        string name = "Systemsounds";
        if (!system) name = AppName(pid, out process);
        if (!system && string.IsNullOrEmpty(process)) continue;
        if (!first) sb.Append(',');
        first = false;
        sb.Append("{\"pid\":").Append(pid)
          .Append(",\"process\":").Append(J(process))
          .Append(",\"name\":").Append(J(name))
          .Append(",\"system\":").Append(system ? "true" : "false")
          .Append(",\"active\":").Append(state == 1 ? "true" : "false")
          .Append(",\"peak\":").Append(F(peak))
          .Append(",\"volume\":").Append((int)Math.Round(level * 100))
          .Append(",\"muted\":").Append(muted ? "true" : "false").Append('}');
      }
      return sb.Append(']').ToString();
    }

    public static void SessionMute(int pid, bool mute) {
      Guid ctx = Guid.Empty;
      foreach (var s in SessionList()) {
        int p; s.GetProcessId(out p);
        if (p == pid) ((ISimpleAudioVolume)s).SetMute(mute, ref ctx);
      }
    }

    public static void SessionVolume(int pid, int percent) {
      Guid ctx = Guid.Empty;
      float level = Math.Max(0, Math.Min(100, percent)) / 100f;
      foreach (var s in SessionList()) {
        int p; s.GetProcessId(out p);
        if (p == pid) ((ISimpleAudioVolume)s).SetMasterVolume(level, ref ctx);
      }
    }

    public static void Click(string button, bool move, int x, int y, bool dbl) {
      if (move) SetCursorPos(x, y);
      uint down = 0x0002, up = 0x0004;
      if (button == "right") { down = 0x0008; up = 0x0010; }
      else if (button == "middle") { down = 0x0020; up = 0x0040; }
      int times = dbl ? 2 : 1;
      for (int i = 0; i < times; i++) {
        mouse_event(down, 0, 0, 0, UIntPtr.Zero);
        Thread.Sleep(6);
        mouse_event(up, 0, 0, 0, UIntPtr.Zero);
        if (dbl && i == 0) Thread.Sleep(40);
      }
    }

    public static void MediaKey(string action) {
      byte vk = action == "next" ? (byte)0xB0 : action == "prev" ? (byte)0xB1 : (byte)0xB3;
      keybd_event(vk, 0, 0, UIntPtr.Zero);
      keybd_event(vk, 0, 2, UIntPtr.Zero);
    }
  }
}
`

export const HELPER_SCRIPT = String.raw`
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

Add-Type -TypeDefinition @'
${CSHARP}
'@

$script:mgr = $null
$script:asTask = $null
$script:artKey = ''
$script:art = $null

function Await($op, [Type]$type) {
  $task = $script:asTask.MakeGenericMethod($type).Invoke($null, @($op))
  [void]$task.Wait(4000)
  return $task.Result
}

function Init-Media {
  if ($script:mgr) { return }
  Add-Type -AssemblyName System.Runtime.WindowsRuntime
  $script:asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation${'`'}1'
  })[0]
  [void][Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime]
  [void][Windows.Storage.Streams.IRandomAccessStreamWithContentType, Windows.Storage.Streams, ContentType = WindowsRuntime]
  $script:mgr = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
}

function Pick-Session {
  $sessions = @($script:mgr.GetSessions())
  $spotify = $sessions | Where-Object { $_.SourceAppUserModelId -like '*Spotify*' } | Select-Object -First 1
  if ($spotify) { return $spotify }
  $current = $script:mgr.GetCurrentSession()
  if ($current) { return $current }
  return $sessions | Select-Object -First 1
}

function Media-Info {
  Init-Media
  $s = Pick-Session
  if (-not $s) { return 'null' }
  $p = Await ($s.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $pb = $s.GetPlaybackInfo()
  $key = [string]$p.Title + '|' + [string]$p.Artist
  if ($key -ne $script:artKey) {
    $script:artKey = $key
    $script:art = $null
    try {
      if ($p.Thumbnail) {
        $stream = Await ($p.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
        $net = [System.IO.WindowsRuntimeStreamExtensions]::AsStreamForRead($stream)
        $ms = New-Object System.IO.MemoryStream
        $net.CopyTo($ms)
        if ($ms.Length -gt 0 -and $ms.Length -lt 2000000) { $script:art = 'data:image/jpeg;base64,' + [Convert]::ToBase64String($ms.ToArray()) }
      }
    } catch { $script:art = $null }
  }
  $info = [ordered]@{
    app = [string]$s.SourceAppUserModelId
    title = [string]$p.Title
    artist = [string]$p.Artist
    album = [string]$p.AlbumTitle
    status = [string]$pb.PlaybackStatus
    canNext = [bool]$pb.Controls.IsNextEnabled
    canPrev = [bool]$pb.Controls.IsPreviousEnabled
    art = $script:art
  }
  return ($info | ConvertTo-Json -Compress)
}

function Media-Control([string]$action) {
  try {
    Init-Media
    $s = Pick-Session
  } catch { $s = $null }
  if (-not $s) { [Znerol.Win]::MediaKey($action); return 'true' }
  switch ($action) {
    'next' { [void](Await ($s.TrySkipNextAsync()) ([bool])) }
    'prev' { [void](Await ($s.TrySkipPreviousAsync()) ([bool])) }
    default { [void](Await ($s.TryTogglePlayPauseAsync()) ([bool])) }
  }
  return 'true'
}

[Console]::Out.WriteLine('{"ready":true}')
[Console]::Out.Flush()

while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line.Trim().Length -eq 0) { continue }
  try { $req = $line | ConvertFrom-Json } catch { continue }
  $id = $req.id
  try {
    $data = 'true'
    switch ($req.cmd) {
      'ping' { $data = '"pong"' }
      'devices' { $data = [Znerol.Win]::Devices() }
      'setDefault' { [Znerol.Win]::SetDefault([string]$req.arg) }
      'cycle' { $data = [Znerol.Win]::CycleDefault() }
      'master' { $data = [Znerol.Win]::Master() }
      'setMasterVolume' { [Znerol.Win]::SetMasterVolume([int]$req.arg) }
      'setMasterMute' { [Znerol.Win]::SetMasterMute([bool]$req.arg) }
      'sessions' { $data = [Znerol.Win]::Sessions() }
      'sessionMute' { [Znerol.Win]::SessionMute([int]$req.pid, [bool]$req.arg) }
      'sessionVolume' { [Znerol.Win]::SessionVolume([int]$req.pid, [int]$req.arg) }
      'media' { $data = Media-Info }
      'mediaControl' { $data = Media-Control ([string]$req.arg) }
      'click' { [Znerol.Win]::Click([string]$req.button, [bool]$req.move, [int]$req.x, [int]$req.y, [bool]$req.double) }
      default { throw ('unknown command ' + $req.cmd) }
    }
    $out = '{"id":' + $id + ',"ok":true,"data":' + $data + '}'
  } catch {
    $msg = [Znerol.Win]::J([string]$_.Exception.Message)
    $out = '{"id":' + $id + ',"ok":false,"error":' + $msg + '}'
  }
  if ($null -ne $id) {
    [Console]::Out.WriteLine($out)
    [Console]::Out.Flush()
  }
}
`
