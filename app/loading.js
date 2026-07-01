export default function Loading() {
  return (
    <div className="flex items-center justify-center h-screen bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>

        <p className="text-muted text-sm">LOADING ...</p>
      </div>
    </div>
  );
}
