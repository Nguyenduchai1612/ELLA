"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/state";
import { Field, Input } from "@/components/forms/FormFields";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

interface FormState {
  fullName: string;
  phone: string;
  email: string;
  password: string;
}

export default function RegisterPage() {
  usePageTitle("Đăng ký");
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState<FormState>({ fullName: "", phone: "", email: "", password: "" });
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: Partial<Record<keyof FormState, string>> = {};
    if (!form.fullName.trim()) nextErrors.fullName = "Vui lòng nhập họ tên.";
    if (!/^0\d{9,10}$/.test(form.phone.trim())) nextErrors.phone = "Số điện thoại không hợp lệ.";
    if (form.password.length < 6) nextErrors.password = "Mật khẩu cần ít nhất 6 ký tự.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await register({
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        password: form.password,
      });
      router.push("/account");
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container-ella flex max-w-md flex-col py-16">
      <h1 className="font-serif text-2xl text-neutral-900">Đăng ký</h1>
      <p className="mt-1 text-sm text-neutral-500">Tạo tài khoản để theo dõi đơn hàng dễ dàng hơn.</p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <Field label="Họ và tên" htmlFor="fullName" required error={errors.fullName}>
          <Input
            id="fullName"
            value={form.fullName}
            hasError={Boolean(errors.fullName)}
            onChange={(e) => set("fullName", e.target.value)}
            autoComplete="name"
          />
        </Field>
        <Field label="Số điện thoại" htmlFor="phone" required error={errors.phone}>
          <Input
            id="phone"
            value={form.phone}
            hasError={Boolean(errors.phone)}
            onChange={(e) => set("phone", e.target.value)}
            autoComplete="tel"
          />
        </Field>
        <Field label="Email" htmlFor="email" hint="Không bắt buộc">
          <Input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
            autoComplete="email"
          />
        </Field>
        <Field label="Mật khẩu" htmlFor="password" required error={errors.password}>
          <Input
            id="password"
            type="password"
            value={form.password}
            hasError={Boolean(errors.password)}
            onChange={(e) => set("password", e.target.value)}
            autoComplete="new-password"
          />
        </Field>

        {submitError && <p className="text-sm text-error-500">{submitError}</p>}

        <Button type="submit" size="lg" isLoading={isSubmitting} disabled={isSubmitting}>
          Tạo tài khoản
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Đã có tài khoản?{" "}
        <Link href="/login" className="font-medium text-neutral-900 underline underline-offset-2">
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
