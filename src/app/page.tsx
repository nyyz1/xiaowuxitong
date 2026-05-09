import { redirect } from "next/navigation";
import { getBrowserBoundServerSession } from "@/lib/auth";

export default async function Home() {
  const { session } = await getBrowserBoundServerSession();
  redirect(session ? "/dashboard" : "/login");
}
