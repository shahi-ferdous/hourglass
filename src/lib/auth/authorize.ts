import "server-only";
import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { participants, type Participant, type Poll } from "@/db/schema";
import {
  readBearerToken,
  hasViewSession,
  hasHostPasswordSession,
} from "@/lib/auth/cookies";
import { hashBearerToken } from "@/lib/auth/tokens";
import { forbiddenError, unauthorizedError } from "@/lib/errors/api-error";

/**
 * Resolves the participant (host or not) identified by the bearer-token
 * cookie for this poll, if any. A leaked/expired/foreign token simply
 * resolves to null — callers decide whether that's fatal.
 */
export async function resolveParticipant(
  req: NextRequest,
  pollId: string,
): Promise<Participant | null> {
  const rawToken = readBearerToken(req, pollId);
  if (!rawToken) return null;

  const hash = hashBearerToken(rawToken);
  const [row] = await db
    .select()
    .from(participants)
    .where(
      and(eq(participants.pollId, pollId), eq(participants.accessTokenHash, hash)),
    )
    .limit(1);

  return row ?? null;
}

export async function requireParticipant(
  req: NextRequest,
  pollId: string,
): Promise<Participant> {
  const participant = await resolveParticipant(req, pollId);
  if (!participant) {
    throw unauthorizedError();
  }
  return participant;
}

async function findHostParticipant(pollId: string): Promise<Participant | null> {
  const [row] = await db
    .select()
    .from(participants)
    .where(and(eq(participants.pollId, pollId), eq(participants.isHost, true)))
    .limit(1);
  return row ?? null;
}

/**
 * Host access via EITHER the bearer token (the normal path) OR a verified
 * host-password session — the latter exists specifically so a host who
 * lost their manage link/cookie (different browser, cleared cookies) isn't
 * permanently locked out as long as they set a host password and still
 * remember it. Both paths are equivalent once granted; callers never need
 * to know which one a given request used.
 */
export async function requireHost(
  req: NextRequest,
  pollId: string,
): Promise<Participant> {
  const participant = await resolveParticipant(req, pollId);
  if (participant?.isHost) return participant;

  if (hasHostPasswordSession(req, pollId)) {
    const host = await findHostParticipant(pollId);
    if (host) return host;
  }

  throw participant ? forbiddenError("Only the poll host can do that.") : unauthorizedError();
}

/**
 * The `host+pw` tier — required only for the one genuinely destructive
 * action (deleting a poll). Routine host management only ever requires
 * `requireHost`, so forgetting the host password can never lock a host out
 * of managing their own poll — at worst they can't delete it until they
 * recall the password or remove it (which itself only needs `requireHost`).
 * (If they got here via the password-session path above, this check is
 * already satisfied — the same session both authenticates and elevates.)
 */
export async function requireHostWithPassword(
  req: NextRequest,
  pollId: string,
  poll: Pick<Poll, "hostPasswordHash">,
): Promise<Participant> {
  const host = await requireHost(req, pollId);
  if (poll.hostPasswordHash && !hasHostPasswordSession(req, pollId)) {
    throw unauthorizedError(
      "Please confirm the host password to do that.",
    );
  }
  return host;
}

/** Whether this poll's optional view-password gate has been satisfied. */
export async function hasViewAccess(
  req: NextRequest,
  pollId: string,
  poll: Pick<Poll, "viewPasswordHash">,
): Promise<boolean> {
  if (!poll.viewPasswordHash) return true;
  if (hasViewSession(req, pollId)) return true;
  // A returning participant/host who already has a bearer-token cookie
  // proved they passed the gate when they first joined — don't make them
  // re-enter the password every visit.
  const participant = await resolveParticipant(req, pollId);
  return participant !== null;
}

export async function requireViewAccess(
  req: NextRequest,
  pollId: string,
  poll: Pick<Poll, "viewPasswordHash">,
): Promise<void> {
  if (!(await hasViewAccess(req, pollId, poll))) {
    throw unauthorizedError(
      "This poll is password-protected. Please enter the password to continue.",
    );
  }
}
