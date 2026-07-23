import { Brain } from "lucide-react";

function Nav() {
  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/60 border-b border-border/40">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center">
            <Brain className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight">AI Marketing OS</span>
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm text-muted-foreground">
          {["Product", "How It Works", "Agents", "Pricing", "Resources"].map(
            (l) => (
              <a
                key={l}
                href={`#${l.toLowerCase().replace(/ /g, "-")}`}
                className="hover:text-foreground transition"
              >
                {l}
              </a>
            ),
          )}
        </div>
        <div className="flex items-center gap-3">
          <button className="text-sm text-muted-foreground hover:text-foreground">
            Sign in
          </button>
          <button className="btn-brand btn-brand-hover rounded-lg px-4 py-2 text-sm font-medium">
            Build Your Marketing Brain
          </button>
        </div>
      </div>
    </nav>
  );
}
export default Nav;
