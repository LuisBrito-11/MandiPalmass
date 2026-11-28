// Códigos de salida del script de impresión RAW.
export const SPOOLER_EXIT = Object.freeze({ OK: 0, PRINTER_NOT_FOUND: 2, WRITE_FAILED: 3 })

/**
 * Script de PowerShell que envía un archivo de bytes a una impresora instalada en
 * Windows usando el spooler en modo RAW (sin pasar por el driver gráfico).
 * Recibe `-PrinterName` y `-FilePath`.
 */
export const RAW_PRINT_SCRIPT = `
param([string]$PrinterName, [string]$FilePath)
$ErrorActionPreference = 'Stop'
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class RawPrinter {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
  public class DOCINFO {
    [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
    [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
    [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
  }
  [DllImport("winspool.drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool OpenPrinter(string name, out IntPtr handle, IntPtr defaults);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool ClosePrinter(IntPtr handle);
  [DllImport("winspool.drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode)]
  public static extern bool StartDocPrinter(IntPtr handle, int level, [In] DOCINFO info);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndDocPrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool StartPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool EndPagePrinter(IntPtr handle);
  [DllImport("winspool.drv", SetLastError = true)]
  public static extern bool WritePrinter(IntPtr handle, byte[] bytes, int count, out int written);
}
"@
$bytes = [System.IO.File]::ReadAllBytes($FilePath)
$handle = [IntPtr]::Zero
if (-not [RawPrinter]::OpenPrinter($PrinterName, [ref]$handle, [IntPtr]::Zero)) { exit ${SPOOLER_EXIT.PRINTER_NOT_FOUND} }
try {
  $doc = New-Object RawPrinter+DOCINFO
  $doc.pDocName = 'Ticket MandiPalmas'
  $doc.pDataType = 'RAW'
  if (-not [RawPrinter]::StartDocPrinter($handle, 1, $doc)) { exit ${SPOOLER_EXIT.WRITE_FAILED} }
  [void][RawPrinter]::StartPagePrinter($handle)
  $written = 0
  $ok = [RawPrinter]::WritePrinter($handle, $bytes, $bytes.Length, [ref]$written)
  [void][RawPrinter]::EndPagePrinter($handle)
  [void][RawPrinter]::EndDocPrinter($handle)
  if (-not $ok -or $written -ne $bytes.Length) { exit ${SPOOLER_EXIT.WRITE_FAILED} }
} finally {
  [void][RawPrinter]::ClosePrinter($handle)
}
exit ${SPOOLER_EXIT.OK}
`

/** Lista los nombres de las impresoras instaladas, una por línea y en UTF-8. */
export const LIST_PRINTERS_COMMAND =
  '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-CimInstance Win32_Printer | ForEach-Object { $_.Name }'
