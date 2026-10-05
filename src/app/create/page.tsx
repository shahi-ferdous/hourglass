import type { Metadata } from "next";
import { CreatePollWizard } from "./CreatePollWizard";

export const metadata: Metadata = {
  title: "Create a poll — Hourglass",
};

export default function CreatePollPage() {
  return <CreatePollWizard />;
}
