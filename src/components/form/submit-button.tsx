"use client";

import type { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  idleLabel: string;
  pendingLabel?: string;
  confirmMessage?: string;
  tone?: "primary" | "secondary" | "danger";
};

const toneClasses: Record<NonNullable<SubmitButtonProps["tone"]>, string> = {
  primary:
    "border-transparent bg-[var(--accent-strong)] text-white shadow-[0_16px_40px_rgba(31,122,140,0.18)]",
  secondary:
    "border-[var(--panel-border)] bg-white text-[var(--text-primary)]",
  danger: "border-transparent bg-[#c2410c] text-white",
};

export function SubmitButton({
  idleLabel,
  pendingLabel,
  confirmMessage,
  tone = "primary",
  className = "",
  disabled,
  onClick,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${toneClasses[tone]} ${className}`.trim()}
      onClick={(event) => {
        if (confirmMessage && !window.confirm(confirmMessage)) {
          event.preventDefault();
          return;
        }

        onClick?.(event);
      }}
      {...props}
    >
      {pending ? pendingLabel ?? "提交中..." : idleLabel}
    </button>
  );
}
