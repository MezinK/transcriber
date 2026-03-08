import { useTranscriptions } from "../hooks/useTranscriptions";
import { useDeleteJob } from "../hooks/useDeleteJob";
import { JobCard } from "./JobCard";

interface JobGridProps {
  onPickFile: () => void;
}

export function JobGrid({ onPickFile }: JobGridProps) {
  const { jobs, loading, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading && jobs.length === 0) {
    return <p className="text-zinc-600 text-sm">Loading...</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onDelete={deleteJob} />
      ))}

      {/* + card */}
      <button
        onClick={onPickFile}
        className="bg-zinc-900/50 rounded-lg border border-dashed border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 transition-all p-4 flex items-center justify-center min-h-[72px] cursor-pointer group"
      >
        <span className="text-zinc-700 group-hover:text-zinc-400 text-2xl font-light transition-colors">
          +
        </span>
      </button>
    </div>
  );
}
