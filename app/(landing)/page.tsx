import twitter from "twitter-text";
import { PostCard } from "@/features/landing/ui/components/PostCard";
import { WaitlistForm } from "@/features/landing/ui/components/WaitlistForm";
import { WaitlistUserCard } from "@/features/landing/ui/components/WaitlistUserCard";
import { UserProfileCard } from "@/features/landing/ui/components/UserProfileCard";

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
    replies: "2000",
    likes: "50000",
    bookmarks: "32",
    impressions: "1000000",
    reposts: "200000",
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
    replies: "200",
    likes: "58",
    bookmarks: "136",
    impressions: "10",
    reposts: "20",
    pro: true,
  },
];

const mockProfile = {
  avatarUrl: "https://avatars.githubusercontent.com/u/85483006?v=4",
  displayName: "ReacherX founder",
  username: "ReacherXfounder",
  pro: true,
  bio: "Spreading positivity and good vibes! | Follow my bestie @AmazingFriend | #BeKind #LoveLife | Check out my blog: https://www.exampleblog.com 💻",
  link: "https://reacherx.com",
  followers: 96378,
  following: 876,
};

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

  // 1) Escape any potential HTML in the bio
  const escapedBio = twitter.htmlEscape(mockProfile.bio ?? "");

  // 2) Auto-link mentions, hashtags, and URLs using the same config as PostCard
  const parsedBio = twitter.autoLink(escapedBio, {
    hashtagUrlBase: "https://twitter.com/hashtag/",
    usernameUrlBase: "https://twitter.com/",
    usernameIncludeSymbol: true,
    targetBlank: true,
  });

  return (
    <section className="max-w-4xl md:mx-28">
      <div className="mb-12">
        <UserProfileCard {...mockProfile} parsedBio={parsedBio} />
      </div>
      <div className="mb-12">
        <WaitlistUserCard
          avatarUrl="https://avatars.githubusercontent.com/u/85483006?v=4"
          displayName="ReacherX founder"
          username="ReacherXfounder"
          pro={true}
        />
      </div>
      <div className="mb-12 px-4">
        <WaitlistForm />
      </div>
      {threadsWithParsedHtml.map((thread) => (
        <PostCard key={thread.id} {...thread} size="sm" />
      ))}
    </section>
  );
}
