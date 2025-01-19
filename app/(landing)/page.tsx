import { Button } from "@/shared/ui/components/Button";

export default function Home() {
  return (
    <main className="flex h-screen flex-wrap items-center justify-center gap-2">
      <h1>Don&apos;t be lazy!</h1>
      <Button size="lg">Large button</Button>
      <Button>Default size</Button>
      <Button size="sm">Small size</Button>
    </main>
  );
}
