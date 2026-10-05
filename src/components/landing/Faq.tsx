import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  {
    q: "Do people need an account to respond?",
    a: "No. Anyone with the link can open it, enter their name, mark their availability, and submit — no sign-up for them, ever.",
  },
  {
    q: "Do I need an account to create a meeting poll?",
    a: "No. You get a private link right after creating the poll that lets you manage it — review responses, edit details, and finalize a time. Save that link; there's no account to log back in with.",
  },
  {
    q: "How does the time zone conversion work?",
    a: "Every time is stored and compared in UTC under the hood. Each person sees times converted to their own browser's time zone automatically, with an option to switch and view in anyone else's zone.",
  },
  {
    q: "Can I keep a poll private?",
    a: "Yes. You can optionally require a password just to view or respond to a poll, and a separate password for extra protection on destructive host actions like deleting it.",
  },
  {
    q: "What happens after I pick a final time?",
    a: "The poll shows the confirmed time and your meeting link to everyone who visits it. You can still close the poll to stop new responses, or reopen it if plans change.",
  },
  {
    q: "What if I lose my manage link?",
    a: "There's currently no account-based recovery for it, so it's worth saving somewhere durable once you get it. This keeps the whole product account-free and frictionless for everyone you invite.",
  },
];

export function Faq() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-24">
      <div className="mb-12 flex flex-col gap-2 text-center">
        <h2 className="text-3xl font-semibold tracking-tight">
          Frequently asked questions
        </h2>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {FAQS.map((item, i) => (
          <AccordionItem key={item.q} value={`item-${i}`}>
            <AccordionTrigger className="font-heading text-left">
              {item.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {item.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
