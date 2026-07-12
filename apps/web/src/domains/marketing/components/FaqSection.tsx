import { useState } from 'react';
import { CircleHelp, ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'What is NeuralDocx?',
    answer:
      'NeuralDocx is a done-for-you AI compliance documentation service. We create audit-ready documents for your AI systems so you do not have to.',
  },
  {
    question: 'What exactly do you deliver?',
    answer:
      'We deliver complete compliance documentation, including AI system descriptions, risk classification, data governance documentation, model transparency and explainability reports, risk and mitigation analysis, and audit-ready compliance reports.',
  },
  {
    question: 'Who is this service for?',
    answer:
      'It is built for startups building AI products, SaaS companies using AI features, fintech and healthtech teams, companies preparing for EU AI Act compliance, and teams needing documentation for investors, audits, or regulators.',
  },
  {
    question: "Why shouldn't we do this ourselves?",
    answer:
      'You can, but it typically takes weeks of research, legal and technical alignment, and compliance expertise. We compress that into 24 to 72 hours with structured, high-quality output.',
  },
  {
    question: 'How fast can we get our documentation?',
    answer:
      'Basic package: 24 hours. Standard package: 48 hours. Advanced package: 72 hours.',
  },
  {
    question: 'What do you need from us to start?',
    answer:
      'Just a short description of your AI system, what data you use, and your use case or product flow. We handle the rest.',
  },
  {
    question: 'Is this compliant with the EU AI Act?',
    answer:
      'Yes. We structure documentation based on EU AI Act requirements and best practices so your records are audit-ready.',
  },
  {
    question: 'Will this help with investors or partnerships?',
    answer:
      'Yes. Clean, structured compliance documentation builds trust, speeds up due diligence, and shows the maturity of your AI system.',
  },
  {
    question: 'Do you offer revisions?',
    answer:
      'Yes. We include revision rounds to refine the documentation based on your feedback.',
  },
  {
    question: 'Can you handle urgent requests?',
    answer:
      'Yes. We offer priority delivery within 24 hours for urgent compliance needs.',
  },
  {
    question: 'How much does it cost?',
    answer:
      'Typical ranges: Starter: EUR99 - EUR199. Standard: EUR299 - EUR599. Advanced: EUR999+. Custom pricing depends on complexity.',
  },
  {
    question: 'Is this a one-time service or ongoing?',
    answer:
      'Both. We offer one-time documentation delivery and ongoing compliance monitoring as an optional upgrade.',
  },
  {
    question: 'What makes NeuralDocx different?',
    answer:
      'NeuralDocx combines AI automation with real compliance structure. It is built for speed, clarity, and audit-readiness, and it is tailored to your actual system instead of relying on generic templates.',
  },
  {
    question: 'What happens after delivery?',
    answer:
      'You receive structured documents in PDF or Docx format, ready for audits, internal use, or regulators, with optional support for updates or extensions.',
  },
  {
    question: 'How do we get started?',
    answer:
      "Send us your AI product description. We'll respond quickly and start immediately.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [showAll, setShowAll] = useState(false);
  const visibleItems = showAll ? FAQ_ITEMS : FAQ_ITEMS.slice(0, 5);

  return (
    <section
      data-nav-theme="light"
      className="relative overflow-hidden bg-[#f6f7fb] px-5 py-28 sm:px-8 lg:px-10"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.14),_transparent_34%)]" />
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-[0_18px_40px_-28px_rgba(15,23,42,0.14)]">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-cyan-400/15 text-cyan-600">
              <CircleHelp className="h-3.5 w-3.5" />
            </span>
            <span>Common questions</span>
          </div>
          <h2 className="animate-enter-up mt-5 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl md:text-6xl">
            Answers before your team commits time
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-8 text-slate-600">
            The service is built to remove ambiguity around scope, turnaround,
            and what you actually receive at the end of the engagement.
          </p>
        </div>

        <div className="mt-16 space-y-3">
          {visibleItems.map((item, index) => {
            const isOpen = openIndex === index;

            return (
              <div
                key={item.question}
                className="rounded-[1.6rem] border border-slate-200 bg-white/95 shadow-[0_24px_50px_-40px_rgba(15,23,42,0.18)] transition-colors duration-300 hover:border-slate-300"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left sm:px-7 sm:py-6"
                  aria-expanded={isOpen}
                >
                  <span className="text-lg font-semibold tracking-[-0.02em] text-slate-900 sm:text-[1.35rem]">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-300 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  className="grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out"
                  style={{
                    gridTemplateRows: isOpen ? '1fr' : '0fr',
                    opacity: isOpen ? 1 : 0.72,
                  }}
                >
                  <div className="min-h-0">
                    <div className="px-6 pb-6 pt-0 sm:px-7 sm:pb-7">
                      <div className="border-t border-slate-100 pt-5">
                        <p className="max-w-2xl text-[15px] leading-7 text-slate-500">
                          {item.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:bg-black"
          >
            {showAll ? 'Show fewer answers' : 'Read all Answers'}
          </button>
        </div>
      </div>
    </section>
  );
}
