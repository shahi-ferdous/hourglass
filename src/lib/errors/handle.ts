import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { ApiError } from "./api-error";

/**
 * Wraps a Route Handler so every thrown error becomes a consistent, friendly
 * JSON error response instead of leaking a stack trace or a raw
 * "Database constraint violation"-style message to the client.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>,
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      if (err instanceof ApiError) {
        return NextResponse.json(
          { error: { code: err.code, message: err.message } },
          { status: err.status },
        );
      }
      if (err instanceof ZodError) {
        return NextResponse.json(
          {
            error: {
              code: "invalid_input",
              message: "Please check the information you entered and try again.",
              fields: err.issues.map((issue) => ({
                path: issue.path.join("."),
                message: issue.message,
              })),
            },
          },
          { status: 400 },
        );
      }
      console.error("Unhandled API error:", err);
      return NextResponse.json(
        {
          error: {
            code: "internal_error",
            message: "Something went wrong on our end. Please try again.",
          },
        },
        { status: 500 },
      );
    }
  };
}
