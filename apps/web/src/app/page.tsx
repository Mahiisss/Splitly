import type { Metadata } from "next";
import { HomeView } from "@/components/HomeView";

export const metadata: Metadata = { title: "Splitly" };

export default function HomePage() {
  return <HomeView />;
}
