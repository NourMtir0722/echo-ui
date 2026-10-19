"use client";

/** The live preview on /docs/now-playing. */
import { NowPlaying } from "@registry/echo/now-playing";
import { useEffect,useState } from "react";
import { row } from "./shared/objects-row";

function NowPlayingPreview() {
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(84);
  const [track, setTrack] = useState(0);
  const tracks = [
    { title: "Night Drive", artist: "Low Tide", duration: 214 },
    { title: "Glass Garden", artist: "Mira Vale", duration: 187 },
  ];
  const t = tracks[track]!;
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => setPosition((p) => Math.min(t.duration, p + 1)), 1000);
    return () => window.clearInterval(id);
  }, [playing, t.duration]);
  return (
    <div style={{ ...row, gap: 28, alignItems: "flex-start" }}>
      <NowPlaying
        title={t.title}
        artist={t.artist}
        source="Library"
        playing={playing}
        onPlayingChange={setPlaying}
        position={position}
        duration={t.duration}
        onSeek={setPosition}
        onPrevious={() => {
          setTrack((i) => (i + tracks.length - 1) % tracks.length);
          setPosition(0);
        }}
        onNext={() => {
          setTrack((i) => (i + 1) % tracks.length);
          setPosition(0);
        }}
      />
      <NowPlaying title="Breakfast Show" source="Fresh FM 88.5" playing onPlayingChange={() => undefined} position={3725} />
    </div>
  );
}

export default function Preview() {
  return <NowPlayingPreview />;
}
