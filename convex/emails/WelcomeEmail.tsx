// convex/emails/WelcomeEmail.tsx
import * as React from "react";
import { Tailwind } from "@react-email/tailwind";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Text,
  Button,
  Section,
  Hr,
} from "@react-email/components";

const tailwindConfig = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "Arial", "sans-serif"],
        mono: ["DM Mono", "Courier New", "monospace"],
      },
      colors: {
        neutral: {
          50: "#fafafa",
          500: "#737373",
          900: "#171717",
        },
      },
    },
  },
};

export const WelcomeEmail = () => {
  return (
    <Html>
      <Head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans&family=DM+Mono&display=swap"
          rel="stylesheet"
        />
      </Head>
      <Tailwind config={tailwindConfig}>
        <Body className="font-sans text-neutral-900">
          {/* Header */}
          <Container className="p-5">
            <Link href="https://reacherx.com" className="text-2xl font-bold">
              ReacherX
            </Link>
          </Container>
          <Hr />
          {/* Main Content */}
          <Container className="p-5">
            <Heading className="text-[1.5rem] leading-[120%] text-black">
              You're on the wait-list!
            </Heading>
            <Text className="mt-4 text-[1rem] leading-[150%]">
              You're officially on the ReacherX wait-list!
            </Text>
            <Text className="mt-2 text-[1rem] leading-[150%]">
              I’m Salman, and I’m building ReacherX.
            </Text>
            <Text className="mt-2 text-[1rem] leading-[150%]">
              Here are a few things you can do in the meantime:
            </Text>
            <ul className="mt-2 text-[1rem] leading-[150%]">
              <li>
                <strong>Join the Discord:</strong> I’m sharing early previews
                and getting feedback from people like you. ⇾{" "}
                <Link
                  href="https://discord.com/reacherx"
                  className="font-mono text-[1rem] leading-[150%] tracking-[-0.04em] text-neutral-500"
                >
                  discord.com/reacherx
                </Link>
              </li>
              <br />
              <li className="mt-2">
                <strong>Read my threads:</strong> I’ve been writing about
                ReacherX and why I think it’s important. ⇾{" "}
                <Link
                  href="https://reacherx.com/reacherx"
                  className="font-mono text-[1rem] leading-[150%] tracking-[-0.04em] text-neutral-500"
                >
                  reacherx.com/reacherx
                </Link>
              </li>
            </ul>
            <Text className="mt-4 text-[1rem] leading-[150%]">
              Thanks for joining the wait-list!
            </Text>
            <Text className="mt-2 text-[1rem] leading-[150%]">—Salman</Text>
            <Button
              href="https://discord.com/reacherx"
              className="mt-5 rounded bg-neutral-900 px-5 py-2 text-[0.875rem] text-neutral-50"
            >
              Join Discord
            </Button>
          </Container>
          <Hr />
          {/* Footer */}
          <Container className="p-5 text-center">
            <Link href="https://reacherx.com" className="text-xl font-bold">
              ReacherX
            </Link>
            <Text className="mt-2">
              <Link
                href="mailto:support@reacherx.com"
                className="text-neutral-500"
              >
                support@reacherx.com
              </Link>
            </Text>
            {/* Social Icons - Placeholder URLs */}
            <Section className="mt-4">
              <Link href="https://twitter.com/reacherx">
                <img
                  src="https://example.com/twitter-icon.png"
                  alt="Twitter"
                  className="mx-2 inline-block"
                />
              </Link>
              <Link href="https://facebook.com/reacherx">
                <img
                  src="https://example.com/facebook-icon.png"
                  alt="Facebook"
                  className="mx-2 inline-block"
                />
              </Link>
              {/* Add more icons as needed */}
            </Section>
            <Section className="mt-4">
              <Link href="#" className="mx-2 text-neutral-500">
                Unsubscribe
              </Link>
              <Link href="#" className="mx-2 text-neutral-500">
                Privacy policy
              </Link>
              <Link href="#" className="mx-2 text-neutral-500">
                Terms of service
              </Link>
            </Section>
            <Text className="mt-4 text-sm">
              Copyright © 2025{" "}
              <Link href="https://reacherx.com" className="text-neutral-500">
                ReacherX
              </Link>
              . All rights reserved.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
