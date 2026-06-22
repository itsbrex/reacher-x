import { UsagePage } from "@/features/usage/ui/UsagePage";

export default function Loading() {
  // Keep this fallback synchronous so route transitions don't suspend on cookies().
  return <UsagePage />;
}
