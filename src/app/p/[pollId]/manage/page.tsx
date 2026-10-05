import type { Metadata } from "next";
import { getPollOrThrow } from "@/lib/db/polls";
import { ManageView } from "./ManageView";

interface PageProps {
  params: Promise<{ pollId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pollId } = await params;
  try {
    const poll = await getPollOrThrow(pollId);
    return { title: `Manage: ${poll.title} — Hourglass` };
  } catch {
    return { title: "Hourglass" };
  }
}

export default async function ManagePage({ params }: PageProps) {
  const { pollId } = await params;
  return <ManageView pollId={pollId} />;
}
