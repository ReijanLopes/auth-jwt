"use client";

import { useFormStatus } from "react-dom";
import { type ComponentProps } from "react";
import Loading from "@/components/loading";
import { Button } from "./ui/button";

type Props = ComponentProps<"button"> & {
  isPending?: boolean;
};

export function SubmitButton({
  children,
  className,
  ...props
}: Props) {
  const { pending, action } = useFormStatus();
  const isPending = pending && action === props.formAction;

  return (
    <Button
      {...props}
      type="submit"
      className={`${className} bg-linear-to-r from-[#120D94] to-[#1E13EE] text-white font-bold ${
        isPending && "!flex !items-center !justify-center cursor-progress "
      }`}
      aria-disabled={pending}
      disabled={isPending}
    >
      {isPending ? <Loading /> : children}
    </Button>
  );
}