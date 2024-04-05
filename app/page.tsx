"use client";
import { useWebContainer } from "@/components/useWebContainer";
import { files } from "@/config/projectFiles";
import { useRef } from "react";
export default function Home() {
  const webContainerInstance = useWebContainer();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  async function start() {
    if (textareaRef.current) {
      textareaRef.current.value = files["index.js"].file.contents;
    }
    await webContainerInstance?.mount(files);
    if (webContainerInstance) {
      const exitCode = await installDependencies();
      if (exitCode !== 0) {
        throw new Error("Installation failed");
      }
    }
    await startDevServer();
  }
  async function installDependencies() {
    // Install dependencies
    if (webContainerInstance) {
      const installProcess = await webContainerInstance.spawn("npm", [
        "install",
      ]);
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log(data);
          },
        })
      );
      // Wait for install command to exit
      return installProcess.exit;
    }
  }
  async function startDevServer() {
    // Run `npm run start` to start the Express app
    if (webContainerInstance) {
      await webContainerInstance.spawn("npm", ["run", "start"]);
    }

    // Wait for `server-ready` event
    webContainerInstance?.on("server-ready", (port, url) => {
      if (!iframeRef.current) return;
      iframeRef.current.src = url;
    });
  }

  start();
  return (
    <div className="">
      {webContainerInstance
        ? `WebContainer instance instantiated at ${webContainerInstance.workdir}.`
        : "WebContainer instance still booting."}

      <div className="grid grid-cols-2 h-dvh">
        <textarea ref={textareaRef} className="h-1/2 bg-black text-white" />
        <iframe ref={iframeRef} className="h-1/2 border w-full" />
      </div>
    </div>
  );
}
