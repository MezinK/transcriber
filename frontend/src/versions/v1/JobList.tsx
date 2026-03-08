import { useTranscriptions } from "../../hooks/useTranscriptions.ts";
import { useDeleteJob } from "../../hooks/useDeleteJob.ts";
import { JobCard } from "./JobCard.tsx";

export function JobList() {
  const { jobs, loading, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading && jobs.length === 0) {
    return <p className="text-slate-400 text-sm">Loading…</p>;
  }

  if (jobs.length === 0) {
    return (
      <p className="text-slate-400 text-sm">
        No transcriptions yet. Upload a file to get started.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onDelete={deleteJob} />
      ))}
    </div>
  );
}
