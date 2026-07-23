import { Brain } from "lucide-react";

function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto max-w-7xl px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-gradient-to-br from-brand to-brand-2 flex items-center justify-center">
            <Brain className="h-3 w-3 text-white" />
          </div>
          <span>AI Marketing OS</span>
        </div>
        <div>
          © {new Date().getFullYear()} AI Marketing OS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
