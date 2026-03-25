import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <SignIn
        appearance={{
          variables: {
            colorPrimary: "#2563EB",
            colorText: "#111111",
            colorTextSecondary: "#6B7280",
            colorBackground: "#FFFFFF",
            borderRadius: "8px",
            fontFamily: "Inter, sans-serif",
          },
        }}
      />
    </div>
  );
}
