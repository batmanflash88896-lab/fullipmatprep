import { createFileRoute } from "@tanstack/react-router";
import { Index } from "../index";

export const Route = createFileRoute("/index")({
  head: () => ({
    meta: [
      { title: "AscendIPM — Free daily IPMAT practice & AI tutor" },
      {
        name: "description",
        content:
          "Daily IPMAT Quant and VARC questions with solutions, shortcuts and common mistakes, plus a 24x7 AI doubt solver.",
      },
      { property: "og:title", content: "AscendIPM — Free daily IPMAT practice & AI tutor" },
      {
        property: "og:description",
        content: "Daily IPMAT practice, previous-year questions and an AI tutor that shows tricks and traps.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});