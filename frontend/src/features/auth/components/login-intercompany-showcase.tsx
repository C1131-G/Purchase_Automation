import {
  ArrowLeft,
  ArrowRight,
  Building2,
  FileCheck2,
  FileQuestion,
  FileText,
  ReceiptText,
  ShoppingCart,
  Waypoints,
} from "lucide-react";

import "./login-intercompany-showcase.css";

const INTERCOMPANY_JOURNEY = [
  {
    animationClass: "login-flow-packet--first",
    description: "Company A Purchase Quotation creates a Request for Quotation for Company B.",
    direction: "right",
    leftIcon: FileText,
    leftLabel: "Purchase Quotation",
    rightIcon: FileQuestion,
    rightLabel: "Request for Quotation",
  },
  {
    animationClass: "login-flow-packet--second",
    description: "Company B Sales Quotation updates the Purchase Quotation in Company A.",
    direction: "left",
    leftIcon: FileCheck2,
    leftLabel: "Updated Quotation",
    rightIcon: FileText,
    rightLabel: "Sales Quotation",
  },
  {
    animationClass: "login-flow-packet--third",
    description: "Company A Purchase Order creates an A/R Invoice Draft for Company B.",
    direction: "right",
    leftIcon: ShoppingCart,
    leftLabel: "Purchase Order",
    rightIcon: ReceiptText,
    rightLabel: "A/R Invoice Draft",
  },
];

export function LoginIntercompanyShowcase() {
  return (
    <section
      aria-labelledby="login-showcase-heading"
      className="relative hidden h-svh w-[55%] flex-col justify-between overflow-hidden border-r border-surface/10 bg-ink-950 p-8 lg:flex xl:p-10"
    >
      <div
        aria-hidden
        className="absolute -left-24 -top-24 size-96 rounded-full bg-teal-500/15 opacity-40 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute bottom-0 right-0 size-80 translate-x-1/4 translate-y-1/4 rounded-full bg-teal-700/15 opacity-35 blur-3xl"
      />

      <header className="relative z-10 flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border border-surface/10 bg-teal-500 text-surface shadow-lg shadow-teal-600/20">
          <Waypoints className="size-6" aria-hidden />
        </div>
        <div>
          <p className="text-xs font-semibold tracking-[0.16em] text-teal-200 uppercase">
            Vedhasoft
          </p>
          <p id="login-showcase-heading" className="text-xl font-bold tracking-tight text-surface">
            Purchase Automation
          </p>
        </div>
      </header>

      <figure className="relative z-10 my-5 w-full max-w-2xl xl:my-6">
        <figcaption className="sr-only">
          One intercompany purchasing journey from quotation to invoice draft.
        </figcaption>

        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] items-center gap-3">
          <p className="flex items-center gap-2 text-xs font-semibold tracking-[0.12em] text-teal-200 uppercase">
            <Building2 className="size-4" aria-hidden />
            Company A
          </p>
          <span aria-hidden />
          <p className="flex items-center justify-end gap-2 text-right text-xs font-semibold tracking-[0.12em] text-teal-200 uppercase">
            Company B
            <Building2 className="size-4" aria-hidden />
          </p>
        </div>

        <ol
          className="relative space-y-3 before:absolute before:bottom-11 before:left-1/2 before:top-11 before:w-px before:-translate-x-1/2 before:bg-teal-200/15"
          role="list"
        >
          {INTERCOMPANY_JOURNEY.map((stage) => {
            const LeftIcon = stage.leftIcon;
            const RightIcon = stage.rightIcon;
            const movesRight = stage.direction === "right";

            return (
              <li key={stage.description} className="relative">
                <span className="sr-only">{stage.description}</span>
                <div
                  className="grid grid-cols-[minmax(0,1fr)_7rem_minmax(0,1fr)] items-stretch gap-3"
                  aria-hidden
                >
                  <div className="flex min-h-18 items-center gap-3 rounded-2xl border border-surface/10 bg-surface/6 p-3.5">
                    <LeftIcon className="size-5 shrink-0 text-teal-200" />
                    <span className="text-sm font-semibold leading-5 text-surface">
                      {stage.leftLabel}
                    </span>
                  </div>

                  <div className="relative flex items-center justify-center">
                    <span className="h-px w-full bg-teal-200/25" />
                    <span className="absolute flex size-8 items-center justify-center rounded-full border border-teal-200/25 bg-ink-900 text-teal-200">
                      {movesRight ? (
                        <ArrowRight className="size-3.5" />
                      ) : (
                        <ArrowLeft className="size-3.5" />
                      )}
                    </span>
                    <span
                      className={`login-flow-packet ${stage.animationClass} absolute flex size-7 items-center justify-center rounded-md border border-teal-100/30 bg-teal-500 text-surface shadow-lg shadow-ink-950/30`}
                    >
                      <FileText className="size-3.5" />
                    </span>
                  </div>

                  <div className="flex min-h-18 items-center gap-3 rounded-2xl border border-teal-200/20 bg-teal-900/55 p-3.5">
                    <RightIcon className="size-5 shrink-0 text-teal-200" />
                    <span className="text-sm font-semibold leading-5 text-surface">
                      {stage.rightLabel}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </figure>

      <footer className="relative z-10 text-xs font-medium text-teal-100/70">
        © {new Date().getFullYear()} Vedhasoft
      </footer>
    </section>
  );
}
