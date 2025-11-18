// app/(webapp)/search/page.tsx
import type { SearchParams } from "nuqs/server";
import { searchParamsCache } from "@/shared/lib/searchParams";
import { Suspense } from "react";

type PageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function Page({ searchParams }: PageProps) {
  const sp = await searchParams;

  await searchParamsCache.parse(sp);

  const SearchClient = (await import("./pageClient")).default;
  return (
    <Suspense>
      <SearchClient />
    </Suspense>
  );
}
