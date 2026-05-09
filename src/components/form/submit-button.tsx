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
    "border-transparent bg-[var(--accent-strong)] text-white shadow-[0_12px_28px_rgba(47,111,237,0.18)] hover:-translate-y-0.5 hover:shadow-[0_16px_34px_rgba(47,111,237,0.2)]",
  secondary:
    "border-[var(--panel-border)] bg-white text-[var(--text-primary)] hover:-translate-y-0.5 hover:border-[var(--accent)] hover:text-[var(--accent-strong)] hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)]",
  danger:
    "border-transparent bg-[#b93b2e] text-white shadow-[0_12px_28px_rgba(185,59,46,0.16)] hover:-translate-y-0.5 hover:bg-[#a23228]",
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
      className={`inline-flex items-center justify-center rounded-2xl border px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${toneClasses[tone]} ${className}`.trim()}
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
