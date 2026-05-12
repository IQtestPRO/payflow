import Link from "next/link";
import { AuthForm } from "@/components/layout/auth-form";

export default function RegisterPage() {
  return (
    <>
      <AuthForm mode="register" />
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link className="font-semibold text-primary underline-offset-4 hover:underline" href="/login">
          Entrar
        </Link>
      </p>
    </>
  );
}
