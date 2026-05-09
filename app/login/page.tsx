import { LoginForm } from "./LoginForm";

export const metadata = { title: "Login — JBS Access" };

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <LoginForm />
    </div>
  );
}
