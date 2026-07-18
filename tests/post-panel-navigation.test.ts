import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (file: string) => readFileSync(file, "utf8");

test("generic X posts and quoted X posts use the dedicated Post panel contract", () => {
  const tweetSource = readSource(
    "features/webapp/ui/components/tweet/Tweet.tsx"
  );
  const quoteSource = readSource(
    "features/webapp/ui/components/tweet/QuoteTweetCard.tsx"
  );
  const navigationSource = readSource(
    "features/webapp/hooks/usePostNavigation.ts"
  );

  assert.match(tweetSource, /openTwitterPost\(tweet, resolvedOpenBehavior\)/);
  assert.match(quoteSource, /openTwitterPost\(tweet,/);
  assert.doesNotMatch(tweetSource, /pushPanel\("conversation"/);
  assert.doesNotMatch(quoteSource, /pushPanel\("conversation"/);
  assert.match(navigationSource, /openPanel\("twitter-post"/);
});

test("generic and quoted LinkedIn posts use the LinkedIn Post panel contract", () => {
  const postSource = readSource(
    "features/webapp/ui/components/linkedin/LinkedInPostCard.tsx"
  );
  const quoteSource = readSource(
    "features/webapp/ui/components/linkedin/QuoteLinkedInCard.tsx"
  );
  const navigationSource = readSource(
    "features/webapp/hooks/usePostNavigation.ts"
  );

  assert.match(postSource, /openLinkedInPost\(post, resolvedOpenBehavior/);
  assert.match(quoteSource, /openLinkedInPost\(post,/);
  assert.match(navigationSource, /openPanel\("linkedin-post-thread"/);
});

test("explicit interaction conversations and reply composition remain separate", () => {
  const interactionsSource = readSource(
    "features/prospects/ui/components/tabs/YourInteractionsTab.tsx"
  );
  const replyProviderSource = readSource(
    "features/prospects/contexts/ProspectProfileContext.tsx"
  );

  assert.match(interactionsSource, /pushPanel\("conversation"/);
  assert.match(replyProviderSource, /pushPanel\("post-compose"/);
});

test("page-originated panels start a clean stack and nested panels push", () => {
  const stackSource = readSource(
    "features/prospects/contexts/PanelStackContext.tsx"
  );
  const twitterProfileSource = readSource(
    "features/webapp/ui/components/tweet/useTwitterProfileNavigation.ts"
  );

  assert.match(stackSource, /openRootPanel/);
  assert.match(twitterProfileSource, /panelStack\.currentPanel/);
  assert.match(twitterProfileSource, /panelStack\.openRootPanel/);
  assert.match(twitterProfileSource, /panelStack\.pushPanel/);
});

test("prospect surfaces render root platform panels without a selected prospect", () => {
  for (const file of [
    "app/(webapp)/page.tsx",
    "app/(webapp)/archives/page.tsx",
    "features/webapp/ui/pages/UseCaseSuccessPage.tsx",
  ]) {
    const source = readSource(file);
    assert.match(source, /const hasOpenPanel = currentPanel !== null/);
    assert.doesNotMatch(source, /const hasOpenPanel = prospectId !== null/);
  }

  const agentSource = readSource("features/agent/ui/AgentPageShell.tsx");
  assert.match(agentSource, /const showStandalonePanel =/);
  assert.match(agentSource, /currentPanel !== null/);
});

test("both Post panels use the desktop left divider without a right divider", () => {
  for (const file of [
    "features/prospects/ui/components/TwitterPostPanel.tsx",
    "features/webapp/ui/components/linkedin/LinkedInPostThreadPanel.tsx",
  ]) {
    const source = readSource(file);
    assert.match(source, /md:border-l/);
    assert.match(source, /md:border-r-0/);
  }
});
