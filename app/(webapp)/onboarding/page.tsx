"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { Button } from "@/shared/ui/components/Button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/shared/ui/components/Form";
import { Textarea } from "@/shared/ui/components/TextArea";
import { cn } from "@/shared/lib/utils/utils";
import { storeWorkspaceDescription } from "@/shared/lib/utils/localStorage";

// Validation schema following the requirements
const onboardingSchema = z.object({
  description: z
    .string()
    .min(64, {
      message: "Description must be at least 64 characters.",
    })
    .max(512, {
      message: "Description must not be longer than 512 characters.",
    }),
});

type OnboardingFormValues = z.infer<typeof onboardingSchema>;

// Character count constants
const MIN_CHARS = 64;
const MAX_CHARS = 512;

/**
 * Helper function to get help text based on character count
 * Following the specification for different states
 */
function getHelpText(charCount: number): {
  text: string;
  variant: "default" | "warning" | "error";
} {
  if (charCount === 0) {
    return {
      text: "Description is required for keyword suggestions.",
      variant: "default",
    };
  }

  if (charCount < MIN_CHARS) {
    return {
      text: "Describe more.",
      variant: "warning",
    };
  }

  if (charCount >= MAX_CHARS) {
    return {
      text: "No more room left.",
      variant: "error",
    };
  }

  return {
    text: "Keywords will be suggested based on this description.",
    variant: "default",
  };
}

/**
 * Character counter component with proper styling
 */
interface CharacterCounterProps {
  current: number;
  max: number;
  className?: string;
}

function CharacterCounter({ current, max, className }: CharacterCounterProps) {
  const isOverLimit = current > max;
  const isNearLimit = current > max * 0.8;

  return (
    <span
      className={cn(
        "font-mono text-sm font-medium tabular-nums",
        isOverLimit
          ? "text-red-500"
          : isNearLimit
            ? "text-primary dark:text-primary"
            : "text-muted-foreground",
        className
      )}
      aria-live="polite"
      aria-label={`${current} of ${max} characters used`}
    >
      {current}/{max}
    </span>
  );
}

export default function OnboardingPage() {
  const router = useRouter();

  const form = useForm<OnboardingFormValues>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      description: "",
    },
    mode: "onChange", // Validate on change for real-time feedback
  });

  // Watch the description field for real-time character counting
  const description = form.watch("description");
  const charCount = description.length;

  // Calculate button state based on character count and form validity
  const isFormValid = form.formState.isValid && charCount >= MIN_CHARS;
  const helpText = getHelpText(charCount);

  /**
   * Form submission handler
   * Stores description in localStorage and navigates to home
   */
  const onSubmit = async (data: OnboardingFormValues) => {
    try {
      // Store the description in localStorage for workspace setup
      const success = storeWorkspaceDescription(data.description);

      if (!success) {
        console.warn("Failed to store workspace description");
        // In a real app, you might want to show a toast notification here
      }

      // Navigate to the main app
      router.push("/");
    } catch (error) {
      console.error("Failed to submit onboarding:", error);
      // In a real app, you might want to show a toast notification here
    }
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {/* Page heading */}
      <h1 className="mb-4 text-center text-2xl font-medium tracking-tight">
        How will you help?
      </h1>

      {/* Main form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="description" className="sr-only">
                  Description
                </FormLabel>
                <FormControl>
                  <Textarea
                    id="description"
                    placeholder="Briefly describe your product, service, or skill..."
                    className={cn(
                      "max-h-fit min-h-[120px] resize-y",
                      // Add error styling when at character limit
                      charCount > MAX_CHARS && "border-destructive"
                    )}
                    {...field}
                    maxLength={MAX_CHARS + 50} // Allow slight overflow for better UX
                    aria-required="true"
                  />
                </FormControl>
                <div
                  className={cn(
                    "text-sm transition-colors",
                    helpText.variant === "error"
                      ? "text-red-500"
                      : helpText.variant === "warning"
                        ? "text-primary dark:text-primary"
                        : "text-muted-foreground"
                  )}
                >
                  {helpText.text}
                </div>
                <div className="flex items-center justify-between">
                  <CharacterCounter current={charCount} max={MAX_CHARS} />
                  <Button
                    type="submit"
                    size="xs"
                    disabled={!isFormValid || form.formState.isSubmitting}
                  >
                    {form.formState.isSubmitting ? "..." : "Continue"}
                  </Button>
                </div>
              </FormItem>
            )}
          />
        </form>
      </Form>
    </div>
  );
}
