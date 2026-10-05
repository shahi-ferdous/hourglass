import { z } from "zod";

const isoInstant = z.iso.datetime({ offset: true });

export const submitParticipantSchema = z.object({
  displayName: z.string().trim().min(1, "Please enter your name.").max(100),
  slots: z.array(isoInstant).max(10000),
});

export const updateParticipantSchema = z.object({
  displayName: z.string().trim().min(1).max(100).optional(),
  slots: z.array(isoInstant).max(10000).optional(),
});

export type SubmitParticipantInput = z.infer<typeof submitParticipantSchema>;
