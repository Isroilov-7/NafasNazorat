import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
