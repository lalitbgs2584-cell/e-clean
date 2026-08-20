"use client";
import { useEffect } from "react";
import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import AuthorityDashboard from "../authority-dashboard";
import { authClient } from "@/lib/auth-client";
export default function DashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  useEffect(() => {
    if (!isPending && !session) router.replace("/login");
  }, [isPending, router, session]);
  if (isPending || !session)
    return (
      <main className="auth-loading">
        <LoaderCircle size={25} /> Checking secure session…
      </main>
    );
  return <AuthorityDashboard />;
}
