"use client";

import { useContext } from "react";
import { WebContainerContext } from "./Providers";

export function useWebContainer() {
  const webContainer = useContext(WebContainerContext);

  return webContainer;
}
