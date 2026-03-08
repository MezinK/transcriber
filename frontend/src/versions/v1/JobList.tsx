import { useTranscriptions } from "../../hooks/useTranscriptions";
import { useDeleteJob } from "../../hooks/useDeleteJob";
import { JobCard } from "./JobCard";

export function JobList() {
  const { jobs, loading, error, refresh } = useTranscriptions();
  const { deleteJob } = useDeleteJob(refresh);

  if (loading && jobs.length === 0) {
    return (
      <div>
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`animate-pulse py-5 ${i < 3 ? "border-b border-[#e8e4de]" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <div className="h-4 w-52 rounded-sm bg-[#e8e4de]" />
                <div className="h-3 w-24 rounded-sm bg-[#e8e4de]/60" />
              </div>
              <div className="h-3 w-16 rounded-sm bg-[#e8e4de]/40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-l-2 border-[#c43e1c] py-3 pl-4 font-['DM_Sans',sans-serif] text-sm text-[#c43e1c]">
        {error}
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="font-['Playfair_Display',serif] text-lg italic text-[#6b6560]">
          No transcriptions yet
        </p>
        <p className="mt-2 font-['DM_Sans',sans-serif] text-xs tracking-wide text-[#6b6560]/60">
          Upload a recording to begin
        </p>
      </div>
    );
  }

  return (
    <div>
      {jobs.map((job, i) => (
        <div key={job.id}>
          <JobCard job={job} onDelete={deleteJob} />
          {i < jobs.length - 1 && <div className="h-px bg-[#e8e4de]" />}
        </div>
      ))}
    </div>
  );
}
