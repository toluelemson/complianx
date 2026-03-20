const FOOTER_LINKS = [
  'Product',
  'Solutions',
  'Pricing',
  'API',
  'Documentation',
  'Privacy',
  'Terms',
  'Contact',
];

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#080910] px-5 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-lg font-semibold text-white">NeuralDocx</p>
            <p className="mt-3 text-sm leading-7 text-slate-400">
              NeuralDocx is an AI compliance and documentation platform for
              teams that need governance, traceability, and audit-ready outputs.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-x-10 gap-y-3 sm:grid-cols-4">
            {FOOTER_LINKS.map((link) => (
              <span
                key={link}
                className="text-sm text-slate-400 transition hover:text-white"
              >
                {link}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
