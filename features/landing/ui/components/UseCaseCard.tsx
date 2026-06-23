"use client";

import Image from "next/image";
import type { UseCase } from "@/features/landing/lib/useCases";
import { cn } from "@/shared/lib/utils";

export function UseCaseCard({
  useCase,
  className,
  variant = "directory",
}: {
  useCase: UseCase;
  className?: string;
  variant?: "home" | "directory";
}) {
  const isHome = variant === "home";

  return (
    <article className={cn("group flex flex-col", className)}>
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={useCase.imageSrc}
          alt={`${useCase.title} use case example`}
          fill
          className="object-cover"
          sizes={
            isHome
              ? "(min-width: 1280px) 34vw, (min-width: 768px) 42vw, 86vw"
              : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          }
        />
      </div>

      <div className={cn("pt-4 pb-2", isHome && "pt-5")}>
        <h3
          className={cn(
            "font-semibold tracking-tight",
            isHome ? "text-xl md:text-2xl" : "text-base md:text-lg"
          )}
        >
          {useCase.title}
        </h3>
        <p
          className={cn(
            "text-muted-foreground mt-1.5",
            isHome ? "text-base leading-6 md:text-lg" : "text-sm md:text-base"
          )}
        >
          {useCase.description}
        </p>
      </div>
    </article>
  );
}
