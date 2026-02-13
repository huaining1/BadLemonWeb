import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";
import avatarImage from "@/assets/images/avatar.jpg";

function applyFavicon(url: string): void {
  const existing = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  const link = existing ?? document.createElement("link");
  link.rel = "icon";
  link.type = "image/jpeg";
  link.href = url;

  if (!existing) {
    document.head.appendChild(link);
  }
}

applyFavicon(avatarImage);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
