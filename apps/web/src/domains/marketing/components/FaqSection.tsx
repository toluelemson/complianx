import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const FAQ_ITEMS = [
  {
    question: 'What is Complianx?',
    answer:
      'Complianx is a documentation and approval workspace for AI systems.',
  },
  {
    question: 'What exactly do you deliver?',
    answer:
      'An EU AI Act Documentation Package with system facts, evidence, review history, and approval status.',
  },
  {
    question: 'Who is this service for?',
    answer:
      'For SMEs, AI teams, and consultants managing client work.',
  },
  {
    question: "Why shouldn't we do this ourselves?",
    answer:
      'You can. Complianx keeps intake, evidence, review, approval, and versions together.',
  },
  {
    question: 'How fast can we get our documentation?',
    answer:
      'It depends on your information and evidence. The workspace shows what is missing.',
  },
  {
    question: 'What do you need from us to start?',
    answer:
      'Just a short description of your AI system, what data you use, and your use case or product flow. We handle the rest.',
  },
  {
    question: 'Is this compliant with the EU AI Act?',
    answer:
      'Complianx supports documentation work. It does not replace legal or compliance review.',
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
      'Trial, Solo, Team, Consultancy, and Enterprise pricing are configurable hypotheses while the product and service model are validated.',
  },
  {
    question: 'Is this a one-time service or ongoing?',
    answer:
      'Both. We offer one-time documentation delivery and ongoing compliance monitoring as an optional upgrade.',
  },
  {
    question: 'What makes NeuralDocx different?',
    answer:
      'Structured intake, evidence mapping, human review, and version history in one place.',
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
  const visibleItems = showAll ? FAQ_ITEMS : FAQ_ITEMS.slice(0, 3);

  return (
    <section
      data-nav-theme="light"
      className="relative overflow-hidden bg-[var(--cx-canvas)] px-5 py-20 sm:px-8 lg:px-10"
    >
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <h2 className="animate-enter-up text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Questions?
          </h2>
        </div>

        <div className="mt-10 space-y-3">
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

        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAll((value) => !value)}
            className="inline-flex items-center justify-center rounded-[var(--cx-radius)] bg-[var(--cx-brand)] px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-[var(--cx-brand-hover)]"
          >
            {showAll ? 'Show fewer' : 'More questions'}
          </button>
        </div>
      </div>
    </section>
  );
}
