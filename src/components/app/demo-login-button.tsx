import { MonitorPlay } from "lucide-react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { Button, type ButtonProps } from "@/components/ui/button";
import { demoLoginAction } from "@/features/auth/actions";
import { demoDoctorEmail } from "@/lib/server/demo";

/**
 * Renders only when demo login is enabled at RUNTIME (env read per request,
 * so the same Docker image can run as demo or real pilot). Wrap in <Suspense>.
 */
export async function DemoLoginButton({ label, variant = "secondary", size = "lg", className }: { label: "landing.ctaDemo" | "auth.demoButton"; variant?: ButtonProps["variant"]; size?: ButtonProps["size"]; className?: string }) {
  await connection();
  if (!demoDoctorEmail()) return null;
  const t = await getTranslations();
  return (
    <form action={demoLoginAction} className={className}>
      <Button type="submit" variant={variant} size={size} className="w-full">
        <MonitorPlay /> {t(label)}
      </Button>
    </form>
  );
}
