import type { Metadata } from "next";
import { getPollOrThrow } from "@/lib/db/polls";
import { PollView } from "./PollView";

interface PageProps {
  params: Promise<{ pollId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { pollId } = await params;
  try {
    const poll = await getPollOrThrow(pollId);
    return { title: `${poll.title} — Hourglass` };
  } catch {
    return { title: "Hourglass" };
  }
}

export default async function PollPage({ params }: PageProps) {
  const { pollId } = await params;
  return <PollView pollId={pollId} />;
}
