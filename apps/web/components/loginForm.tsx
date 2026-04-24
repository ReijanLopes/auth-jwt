"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { use, useState } from "react";
import { Eye } from "lucide-react";
import { ViewButton } from "./buttonView";
import { SubmitButton } from "./buttonSubmit";

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [visible, setVisible] = useState(false);

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Faça login na sua conta</h1>
        </div>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <div className="flex items-center relative">
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <ViewButton onToggle={setVisible} className="absolute top-7.5 right-4"/>
          </div>
          <Input id="password" type={visible ? "text" : "password"} required />
        </Field>
        <Field>
          <SubmitButton>Entrar</SubmitButton>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Não tem uma conta?{" "}
            <a href="/auth/signup" className="underline underline-offset-4">
              Sign up
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
