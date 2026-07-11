using System;
using System.Diagnostics;
using System.IO;

internal static class StartLauncher
{
    private static int Main()
    {
        string launcherRoot = AppDomain.CurrentDomain.BaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        string internalRoot = Path.Combine(launcherRoot, "_internal");
        string appRoot = Directory.Exists(internalRoot) && File.Exists(Path.Combine(internalRoot, "server.py"))
            ? internalRoot
            : launcherRoot;
        string setupScript = ExistingPath(Path.Combine(internalRoot, "setup_and_start.bat"), Path.Combine(appRoot, "setup_and_start.bat"));
        string startScript = ExistingPath(Path.Combine(internalRoot, "start_sprite_video_lab.bat"), Path.Combine(appRoot, "start_sprite_video_lab.bat"));

        if (setupScript.Length == 0 || startScript.Length == 0)
        {
            ShowError("Launch scripts are missing. Please download SpriteForgeLab-light.zip again.");
            return 1;
        }

        string dataRoot = Environment.GetEnvironmentVariable("SPRITE_VIDEO_LAB_DATA_ROOT");
        if (string.IsNullOrWhiteSpace(dataRoot))
        {
            dataRoot = Path.Combine(appRoot, "_data");
        }

        string python = Environment.GetEnvironmentVariable("SPRITE_VIDEO_LAB_PYTHON");
        if (string.IsNullOrWhiteSpace(python))
        {
            python = Path.Combine(dataRoot, "venv", "Scripts", "python.exe");
        }

        string targetScript = IsRuntimeReady(python) ? startScript : setupScript;
        return RunScript(targetScript, appRoot);
    }

    private static string ExistingPath(string first, string second)
    {
        if (File.Exists(first)) return first;
        if (File.Exists(second)) return second;
        return string.Empty;
    }

    private static bool IsRuntimeReady(string python)
    {
        if (!File.Exists(python)) return false;

        try
        {
            using (Process process = new Process())
            {
                process.StartInfo.FileName = python;
                process.StartInfo.Arguments = "-c \"import PIL\"";
                process.StartInfo.UseShellExecute = false;
                process.StartInfo.CreateNoWindow = true;
                process.Start();
                if (!process.WaitForExit(8000))
                {
                    try { process.Kill(); } catch { }
                    return false;
                }
                return process.ExitCode == 0;
            }
        }
        catch
        {
            return false;
        }
    }

    private static int RunScript(string scriptPath, string appRoot)
    {
        try
        {
            ProcessStartInfo info = new ProcessStartInfo();
            info.FileName = "cmd.exe";
            info.Arguments = "/c \"" + scriptPath + "\"";
            info.WorkingDirectory = appRoot;
            info.UseShellExecute = false;
            info.EnvironmentVariables["SPRITE_VIDEO_LAB_APP_ROOT"] = appRoot;

            using (Process process = Process.Start(info))
            {
                if (process == null) return 1;
                process.WaitForExit();
                return process.ExitCode;
            }
        }
        catch (Exception ex)
        {
            ShowError("Failed to start: " + ex.Message);
            return 1;
        }
    }

    private static void ShowError(string message)
    {
        try
        {
            System.Windows.Forms.MessageBox.Show(message, "Sprite Forge Lab", System.Windows.Forms.MessageBoxButtons.OK, System.Windows.Forms.MessageBoxIcon.Error);
        }
        catch
        {
            Console.Error.WriteLine(message);
        }
    }
}
