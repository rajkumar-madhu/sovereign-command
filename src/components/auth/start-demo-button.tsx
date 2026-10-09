import { useNavigate } from "@tanstack/react-router";
import type { VariantProps } from "class-variance-authority";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { createDemoSession, setSession } from "@/lib/session";
import { cn } from "@/lib/utils";

type StartDemoButtonProps = {
  className?: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
  label?: string;
  showArrow?: boolean;
};

/** Starts a read-only demo session and routes into the command centre. */
export function StartDemoButton({
  className,
  size = "lg",
  variant = "ghost",
  label = "View product demo",
  showArrow = false,
}: StartDemoButtonProps) {
  const navigate = useNavigate();

  function startDemo() {
    setSession(createDemoSession());
    toast.success("Demo session established", {
      description: "Scope: Nordic Federated Bank · production (read-only)",
    });
    void navigate({ to: "/command" });
  }

  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn(className)}
      onClick={startDemo}
    >
      {label}
      {showArrow ? <ArrowRight className="size-4" aria-hidden /> : null}
    </Button>
  );
}
