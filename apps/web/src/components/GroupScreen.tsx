"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/AppStore";
import { GroupView } from "./GroupView";
import { Skeleton } from "./Skeleton";
import { button } from "./ui";

/**
 * Finds the group in this browser's saved data and shows it.
 * Groups live in the browser, so the server can't know the name: the tab title is set here instead of in metadata.
 */
export function GroupScreen({ id }: { id: string }) {
  const { app, loaded } = useAppStore();
  if (!loaded) {
    return (
      <>
        <title>Splitly</title>
        <Skeleton />
      </>
    );
  }

  const group = app.groups.find((g) => g.id === id);
  if (!group) {
    return (
      <div className="pt-16 pb-10 text-center">
        <title>Group not found · Splitly</title>
        <h1 className="font-display text-3xl font-semibold">Group not found</h1>
        <p className="mt-2 text-muted">It may have been deleted, or it was created in a different browser.</p>
        <Link href="/" className={`${button.secondary} mt-6`}>
          Back to your groups
        </Link>
      </div>
    );
  }
  return <GroupView group={group} />;
}
