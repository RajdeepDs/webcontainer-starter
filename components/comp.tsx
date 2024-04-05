"use client";
import { useWebContainer } from "@/components/useWebContainer";
import { files } from "@/config/projectFiles";
import { useCallback, useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function Home() {
  const webContainerInstance = useWebContainer();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);

  const terminalInstanceRef = useRef<Terminal | null>(null);

  const installDependencies = useCallback(
    async (terminal: Terminal) => {
      if (!webContainerInstance) return;

      const installProcess = await webContainerInstance.spawn("npm", [
        "install",
      ]);

      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        })
      );

      return installProcess.exit;
    },
    [webContainerInstance]
  );

  const startDevServer = useCallback(
    async (terminal: Terminal) => {
      if (!webContainerInstance) return;

      const devServerProcess = await webContainerInstance.spawn("npm", [
        "run",
        "start",
      ]);

      devServerProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal.write(data);
          },
        })
      );

      return new Promise<void>((resolve) => {
        webContainerInstance.on("server-ready", (port, url) => {
          if (!iframeRef.current) return;
          iframeRef.current.src = url;
          resolve();
        });
      });
    },
    [webContainerInstance]
  );

  const startShell = useCallback(
    async (terminal: Terminal) => {
      if (webContainerInstance) {
        const shellProcess = await webContainerInstance.spawn("bash", {
          terminal: {
            cols: terminal.cols,
            rows: terminal.rows,
          },
        });

        shellProcess.output.pipeTo(
          new WritableStream({
            write(data) {
              terminal.write(data);
            },
          })
        );
        const input = shellProcess.input.getWriter();

        terminal.onData((data) => {
          input.write(data);
        });

        return shellProcess;
      }
    },
    [webContainerInstance]
  );

  useEffect(() => {
    async function initializeWebContainer() {
      if (textareaRef.current) {
        textareaRef.current.value = files["index.js"].file.contents;

        textareaRef.current.addEventListener("input", (e) => {
          webContainerInstance?.fs.writeFile(
            "/index.js",
            textareaRef.current!.value
          );
        });
      }

      if (!webContainerInstance) return;

      await webContainerInstance.mount(files);
      const terminal = new Terminal();
      const fitAddon = new FitAddon();
      terminal.loadAddon(fitAddon);
      terminal.open(terminalRef.current!);
      fitAddon.fit();
      const shellProcess = await startShell(terminal);
      window.addEventListener("resize", () => {
        fitAddon.fit();
        if (shellProcess) {
          shellProcess.resize({
            cols: terminal.cols,
            rows: terminal.rows,
          });
        }
      });

      terminalInstanceRef.current = terminal;
      fitAddonRef.current = fitAddon;

      webContainerInstance.on("server-ready", (port, url) => {
        if (!iframeRef.current) return;
        iframeRef.current.src = url;
      });
    }

    initializeWebContainer();
  }, [webContainerInstance, installDependencies, startDevServer, startShell]);
  return (
    <div className="h-dvh">
      {webContainerInstance ? (
        `WebContainer instance instantiated at ${webContainerInstance.workdir}.`
      ) : (
        <div className="loading">WebContainer instance still booting...</div>
      )}

      <div className="grid grid-cols-2 h-1/2">
        <textarea
          ref={textareaRef}
          className="h-full bg-black text-white"
          defaultValue={files["index.js"].file.contents}
        />
        <iframe ref={iframeRef} className="h-full border w-full" />
      </div>

      <div ref={terminalRef} className="terminal" />
    </div>
  );
}
