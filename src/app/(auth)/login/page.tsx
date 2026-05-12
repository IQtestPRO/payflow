import Link from "next/link";
import { AuthForm } from "@/components/layout/auth-form";

export default function LoginPage() {
  return (
    <>
      <AuthForm mode="login" />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Ainda não tem workspace?{" "}
        <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/register">
          Cadastre-se
        </Link>
      </p>
    </>
  );
}
