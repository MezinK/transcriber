import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { JobCard } from "./JobCard";

export function JobGrid() {
  const { jobs, loading, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading && jobs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-10 text-center text-stone-400">
        Loading...
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-10 text-center text-stone-400">
        Upload your first file to get started
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} onDelete={deleteJob} />
      ))}
    </div>
  );
}
