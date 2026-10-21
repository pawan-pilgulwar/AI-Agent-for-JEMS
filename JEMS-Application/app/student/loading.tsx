import DashboardShell from "@/components/dashboard/student/DashboardShell";

/**
 * Instant skeleton shown while a student page's data loads on the server. Next
 * renders this as the Suspense fallback the moment you navigate, so moving
 * between sections always feels responsive instead of frozen. The layout above
 * has already resolved, so the sidebar/top-bar chrome stays in place.
 */
function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-lightgray/70 ${className}`} />;
}

export default function StudentLoading() {
  return (
    <DashboardShell>
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <Block className="h-7 w-48" />
          <Block className="h-4 w-64" />
        </div>

        {/* Stat tiles */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Block key={i} className="h-28 w-full" />
          ))}
        </div>

        {/* Two-column body */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Block className="h-56 w-full" />
            <Block className="h-72 w-full" />
          </div>
          <div className="space-y-6">
            <Block className="h-40 w-full" />
            <Block className="h-48 w-full" />
            <Block className="h-40 w-full" />
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}
