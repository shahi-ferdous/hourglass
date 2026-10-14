import { z } from "zod";
import { isValidTimeZone } from "./timezone";

const timezone = z.string().refine(isValidTimeZone, { message: "Unrecognized time zone." });

const isoInstant = z.iso.datetime({ offset: true });

export const submitParticipantSchema = z.object({
  displayName: z.string().trim().min(1, "Please enter your name.").max(100),
  slots: z.array(isoInstant).max(10000),
  /** The respondent's own IANA time zone, used to list attendees' local times. */
  timezone: timezone.optional(),
});

export const updateParticipantSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  slots: z.array(isoInstant).max(10000).optional(),
  timezone: timezone.optional(),
});

export type SubmitParticipantInput = z.infer<typeof submitParticipantSchema>;
