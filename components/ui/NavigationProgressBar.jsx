export default function NavigationProgressBar() {
  return (
    <div className="fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden bg-[#3B3CFF]/15">
      <div className="h-full w-1/3 animate-navigation-progress bg-[#3B3CFF]" />
    </div>
  );
}
