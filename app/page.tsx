"use client";
import { useWebContainer } from "@/components/useWebContainer";
import { files } from "@/config/projectFiles";
import { useCallback, useEffect, useRef } from "react";

export default function Home() {
  const webContainerInstance = useWebContainer();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const installDependencies = useCallback(async () => {
    if (!webContainerInstance) return;

    const installProcess = await webContainerInstance.spawn("npm", ["install"]);

    installProcess.output.pipeTo(
      new WritableStream({
        write(data) {
          console.log(data);
        },
      })
    );

    return installProcess.exit;
  }, [webContainerInstance]);

  const startDevServer = useCallback(() => {
    if (!webContainerInstance) return;

    webContainerInstance.spawn("npm", ["run", "start"]).then(() => {
      webContainerInstance.on("server-ready", (port, url) => {
        if (!iframeRef.current) return;
        iframeRef.current.src = url;
      });
    });
  }, [webContainerInstance]);

  useEffect(() => {
    async function initializeWebContainer() {
      if (textareaRef.current) {
        textareaRef.current.value = files["index.js"].file.contents;
      }

      if (!webContainerInstance) return;

      await webContainerInstance.mount(files);

      const exitCode = await installDependencies();
      if (exitCode !== 0) {
        throw new Error("Installation failed");
      }

      startDevServer();
    }

    initializeWebContainer();
  }, [webContainerInstance, installDependencies, startDevServer]);
  return (
    <div className="h-dvh">
      {webContainerInstance
        ? `WebContainer instance instantiated at ${webContainerInstance.workdir}.`
        : "WebContainer instance still booting."}

      <div className="grid grid-cols-2 h-1/2">
        <textarea ref={textareaRef} className="h-full bg-black text-white" />
        <iframe ref={iframeRef} className="h-full border w-full" />
      </div>
    </div>
  );
}
