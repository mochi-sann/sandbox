import { Activity, Clock3, Flame } from "lucide-react";
import { AppleActivityCard, type ActivityData } from "@/components/ui/apple-activity-ring";

const demoActivities: ActivityData[] = [
  {
    label: "MOVE",
    value: 78,
    color: "#FF2D55",
    size: 200,
    current: 624,
    target: 800,
    unit: "CAL",
  },
  {
    label: "EXERCISE",
    value: 86,
    color: "#A3F900",
    size: 160,
    current: 26,
    target: 30,
    unit: "MIN",
  },
  {
    label: "STAND",
    value: 58,
    color: "#04C7DD",
    size: 120,
    current: 7,
    target: 12,
    unit: "HR",
  },
];

const images = [
  {
    src: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=80",
    alt: "Morning workout session",
  },
  {
    src: "https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&w=1200&q=80",
    alt: "Running training outdoors",
  },
];

export default function DemoOne() {
  return (
    <section className="mx-auto w-full max-w-5xl rounded-2xl border bg-card/60 p-4 text-foreground shadow-sm backdrop-blur md:p-6">
      <div className="mb-6 flex items-center justify-center gap-2">
        <Activity className="h-5 w-5 text-zinc-700 dark:text-zinc-200" aria-hidden />
        <h3 className="text-xl font-semibold">Daily Activity Demo</h3>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-4 sm:grid-cols-2">
          {images.map((image) => (
            <figure key={image.src} className="overflow-hidden rounded-xl border bg-muted">
              <img src={image.src} alt={image.alt} loading="lazy" className="h-44 w-full object-cover md:h-56" />
              <figcaption className="flex items-center gap-2 p-3 text-left text-xs text-muted-foreground">
                <Flame className="h-3.5 w-3.5" aria-hidden />
                Unsplash stock image
              </figcaption>
            </figure>
          ))}
        </div>

        <div className="rounded-2xl border bg-background/70">
          <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
            <Clock3 className="h-4 w-4" aria-hidden />
            Updated live from props
          </div>
          <AppleActivityCard title="Today Activity Rings" activities={demoActivities} className="max-w-none p-6" />
        </div>
      </div>
    </section>
  );
}

