import Link from "next/link";
import { ListForm } from "../list-form";

export const dynamic = "force-dynamic";

export default function NewListPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/dashboard/lists"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Lists
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">New list</h1>
      </div>
      <div className="card p-6">
        <ListForm />
      </div>
    </div>
  );
}
