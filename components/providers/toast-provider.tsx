"use client";

import { Toaster } from "sonner";

export function ToastProvider() {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          background: '#1c1d21',
          border: '1px solid #2e2f37',
          color: '#e6e6e7',
        },
        className: 'sonner-toast',
      }}
      theme="dark"
    />
  );
}
