import { runPowerShell, isWindows } from './platform'

export interface AudioState {
  volume: number // 0-100
  muted: boolean
  devices: { name: string; status: string }[]
}

// Well-established community COM-interop snippet for talking to the Windows
// Core Audio API (IAudioEndpointVolume) straight from PowerShell — no extra
// modules or native Node addons required.
const AUDIO_TYPE = `
Add-Type -TypeDefinition @"
using System.Runtime.InteropServices;
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IAudioEndpointVolume {
  int f(); int g(); int h(); int i();
  int SetMasterVolumeLevelScalar(float fLevel, System.Guid pguidEventContext);
  int j();
  int GetMasterVolumeLevelScalar(out float pfLevel);
  int k(); int l(); int m(); int n();
  int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, System.Guid pguidEventContext);
  int GetMute(out bool pbMute);
}
[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDevice { int Activate(ref System.Guid id, int clsCtx, int activationParams, out IAudioEndpointVolume aev); }
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
interface IMMDeviceEnumerator { int f(); int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint); }
[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumeratorComObject { }
public class ZnerolAudio {
  static IAudioEndpointVolume Vol() {
    var enumerator = new MMDeviceEnumeratorComObject() as IMMDeviceEnumerator;
    IMMDevice dev = null;
    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out dev));
    IAudioEndpointVolume epv = null;
    var epvid = typeof(IAudioEndpointVolume).GUID;
    Marshal.ThrowExceptionForHR(dev.Activate(ref epvid, 23, 0, out epv));
    return epv;
  }
  public static float Volume {
    get { float v = -1; Marshal.ThrowExceptionForHR(Vol().GetMasterVolumeLevelScalar(out v)); return v; }
    set { Marshal.ThrowExceptionForHR(Vol().SetMasterVolumeLevelScalar(value, System.Guid.Empty)); }
  }
  public static bool Mute {
    get { bool mute; Marshal.ThrowExceptionForHR(Vol().GetMute(out mute)); return mute; }
    set { Marshal.ThrowExceptionForHR(Vol().SetMute(value, System.Guid.Empty)); }
  }
}
"@ -ErrorAction SilentlyContinue
`

export async function getAudioState(): Promise<AudioState> {
  if (!isWindows) return { volume: 0, muted: false, devices: [] }
  const out = await runPowerShell(`
    ${AUDIO_TYPE}
    $vol = [Math]::Round([ZnerolAudio]::Volume * 100)
    $mute = [ZnerolAudio]::Mute
    Write-Output "VOL:$vol"
    Write-Output "MUTE:$mute"
    Get-CimInstance Win32_SoundDevice | ForEach-Object { Write-Output "DEV:$($_.Name)|$($_.Status)" }
  `)
  const devices: { name: string; status: string }[] = []
  let volume = 0
  let muted = false
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('VOL:')) volume = parseInt(line.slice(4), 10) || 0
    else if (line.startsWith('MUTE:')) muted = line.slice(5).trim().toLowerCase() === 'true'
    else if (line.startsWith('DEV:')) {
      const [name, status] = line.slice(4).split('|')
      if (name) devices.push({ name, status: status || 'OK' })
    }
  }
  return { volume, muted, devices }
}

export async function setVolume(percent: number): Promise<void> {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
  const clamped = Math.max(0, Math.min(100, Math.round(percent))) / 100
  await runPowerShell(`${AUDIO_TYPE}\n[ZnerolAudio]::Volume = ${clamped}`)
}

export async function setMuted(muted: boolean): Promise<void> {
  if (!isWindows) throw new Error('Nur unter Windows verfügbar')
  await runPowerShell(`${AUDIO_TYPE}\n[ZnerolAudio]::Mute = $${muted ? 'true' : 'false'}`)
}
