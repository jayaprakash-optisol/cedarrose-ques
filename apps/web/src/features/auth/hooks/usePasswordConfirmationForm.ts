import { useState } from "react";

function scheduleShakeReset(setShake: (value: boolean) => void) {
  setShake(true);
  setTimeout(() => setShake(false), 350);
}

interface UsePasswordConfirmationFormOptions {
  readonly onSubmit: (password: string) => Promise<void>;
  readonly fallbackErrorMessage: string;
  readonly isApiError: (err: unknown) => boolean;
  readonly getErrorMessage: (err: unknown) => string;
}

export function usePasswordConfirmationForm({
  onSubmit,
  fallbackErrorMessage,
  isApiError,
  getErrorMessage,
}: UsePasswordConfirmationFormOptions) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  async function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      scheduleShakeReset(setShake);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      scheduleShakeReset(setShake);
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(password);
    } catch (err) {
      setError(isApiError(err) ? getErrorMessage(err) : fallbackErrorMessage);
      scheduleShakeReset(setShake);
    } finally {
      setSubmitting(false);
    }
  }

  return {
    password,
    setPassword,
    confirmPassword,
    setConfirmPassword,
    submitting,
    error,
    shake,
    handleSubmit,
  };
}
