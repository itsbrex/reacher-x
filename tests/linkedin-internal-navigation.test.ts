import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLinkedInAuthorIdentity,
  buildLinkedInMentionIdentity,
  getLinkedInTextAttributes,
} from "../shared/lib/linkedin/identity";
import type { UnifiedPost } from "../shared/lib/platforms/types";

test("LinkedIn authors resolve to person and company identities", () => {
  assert.deepEqual(
    buildLinkedInAuthorIdentity({
      id: "ACoAA-person",
      name: "Jane Doe",
      profileUrl: "https://www.linkedin.com/in/jane-doe",
      type: "PERSON",
    }),
    {
      entityType: "person",
      displayName: "Jane Doe",
      headline: undefined,
      avatarUrl: undefined,
      profileUrl: "https://www.linkedin.com/in/jane-doe",
      providerId: "ACoAA-person",
      username: undefined,
    }
  );

  assert.equal(
    buildLinkedInAuthorIdentity({
      name: "Acme",
      profileUrl: "https://www.linkedin.com/company/acme/",
    })?.entityType,
    "company"
  );
});

test("structured LinkedIn post mentions retain exact internal identities", () => {
  const post: UnifiedPost = {
    id: "urn:li:activity:123",
    platform: "linkedin",
    author: { name: "Sarah" },
    text: "Jane Doe joined Acme today.",
    createdAt: 1,
    raw: {
      textAttributes: [
        {
          length: 8,
          text: "Jane Doe",
          type: "profileMention",
          urn: "ACoAA-jane",
          url: "https://www.linkedin.com/in/jane-doe",
        },
        {
          length: 4,
          text: "Acme",
          type: "companyMention",
          urn: "1035",
          url: "https://www.linkedin.com/company/acme/",
        },
      ],
    },
  };

  const attributes = getLinkedInTextAttributes(post);
  assert.equal(attributes.length, 2);
  assert.deepEqual(attributes.map(buildLinkedInMentionIdentity), [
    {
      entityType: "person",
      displayName: "Jane Doe",
      profileUrl: "https://www.linkedin.com/in/jane-doe",
      providerId: "ACoAA-jane",
    },
    {
      entityType: "company",
      displayName: "Acme",
      profileUrl: "https://www.linkedin.com/company/acme/",
      providerId: "1035",
    },
  ]);
});

test("nested provider post payloads expose the same structured mentions", () => {
  const post: UnifiedPost = {
    id: "123",
    platform: "linkedin",
    author: {},
    text: "Microsoft",
    createdAt: 1,
    raw: {
      post: {
        textAttributes: [
          {
            text: "Microsoft",
            type: "companyMention",
            urn: "1035",
          },
        ],
      },
    },
  };

  assert.deepEqual(getLinkedInTextAttributes(post), [
    {
      length: undefined,
      text: "Microsoft",
      type: "companyMention",
      urn: "1035",
      url: undefined,
    },
  ]);
});
