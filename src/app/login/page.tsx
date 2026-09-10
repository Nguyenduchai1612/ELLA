"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/state";
import { Field, Input } from "@/components/forms/FormFields";
import { Button } from "@/components/ui/Button";
import { getErrorMessage } from "@/lib/errors";
import { usePageTitle } from "@/lib/hooks/usePageTitle";

export default function LoginPage() {
  usePageTitle("Đăng nhập");
  const router = useRouter();
  const { login } = useAuth();
  const [phoneOrEmail, setPhoneOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ phoneOrEmail?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const nextErrors: typeof errors = {};
    if (!phoneOrEmail.trim()) nextErrors.phoneOrEmail = "Vui lòng nhập số điện thoại hoặc email.";
    if (!password) nextErrors.password = "Vui lòng nhập mật khẩu.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await login(phoneOrEmail.trim(), password);
      router.push("/account");
    } catch (err) {
      setSubmitError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="container-ella flex max-w-md flex-col py-16">
      <h1 className="font-serif text-2xl text-neutral-900">Đăng nhập</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Đăng nhập không bắt buộc để mua hàng — bạn vẫn có thể thanh toán với tư cách khách.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4" noValidate>
        <Field label="Số điện thoại hoặc email" htmlFor="phoneOrEmail" required error={errors.phoneOrEmail}>
          <Input
            id="phoneOrEmail"
            value={phoneOrEmail}
            hasError={Boolean(errors.phoneOrEmail)}
            onChange={(e) => setPhoneOrEmail(e.target.value)}
            autoComplete="username"
          />
        </Field>
        <Field label="Mật khẩu" htmlFor="password" required error={errors.password}>
          <Input
            id="password"
            type="password"
            value={password}
            hasError={Boolean(errors.password)}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </Field>

        {submitError && <p className="text-sm text-error-500">{submitError}</p>}

        <Button type="submit" size="lg" isLoading={isSubmitting} disabled={isSubmitting}>
          Đăng nhập
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-neutral-500">
        Chưa có tài khoản?{" "}
        <Link href="/register" className="font-medium text-neutral-900 underline underline-offset-2">
          Đăng ký
        </Link>
      </p>
    </div>
  );
}
