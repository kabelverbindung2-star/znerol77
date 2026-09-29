// PowerShell + C# helper that stays alive for the whole app session. It is written to
// the userData folder and started once; Node talks to it with one JSON object per line.
// Keep this file pure ASCII: Windows PowerShell 5.1 reads BOM-less scripts as ANSI.

export const CSHARP = String.raw`
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net.NetworkInformation;
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

  // Cheap system facts without WMI (WMI queries were what made things slow or hang).
  public static class Sys {
    static readonly Dictionary<int, TimeSpan> lastCpu = new Dictionary<int, TimeSpan>();
    static DateTime lastAt = DateTime.MinValue;

    const uint HWND_BROADCAST = 0xFFFF;
    const uint WM_SYSCOMMAND = 0x0112;
    const int SC_MONITORPOWER = 0xF170;
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

    public static string Net() {
      long rx = 0, tx = 0, best = -1;
      string name = "";
      foreach (var ni in NetworkInterface.GetAllNetworkInterfaces()) {
        try {
          if (ni.OperationalStatus != OperationalStatus.Up) continue;
          if (ni.NetworkInterfaceType == NetworkInterfaceType.Loopback || ni.NetworkInterfaceType == NetworkInterfaceType.Tunnel) continue;
          var st = ni.GetIPStatistics();
          rx += st.BytesReceived;
          tx += st.BytesSent;
          if (st.BytesReceived > best) { best = st.BytesReceived; name = ni.Name; }
        } catch { }
      }
      return "{\"rx\":" + rx + ",\"tx\":" + tx + ",\"iface\":" + Win.J(name) + "}";
    }

    public static string Drives() {
      var sb = new StringBuilder("[");
      bool first = true;
      foreach (var d in DriveInfo.GetDrives()) {
        try {
          if (!d.IsReady || d.DriveType != DriveType.Fixed) continue;
          if (!first) sb.Append(',');
          first = false;
          sb.Append("{\"fs\":").Append(Win.J(d.Name.TrimEnd('\\'))).Append(",\"size\":").Append(d.TotalSize).Append(",\"free\":").Append(d.TotalFreeSpace).Append('}');
        } catch { }
      }
      return sb.Append(']').ToString();
    }

    // CPU % per process from the change of TotalProcessorTime since the previous call
    public static string Processes() {
      var now = DateTime.UtcNow;
      double elapsed = lastAt == DateTime.MinValue ? 0 : (now - lastAt).TotalMilliseconds;
      int cores = Math.Max(1, Environment.ProcessorCount);
      var seen = new Dictionary<int, TimeSpan>();
      var sb = new StringBuilder("[");
      bool first = true;
      foreach (var p in Process.GetProcesses()) {
        try {
          if (p.Id == 0) continue;
          double cpu = 0;
          try {
            var t = p.TotalProcessorTime;
            seen[p.Id] = t;
            TimeSpan prev;
            if (elapsed > 0 && lastCpu.TryGetValue(p.Id, out prev)) cpu = (t - prev).TotalMilliseconds / elapsed / cores * 100.0;
          } catch { }
          long mem = 0;
          try { mem = p.WorkingSet64; } catch { }
          if (!first) sb.Append(',');
          first = false;
          sb.Append("{\"pid\":").Append(p.Id)
            .Append(",\"name\":").Append(Win.J(p.ProcessName))
            .Append(",\"cpu\":").Append(Math.Max(0, cpu).ToString("0.##", CultureInfo.InvariantCulture))
            .Append(",\"mem\":").Append(mem).Append('}');
        } catch { } finally { p.Dispose(); }
      }
      lastCpu.Clear();
      foreach (var kv in seen) lastCpu[kv.Key] = kv.Value;
      lastAt = now;
      return sb.Append(']').ToString();
    }

    public static void Kill(int pid) {
      using (var p = Process.GetProcessById(pid)) p.Kill();
    }

    public static void SetPriority(int pid, string level) {
      ProcessPriorityClass c = ProcessPriorityClass.Normal;
      if (level == "low") c = ProcessPriorityClass.Idle;
      else if (level == "belownormal") c = ProcessPriorityClass.BelowNormal;
      else if (level == "abovenormal") c = ProcessPriorityClass.AboveNormal;
      else if (level == "high") c = ProcessPriorityClass.High;
      else if (level == "realtime") c = ProcessPriorityClass.RealTime;
      using (var p = Process.GetProcessById(pid)) p.PriorityClass = c;
    }

    // GPU load like Task Manager: sum of the 3D engine counters of all processes.
    static List<PerformanceCounter> gpuCounters;
    static DateTime gpuListAt = DateTime.MinValue;

    public static string Gpu() {
      if (gpuCounters == null || (DateTime.UtcNow - gpuListAt).TotalSeconds > 30) {
        if (gpuCounters != null) foreach (var c in gpuCounters) c.Dispose();
        gpuCounters = new List<PerformanceCounter>();
        var cat = new PerformanceCounterCategory("GPU Engine");
        foreach (var inst in cat.GetInstanceNames()) {
          if (inst.EndsWith("engtype_3D")) gpuCounters.Add(new PerformanceCounter("GPU Engine", "Utilization Percentage", inst, true));
        }
        foreach (var c in gpuCounters) { try { c.NextValue(); } catch { } }
        gpuListAt = DateTime.UtcNow;
      }
      double sum = 0;
      foreach (var c in gpuCounters) { try { sum += c.NextValue(); } catch { } }
      return "{\"load\":" + Math.Min(100.0, sum).ToString("0.#", CultureInfo.InvariantCulture) + "}";
    }

    // Monitors off, PC keeps running; any mouse move or key wakes them again.
    public static void MonitorOff() {
      PostMessage(new IntPtr(HWND_BROADCAST), WM_SYSCOMMAND, new IntPtr(SC_MONITORPOWER), new IntPtr(2));
    }

    // ---- rest mode: minimise the other apps and bring exactly those back later ----
    delegate bool EnumProc(IntPtr hwnd, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr hwnd);
    [DllImport("user32.dll")] static extern bool ShowWindowAsync(IntPtr hwnd, int cmd);
    [DllImport("user32.dll")] static extern int GetWindowTextLength(IntPtr hwnd);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr hwnd, out uint pid);
    [DllImport("user32.dll")] static extern IntPtr GetWindow(IntPtr hwnd, uint cmd);
    [DllImport("user32.dll")] static extern int GetWindowLong(IntPtr hwnd, int index);
    [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr hwnd, int attr, out int value, int size);

    static List<IntPtr> minimized = new List<IntPtr>();

    public static int MinimizeOthers(int ownPid) {
      var found = new List<IntPtr>();
      EnumWindows(delegate (IntPtr h, IntPtr l) {
        if (!IsWindowVisible(h) || IsIconic(h) || GetWindowTextLength(h) == 0) return true;
        if (GetWindow(h, 4) != IntPtr.Zero) return true; // owned popups follow their owner
        int ex = GetWindowLong(h, -20);
        if ((ex & 0x80) != 0) return true; // tool windows
        int cloaked;
        if (DwmGetWindowAttribute(h, 14, out cloaked, 4) == 0 && cloaked != 0) return true; // hidden store apps
        uint pid;
        GetWindowThreadProcessId(h, out pid);
        if ((int)pid == ownPid) return true;
        try { if (Process.GetProcessById((int)pid).ProcessName == "explorer" && GetWindowTextLength(h) == 0) return true; } catch { }
        found.Add(h);
        return true;
      }, IntPtr.Zero);
      foreach (var h in found) ShowWindowAsync(h, 6); // SW_MINIMIZE
      minimized = found;
      return found.Count;
    }

    public static int RestoreMinimized() {
      int n = 0;
      for (int i = minimized.Count - 1; i >= 0; i--) {
        if (IsIconic(minimized[i])) { ShowWindowAsync(minimized[i], 4); n++; } // SW_SHOWNOACTIVATE
      }
      minimized = new List<IntPtr>();
      return n;
    }

    // Windows 11 rounds every window and draws a thin border; the second-screen window
    // fills its monitor, so both would only show as a frame around the picture.
    [DllImport("dwmapi.dll")] static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

    public static string SquareWindow(long hwnd) {
      IntPtr h = new IntPtr(hwnd);
      int round = 1; // DWMWCP_DONOTROUND
      int none = unchecked((int)0xFFFFFFFE); // DWMWA_COLOR_NONE
      int a = DwmSetWindowAttribute(h, 33, ref round, 4); // DWMWA_WINDOW_CORNER_PREFERENCE
      int b = DwmSetWindowAttribute(h, 34, ref none, 4); // DWMWA_BORDER_COLOR
      return "{\"corner\":" + a + ",\"border\":" + b + "}";
    }

    // Windows 11 "power mode" (the slider in Settings > Power): best efficiency is the quietest.
    [DllImport("powrprof.dll")] static extern uint PowerGetEffectiveOverlayScheme(out Guid scheme);
    [DllImport("powrprof.dll")] static extern uint PowerSetActiveOverlayScheme(Guid scheme);

    public static string PowerMode() {
      try {
        Guid g;
        if (PowerGetEffectiveOverlayScheme(out g) == 0) return "\"" + g.ToString() + "\"";
      } catch { }
      return "null";
    }

    public static bool SetPowerMode(string guid) {
      try { return PowerSetActiveOverlayScheme(new Guid(guid)) == 0; } catch { return false; }
    }
  }

  // Autoclicker loop on its own thread: 1 ms timer resolution + SendInput, so up to
  // ~500 clicks per second are possible without Node/IPC in the hot path.
  // Clicks the mouse or presses a key (with Ctrl/Alt/Shift/Win), at fixed positions or
  // where the mouse is, with limits (count, time, screen corner, screen edge) and an
  // optional "hold" mode that only clicks while a key combination is held down.
  public static class Clicker {
    [StructLayout(LayoutKind.Sequential)]
    struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Sequential)]
    struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
    // 64-bit layout of INPUT (the helper always runs in 64-bit PowerShell on Windows 10/11)
    [StructLayout(LayoutKind.Explicit, Size = 40)]
    struct INPUT { [FieldOffset(0)] public uint type; [FieldOffset(8)] public MOUSEINPUT mi; [FieldOffset(8)] public KEYBDINPUT ki; }
    [StructLayout(LayoutKind.Sequential)]
    struct POINT { public int X; public int Y; }

    [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint count, INPUT[] inputs, int size);
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int vk);
    [DllImport("user32.dll")] static extern int GetSystemMetrics(int index);
    [DllImport("winmm.dll")] static extern uint timeBeginPeriod(uint period);
    [DllImport("winmm.dll")] static extern uint timeEndPeriod(uint period);

    static Thread worker;
    static volatile bool running;
    static volatile string state = "idle"; // idle | clicking | waiting (hold mode)
    static volatile string reason = "";    // why it stopped by itself
    static long clicks;

    static readonly int[] MOD_VK = { 0x11, 0x12, 0x10, 0x5B }; // Ctrl, Alt, Shift, Win (bit 1, 2, 4, 8)

    static INPUT Mouse(uint flags) {
      var i = new INPUT();
      i.type = 0; // INPUT_MOUSE
      i.mi.dwFlags = flags;
      return i;
    }

    static INPUT Key(int vk, bool up) {
      var i = new INPUT();
      i.type = 1; // INPUT_KEYBOARD
      i.ki.wVk = (ushort)vk;
      i.ki.dwFlags = up ? 0x0002u : 0u; // KEYEVENTF_KEYUP
      return i;
    }

    static bool Down(int vk) { return (GetAsyncKeyState(vk) & 0x8000) != 0; }

    static bool ComboDown(int vk, int mods) {
      if (vk <= 0 || !Down(vk)) return false;
      for (int b = 0; b < 4; b++) if ((mods & (1 << b)) != 0 && !Down(MOD_VK[b])) return false;
      return true;
    }

    /** One "press": modifiers down, the mouse button or key, modifiers up. */
    static INPUT[] Press(string button, int keyVk, int mods) {
      var list = new List<INPUT>();
      for (int b = 0; b < 4; b++) if ((mods & (1 << b)) != 0) list.Add(Key(MOD_VK[b], false));
      if (keyVk > 0) {
        list.Add(Key(keyVk, false));
        list.Add(Key(keyVk, true));
      } else {
        uint down = 0x0002, up = 0x0004;
        if (button == "right") { down = 0x0008; up = 0x0010; }
        else if (button == "middle") { down = 0x0020; up = 0x0040; }
        list.Add(Mouse(down));
        list.Add(Mouse(up));
      }
      for (int b = 3; b >= 0; b--) if ((mods & (1 << b)) != 0) list.Add(Key(MOD_VK[b], true));
      return list.ToArray();
    }

    static int[][] ParsePositions(string text) {
      var result = new List<int[]>();
      if (string.IsNullOrEmpty(text)) return result.ToArray();
      foreach (var part in text.Split(';')) {
        var xy = part.Split(',');
        int x, y;
        if (xy.Length == 2 && int.TryParse(xy[0], out x) && int.TryParse(xy[1], out y)) result.Add(new int[] { x, y });
      }
      return result.ToArray();
    }

    /** Old call (kept for the tests): mouse, optional fixed point, fixed jitter in ms. */
    public static void Start(string button, bool dbl, bool move, int x, int y, double intervalMs, double jitterMs, long limit) {
      Run(button, 0, 0, dbl, 30, intervalMs, 0, jitterMs, limit, 0, false, false, move ? (x + "," + y) : "", 0, 0);
    }

    public static void Run(string button, int keyVk, int mods, bool dbl, double dblGapMs, double intervalMs, double jitterPct, double jitterMs,
                           long limit, double timeLimitMs, bool cornerStop, bool edgeStop, string positions, int holdVk, int holdMods) {
      Stop();
      INPUT[] batch = Press(button, keyVk, mods);
      int size = Marshal.SizeOf(typeof(INPUT));
      double interval = Math.Max(2.0, intervalMs);
      int[][] points = ParsePositions(positions);
      bool hold = holdVk > 0;
      int vx = GetSystemMetrics(76), vy = GetSystemMetrics(77), vw = GetSystemMetrics(78), vh = GetSystemMetrics(79);
      running = true;
      reason = "";
      state = hold ? "waiting" : "clicking";
      Interlocked.Exchange(ref clicks, 0);
      worker = new Thread(() => {
        timeBeginPeriod(1);
        try {
          var sw = Stopwatch.StartNew();
          var rnd = new Random();
          double next = 0;
          int pointIndex = 0;
          while (running) {
            if (timeLimitMs > 0 && sw.Elapsed.TotalMilliseconds >= timeLimitMs) { reason = "time"; break; }
            if (cornerStop || edgeStop) {
              POINT c;
              if (GetCursorPos(out c)) {
                bool left = c.X <= vx + 1, right = c.X >= vx + vw - 2, top = c.Y <= vy + 1, bottom = c.Y >= vy + vh - 2;
                if (cornerStop && (left || right) && (top || bottom)) { reason = "corner"; break; }
                if (edgeStop && (left || right || top || bottom) && points.Length == 0) { reason = "edge"; break; }
              }
            }
            if (hold && !ComboDown(holdVk, holdMods)) {
              state = "waiting";
              Thread.Sleep(5);
              next = sw.Elapsed.TotalMilliseconds;
              continue;
            }
            state = "clicking";
            if (points.Length > 0) {
              int[] pt = points[pointIndex % points.Length];
              pointIndex++;
              SetCursorPos(pt[0], pt[1]);
            }
            SendInput((uint)batch.Length, batch, size);
            if (dbl) {
              Thread.Sleep((int)Math.Max(1, Math.Min(500, dblGapMs)));
              SendInput((uint)batch.Length, batch, size);
            }
            long n = Interlocked.Increment(ref clicks);
            if (limit > 0 && n >= limit) { reason = "limit"; break; }
            double step = interval;
            if (jitterPct > 0) step = interval * (1 + (rnd.NextDouble() * 2 - 1) * Math.Min(90, jitterPct) / 100.0);
            if (jitterMs > 0) step += rnd.NextDouble() * jitterMs;
            next += Math.Max(2.0, step);
            double now = sw.Elapsed.TotalMilliseconds;
            if (now - next > 100) next = now; // after a stall, do not try to catch up
            while (running) {
              double rest = next - sw.Elapsed.TotalMilliseconds;
              if (rest <= 0) break;
              if (rest > 2.0) Thread.Sleep(1); else Thread.SpinWait(40);
            }
          }
        } finally {
          running = false;
          state = "idle";
          timeEndPeriod(1);
        }
      });
      worker.IsBackground = true;
      worker.Priority = ThreadPriority.AboveNormal;
      worker.Start();
    }

    public static void Stop() {
      running = false;
      var w = worker;
      worker = null;
      if (w != null) w.Join(600);
    }

    public static string Status() {
      return "{\"running\":" + (running ? "true" : "false") + ",\"clicks\":" + Interlocked.Read(ref clicks) +
        ",\"state\":\"" + state + "\",\"reason\":\"" + reason + "\"}";
    }

    /** Where the mouse is right now (physical pixels), for "add position". */
    public static string CursorPos() {
      POINT c;
      GetCursorPos(out c);
      return "{\"x\":" + c.X + ",\"y\":" + c.Y + "}";
    }
  }
}
`

