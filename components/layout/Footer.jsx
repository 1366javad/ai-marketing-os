import Link from "next/link";
import Logo from "../landing/Logo";

const productLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Campaigns", href: "/dashboard/campaings" },
  { label: "Campaign Starters", href: "/dashboard/templates" },
  { label: "Features", href: "/#features" },
];

const legalLinks = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

function Footer() {
  return (
    <footer className="border-t border-base px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 grid grid-cols-1 gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="mb-4 flex items-center gap-3">
              <Logo />
            </div>
            <p className="max-w-sm text-base font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
              AI Marketing OS helps teams plan, create, and launch campaign
              assets from one campaign-centric workspace.
            </p>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Product</h4>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#3B3CFF] dark:text-slate-400 dark:hover:text-indigo-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Legal</h4>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm font-semibold text-slate-600 transition-colors hover:text-[#3B3CFF] dark:text-slate-400 dark:hover:text-indigo-300"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-base pt-8 text-center text-base text-slate-400">
          © 2026 Marketing OS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

export default Footer;
