import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Serve these crawlers blocking (non-streamed) responses so notFound()
  // yields a real 404 status instead of a streamed 200 + noindex meta.
  // Extends Next's default list with Googlebot/Bingbot, which stream by
  // default because they can execute JS.
  htmlLimitedBots:
    /Googlebot|Bingbot|BingPreview|Slurp|DuckDuckBot|baiduspider|yandex|sogou|applebot|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|redditbot|ia_archiver/i,
};

export default nextConfig;
