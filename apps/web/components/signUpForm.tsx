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
import { ViewButton } from "./buttonView";
import { useState } from "react";
import { SubmitButton } from "./buttonSubmit";

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const [visiblePassword, setVisiblePassword] = useState(false);
  const [visibleConfirmPassword, setVisibleConfirmPassword] = useState(false);

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Crie sua conta</h1>
        </div>
        <Field>
          <FieldLabel htmlFor="name">Nome Completo</FieldLabel>
          <Input
            id="name"
            type="text"
            placeholder="Seu nome completo"
            required
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" type="email" placeholder="m@example.com" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="taxId">CPF</FieldLabel>
          <Input id="taxId" type="text" placeholder="000.000.000-00" required />
        </Field>

        <Field>
          <div className="flex items-center relative">
            <FieldLabel htmlFor="password">Senha</FieldLabel>
            <ViewButton onToggle={setVisiblePassword} className="absolute top-7.5 right-4"/>
          </div>
          <Input id="password" type={visiblePassword ? "text" : "password"} required />
        </Field>
        <Field>
          <div className="flex items-center relative">
            <FieldLabel htmlFor="confirmPassword">Confirme a Senha</FieldLabel>
            <ViewButton onToggle={setVisibleConfirmPassword} className="absolute top-7.5 right-4"/>
          </div>
          <Input id="confirmPassword" type={visibleConfirmPassword ? "text" : "password"} required />
        </Field>
        <Field>
          <SubmitButton>Criar Conta</SubmitButton>
        </Field>
        <Field>
          <FieldDescription className="text-center">
            Já tem uma conta?{" "}
            <a href="/auth/login" className="underline underline-offset-4">
              Login
            </a>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
}
