import Link from "next/link";
import { ListForm } from "../list-form";

export const dynamic = "force-dynamic";

export default function NewListPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/lists"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Lists
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-100">New list</h1>
      </div>
      <div className="card p-6">
        <ListForm />
      </div>
    </div>
  );
}
