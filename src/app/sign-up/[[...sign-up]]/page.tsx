import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <SignUp
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
