/**
 * The Motion gallery.
 */
import type { Metadata } from "next";
import { MotionGallery } from "@/components/MotionGallery";

export const metadata: Metadata = {
  title: "Motion gallery — Echo UI",
  description:
    "Components whose motion is the point: shapes that divide and fuse, and parts that answer the hand with a different kind of physics each. Every one installs with its motion, sound and keyboard path.",
};

export default function Page() {
  return <MotionGallery />;
}
