import twitter from "twitter-text";
import { ThreadCard } from "@/features/landing/ui/components/ThreadCard";

// Mock data that you might fetch from a DB/API
const mockThreads = [
  {
    id: "1",
    detailHref: "/threads/1",
    avatarUrl: "https://avatars.githubusercontent.com/u/85483006?v=4",
    thread: true,
    displayName: "ReacherX founder",
    username: "ReacherXfounder",
    dateTime: "2023-03-01T00:00:00.000Z",
    body: `1/4

    Hey, aspiring web developers! Web development is the art of building websites and web applications.  It involves everything from creating simple static pages to complex interactive platforms.
    
    Want to learn more? Check out this awesome guide by @freeCodeCamp https://www.freecodecamp.org/learn/
    
    #webdev #coding`,
    repliesCount: "2000",
    likesCount: "50000",
    bookmarksCount: "32",
    impressionsCount: "1000000",
    repostsCount: "200000",
    pro: true,
  },
  {
    id: "2",
    detailHref: "/threads/1",
    avatarUrl: "https://avatars.githubusercontent.com/u/85483006?v=4",
    thread: false,
    displayName: "ReacherX founder",
    username: "ReacherXfounder",
    dateTime: "2023-03-02T00:00:00.000Z",
    replyingTo: "ReacherXfounder",
    body: `2/4

    So, you want to be a web developer? Awesome! Here are some essential skills you'll need:

    Explore different learning paths on @Codecademy https://www.codecademy.com/
    
    #webdevelopment #programming`,
    repliesCount: "200",
    likesCount: "58",
    bookmarksCount: "136",
    impressionsCount: "10",
    repostsCount: "20",
    pro: true,
  },
];

// This page.tsx is a Server Component by default, so we can parse on the server.
export default function Home() {
  // 1) Parse all bodies on the server
  const threadsWithParsedHtml = mockThreads.map((thread) => {
    // Escape any dangerous HTML in user input, then auto-link
    const escaped = twitter.htmlEscape(thread.body || "");
    const parsedBody = twitter.autoLink(escaped, {
      hashtagUrlBase: "https://twitter.com/hashtag/",
      // Replace mentionUrlBase with usernameUrlBase
      usernameUrlBase: "https://twitter.com/",
      usernameIncludeSymbol: true,
      targetBlank: true,
    });

    // Return a new object with the auto-linked HTML stored in parsedBody
    return {
      ...thread,
      parsedBody,
    };
  });

  return (
    <main className="flex flex-wrap items-center justify-center gap-2">
      <section className="max-w-4xl">
        {threadsWithParsedHtml.map((thread) => (
          <ThreadCard key={thread.id} {...thread} size="lg" />
        ))}
      </section>
    </main>
  );
}
