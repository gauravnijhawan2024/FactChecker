import { chromium } from "playwright";
import type { ExtractedContent } from "../types/analysis.js";
import type { IContentExtractor } from "./IContentExtractor.js";

export class NewsExtractor implements IContentExtractor<string> {
  async extract(url: string): Promise<ExtractedContent> {
    const browser = await chromium.launch({ headless: true });

    try {
      const page = await browser.newPage({
        userAgent: "Mozilla/5.0 FactCheckerBot/0.1"
      });

      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page.waitForLoadState("networkidle", { timeout: 10000 }).catch(() => undefined);

      const data = await page.evaluate<ExtractedContent>(`
        (() => {
          const clean = (value) => value ? value.replace(/\\s+/g, " ").trim() : undefined;
          const getMeta = (selector) => clean(document.querySelector(selector)?.content);
          const removeSelectors = ["nav", "footer", "aside", "script", "style", "noscript", "[role='navigation']", ".ad", ".ads", ".cookie"];

          const clone = document.body.cloneNode(true);
          removeSelectors.forEach((selector) => clone.querySelectorAll(selector).forEach((node) => node.remove()));

          const article = clone.querySelector("article") ?? clone.querySelector("main") ?? clone;
          const pageText = clean(article.textContent)?.slice(0, 45000) ?? "";

          return {
            title: clean(document.title) ?? getMeta("meta[property='og:title']"),
            description: getMeta("meta[name='description']") ?? getMeta("meta[property='og:description']"),
            pageText,
            author: getMeta("meta[name='author']") ?? getMeta("meta[property='article:author']"),
            publishDate:
              getMeta("meta[property='article:published_time']") ??
              getMeta("meta[name='date']") ??
              clean(document.querySelector("time")?.getAttribute("datetime")),
            images: Array.from(document.images)
              .map((img) => img.currentSrc || img.src)
              .filter(Boolean)
              .slice(0, 10)
          };
        })()
      `);

      return data;
    } finally {
      await browser.close();
    }
  }
}
