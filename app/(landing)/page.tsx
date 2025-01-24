import twitter from "twitter-text";
import { ThreadCard } from "@/features/landing/ui/components/ThreadCard";

// Mock data that you might fetch from a DB/API
const mockThreads = [
  {
    id: "1",
    detailHref: "/threads/1",
    avatarUrl: "https://avatars.githubusercontent.com/u/85483006?v=4",
    displayName: "ReacherX founder",
    username: "ReacherXfounder",
    dateTime: "· 1:27PM · Oct 4 2022",
    body: `1/4

    Hey, aspiring web developers! 👋  Web development is the art of building websites and web applications.  It involves everything from creating simple static pages to complex interactive platforms.
    
    Key areas:
    
    Front-end: Crafting the user interface (UI) - layout, design, and interactivity. Think visual appeal and user experience!
    Back-end: The behind-the-scenes magic! Building the server-side logic, databases, and security.
    Full-stack: Mastering both front-end and back-end to create complete web applications. The superhero of web dev! 💪
    
    Want to learn more? Check out this awesome guide by @freeCodeCamp: https://www.freecodecamp.org/learn/
    
    #webdev #coding`,
    repliesCount: "2",
    likesCount: "5",
    bookmarksCount: "3",
    impressionsCount: "10",
    repostsCount: "2",
    pro: true,
  },
  {
    id: "2",
    detailHref: "/threads/1",
    avatarUrl: "https://avatars.githubusercontent.com/u/85483006?v=4",
    displayName: "ReacherX founder",
    username: "ReacherXfounder",
    dateTime: "· 1:27PM · Oct 4 2022",
    replyingTo: "ReacherXfounder",
    body: `2/4

    So, you want to be a web developer? Awesome! Here are some essential skills you'll need:
    
    HTML: The backbone of every webpage. Learn to structure content effectively.
    CSS: Make it pretty! CSS styles the look and feel of your website.
    JavaScript: Bring your website to life with interactivity.
    Back-end languages: Python, PHP, Ruby, Node.js - pick your weapon!
    Databases: Store and manage data like a pro.
    Version control: Git is your friend. Keep track of your code changes.

    Explore different learning paths on @Codecademy: https://www.codecademy.com/
    
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

  // 2) Render the UI
  return (
    <main className="flex flex-wrap items-center justify-center gap-2">
      <section>
        {threadsWithParsedHtml.map((thread) => (
          <ThreadCard key={thread.id} {...thread} size="lg" />
        ))}
      </section>
    </main>
  );
}
