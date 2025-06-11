// shared/ui/components/FormSection.tsx
import { cn } from "@/shared/lib/utils/utils";
import { Separator } from "@/shared/ui/components/Separator";

interface FormSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  showSeparator?: boolean;
}

export function FormSection({
  title,
  description,
  children,
  className,
  showSeparator = true,
}: FormSectionProps) {
  return (
    <>
      <div className={cn("space-y-4", className)}>
        <div className="space-y-2">
          <h3 className="text-sm font-medium">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">↳ {description}</p>
          )}
        </div>
        <div className="space-y-3">{children}</div>
      </div>
      {showSeparator && <Separator />}
    </>
  );
}