export const HELPER_SCRIPT = String.raw`
param([string]$CacheDll = '')
$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding $false
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false

$cs = @'
${CSHARP}
'@

# Compiling the C# takes 10-20 s on first use, so the result is kept as a DLL next to
# the script (the file name contains a hash of the source, so updates recompile).
function Test-Loaded { return [bool]('Znerol.Win' -as [type]) }
if ($CacheDll -and (Test-Path $CacheDll)) { try { Add-Type -Path $CacheDll } catch { } }
if (-not (Test-Loaded) -and $CacheDll) {
  try { Add-Type -TypeDefinition $cs -OutputAssembly $CacheDll -OutputType Library } catch { }
  if (-not (Test-Loaded) -and (Test-Path $CacheDll)) { try { Add-Type -Path $CacheDll } catch { } }
}
if (-not (Test-Loaded)) { Add-Type -TypeDefinition $cs }

$script:mgr = $null
$script:asTask = $null
$script:artKey = ''
$script:art = $null
$script:artTries = 0

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
  [void][Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
  [void][Windows.Storage.Streams.DataWriter, Windows.Storage.Streams, ContentType = WindowsRuntime]
  [void][Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
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

# WinRT stream -> byte[] (DataReader works in Windows PowerShell 5.1, AsStreamForRead does not always)
function Read-StreamBytes($stream) {
  $size = [uint32]$stream.Size
  if ($size -le 0 -or $size -ge 3000000) { return $null }
  $reader = New-Object Windows.Storage.Streams.DataReader ($stream.GetInputStreamAt(0))
  [void](Await ($reader.LoadAsync($size)) ([uint32]))
  $bytes = New-Object byte[] $size
  $reader.ReadBytes($bytes)
  $reader.Dispose()
  return ,$bytes
}

# CI check for Read-StreamBytes: write known bytes into a WinRT memory stream, read them back
function Stream-SelfTest {
  Init-Media
  $mem = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  $writer = New-Object Windows.Storage.Streams.DataWriter ($mem.GetOutputStreamAt(0))
  $data = [byte[]](1..200 | ForEach-Object { $_ % 256 })
  $writer.WriteBytes($data)
  [void](Await ($writer.StoreAsync()) ([uint32]))
  [void](Await ($writer.FlushAsync()) ([bool]))
  $back = Read-StreamBytes $mem
  $ok = ($back -ne $null) -and ($back.Length -eq 200) -and ($back[199] -eq 200)
  return ('{"ok":' + $ok.ToString().ToLower() + ',"length":' + $(if ($back) { $back.Length } else { 0 }) + '}')
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
    $script:artTries = 0
  }
  # players (Spotify) often hand over the cover a moment after the title: try a few times
  if (-not $script:art -and $script:artTries -lt 6 -and $p.Thumbnail) {
    $script:artTries++
    try {
      $stream = Await ($p.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
      $bytes = Read-StreamBytes $stream
      if ($bytes) {
        $mime = [string]$stream.ContentType
        if (-not $mime -or $mime -notlike 'image/*') { $mime = 'image/jpeg' }
        $script:art = 'data:' + $mime + ';base64,' + [Convert]::ToBase64String($bytes)
      }
      $stream.Dispose()
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
      'streamSelfTest' { $data = Stream-SelfTest }
      'mediaControl' { $data = Media-Control ([string]$req.arg) }
      'click' { [Znerol.Win]::Click([string]$req.button, [bool]$req.move, [int]$req.x, [int]$req.y, [bool]$req.double) }
      'clickStart' { [Znerol.Clicker]::Start([string]$req.button, [bool]$req.double, [bool]$req.move, [int]$req.x, [int]$req.y, [double]$req.interval, [double]$req.jitter, [long]$req.limit) }
      'clickRun' { [Znerol.Clicker]::Run([string]$req.button, [int]$req.key, [int]$req.mods, [bool]$req.double, [double]$req.gap, [double]$req.interval, [double]$req.jitterPct, 0, [long]$req.limit, [double]$req.time, [bool]$req.corner, [bool]$req.edge, [string]$req.positions, [int]$req.holdKey, [int]$req.holdMods) }
      'cursorPos' { $data = [Znerol.Clicker]::CursorPos() }
      'clickStop' { [Znerol.Clicker]::Stop() }
      'clickStatus' { $data = [Znerol.Clicker]::Status() }
      'net' { $data = [Znerol.Sys]::Net() }
      'drives' { $data = [Znerol.Sys]::Drives() }
      'processes' { $data = [Znerol.Sys]::Processes() }
      'kill' { [Znerol.Sys]::Kill([int]$req.pid) }
      'setPriority' { [Znerol.Sys]::SetPriority([int]$req.pid, [string]$req.arg) }
      'monitorOff' { [Znerol.Sys]::MonitorOff() }
      'gpu' { $data = [Znerol.Sys]::Gpu() }
      'squareWindow' { $data = [Znerol.Sys]::SquareWindow([long]$req.hwnd) }
      'minimizeOthers' { $data = [string][Znerol.Sys]::MinimizeOthers([int]$req.pid) }
      'restoreMinimized' { $data = [string][Znerol.Sys]::RestoreMinimized() }
      'powerMode' { $data = [Znerol.Sys]::PowerMode() }
      'setPowerMode' { $data = if ([Znerol.Sys]::SetPowerMode([string]$req.arg)) { 'true' } else { 'false' } }
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
