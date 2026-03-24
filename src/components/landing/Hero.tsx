import Link from "next/link";

export function Hero() {
  return (
    <section className="bg-[#FFFFFF]">
      <div className="mx-auto max-w-[1200px] px-6 py-24">
        <h1 className="text-5xl font-bold text-[#111111] leading-tight tracking-tight">
          Prepare for your oral exam with AI
        </h1>
        <p className="text-lg text-[#6B7280] mt-6 max-w-xl">
          One-to-one exam prep with an AI examiner that adapts to your level.
          Voice-to-voice. Available 24/7.
        </p>
        <div className="mt-10 flex gap-4">
          <Link
            href="/select"
            className="inline-flex items-center justify-center rounded-lg bg-[#2563EB] px-6 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[#1D4ED8]"
          >
            Start practicing
          </Link>
          <a
            href="#courses"
            className="inline-flex items-center justify-center rounded-lg border border-[#E5E7EB] bg-white px-6 py-3 text-[15px] font-medium text-[#111111] transition-colors hover:border-[#D1D5DB]"
          >
            View courses
          </a>
        </div>
      </div>
    </section>
  );
}
