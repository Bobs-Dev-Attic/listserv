import { redirect } from "next/navigation";

// Signup and login are the same passwordless flow now (email 6-digit code).
export default function SignupPage() {
  redirect("/login");
}
