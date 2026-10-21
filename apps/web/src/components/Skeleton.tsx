/** Grey loading shapes shown for a moment while saved data is read. */
export function Skeleton() {
  return (
    <div aria-busy="true" aria-label="Loading" className="pt-6 pb-10 sm:pt-10">
      <div className="skeleton h-14 w-72 max-w-full rounded-xl" />
      <div className="skeleton mt-5 h-8 w-96 max-w-full rounded-lg" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="skeleton h-44 rounded-[20px]" />
        <div className="skeleton h-44 rounded-[20px]" />
      </div>
    </div>
  );
}
