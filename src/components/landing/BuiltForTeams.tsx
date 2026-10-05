import { RocketIcon, BriefcaseIcon, GitForkIcon } from "lucide-react";

const USE_CASES = [
  {
    icon: RocketIcon,
    title: "Remote-first startups",
    body: "Your team is in four countries and standups keep sliding. Settle the weekly sync once, not every week.",
  },
  {
    icon: BriefcaseIcon,
    title: "Sales & client calls",
    body: "Stop emailing back and forth with a prospect across the ocean. Send a link, get a time that works for both of you.",
  },
  {
    icon: GitForkIcon,
    title: "Open source & communities",
    body: "Coordinate a maintainer call or community meetup across contributors who are never all awake at once.",
  },
];

export function BuiltForTeams() {
  return (
    <section className="border-t bg-muted/30">
      <div className="mx-auto w-full max-w-5xl px-6 py-24">
        <div className="mb-12 flex flex-col gap-2 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">
            Built for scattered teams
          </h2>
          <p className="text-muted-foreground">
            Anywhere &ldquo;what time works for you?&rdquo; turns into five replies and no
            answer.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {USE_CASES.map((useCase) => (
            <div
              key={useCase.title}
              className="flex flex-col gap-3 rounded-2xl border bg-card p-6 transition-shadow hover:shadow-md"
            >
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <useCase.icon className="size-5" />
              </div>
              <h3 className="font-heading font-medium">{useCase.title}</h3>
              <p className="text-sm text-muted-foreground">{useCase.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
