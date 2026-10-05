import { z } from "zod";
import { isValidTimeZone } from "./timezone";

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date");

const httpUrl = z
  .string()
  .trim()
  .max(2000)
  .refine(
    (value) => {
      try {
        const url = new URL(value);
        return url.protocol === "http:" || url.protocol === "https:";
      } catch {
        return false;
      }
    },
    { message: "Please enter a valid http:// or https:// URL." },
  );

const timezoneString = z
  .string()
  .refine(isValidTimeZone, { message: "Unrecognized time zone." });

export const slotMinutesSchema = z.union([
  z.literal(15),
  z.literal(30),
  z.literal(60),
]);

const isoInstant = z.iso.datetime({ offset: true });

const passwordSchema = z
  .string()
  .trim()
  .min(4, "Password must be at least 4 characters.")
  .max(200);

export const createPollSchema = z.object({
  title: z.string().trim().min(1, "Please enter a title.").max(200),
  description: z.string().trim().max(2000).optional(),
  location: z.string().trim().max(500).optional(),
  meetingUrl: httpUrl.optional(),
  hostName: z.string().trim().min(1, "Please enter your name.").max(100),
  hostTimezone: timezoneString,
  windowDates: z
    .array(dateString)
    .min(1, "Select at least one date.")
    .max(62, "That's a lot of dates — please narrow it down a bit."),
  windowStartMinute: z.number().int().min(0).max(1425),
  windowEndMinute: z.number().int().min(15).max(1440),
  slotMinutes: slotMinutesSchema,
  hostAvailability: z.array(isoInstant).max(10000),
  viewPassword: passwordSchema.optional(),
  hostPassword: passwordSchema.optional(),
}).refine((data) => data.windowEndMinute > data.windowStartMinute, {
  message: "End time must be after start time.",
  path: ["windowEndMinute"],
});

export const updatePollSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).nullable().optional(),
    location: z.string().trim().max(500).nullable().optional(),
    meetingUrl: httpUrl.nullable().optional(),
    windowDates: z.array(dateString).min(1).max(62).optional(),
    windowStartMinute: z.number().int().min(0).max(1425).optional(),
    windowEndMinute: z.number().int().min(15).max(1440).optional(),
    // Absent = unchanged, null = remove the password, string = set a new one.
    viewPassword: passwordSchema.nullable().optional(),
    hostPassword: passwordSchema.nullable().optional(),
  })
  .refine(
    (data) =>
      data.windowStartMinute === undefined ||
      data.windowEndMinute === undefined ||
      data.windowEndMinute > data.windowStartMinute,
    { message: "End time must be after start time.", path: ["windowEndMinute"] },
  );

export const verifyPasswordSchema = z.object({
  password: z.string().min(1).max(200),
});

export const finalizePollSchema = z
  .object({
    startAt: isoInstant,
    endAt: isoInstant,
  })
  .refine((data) => new Date(data.endAt) > new Date(data.startAt), {
    message: "End time must be after start time.",
    path: ["endAt"],
  });

export type CreatePollInput = z.infer<typeof createPollSchema>;
export type UpdatePollInput = z.infer<typeof updatePollSchema>;
