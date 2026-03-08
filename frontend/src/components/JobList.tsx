import { useTranscriptions } from "../hooks/useTranscriptions";
import { useDeleteJob } from "../hooks/useDeleteJob";
import { JobRow } from "./JobRow";

export function JobList() {
  const { jobs, loading, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading && jobs.length === 0) {
    return <p className="text-zinc-500 text-sm">Loading...</p>;
  }

  if (jobs.length === 0) {
    return <p className="text-zinc-500 text-sm">No transcriptions yet</p>;
  }

  return (
    <div className="space-y-2">
      {jobs.map((job) => (
        <JobRow key={job.id} job={job} onDelete={deleteJob} />
      ))}
    </div>
  );
}
