import { SignupForm } from "./SignupForm";

export const metadata = { title: "Sign Up — JBS Access" };

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <SignupForm />
    </div>
  );
}
