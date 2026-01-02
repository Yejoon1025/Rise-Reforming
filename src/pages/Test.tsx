import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { useNavigate } from "react-router-dom";
import { WorldScene } from "../world/WorldScene";
import Navbar from "../components/Navbar.jsx";
import * as content from "../data/WorldContent.js";

/* ---------------- HUD styles ---------------- */

const hudStyle: React.CSSProperties = {
  position: "fixed",
  left: 100,
  padding: "10px 12px",
  background: "rgba(12, 26, 34, 0.52)",
  borderRadius: 12,
  fontSize: 14,
  pointerEvents: "none",
};

/* NEW: dynamic hint stacking container */
const hintContainerStyle: React.CSSProperties = {
  position: "fixed",
  top: 200,
  left: 100,
  width: 320,
  display: "flex",
  flexDirection: "column",
  gap: 30,
  pointerEvents: "none",
  zIndex: 20,
};

const hintBoxStyle: React.CSSProperties = {
  padding: "10px 12px",
  background: "rgba(12, 26, 34, 0.52)",
  borderRadius: 12,
  fontSize: 14,
};

/* -------------------------------------------- */

type Quest = {
  id: string;
  targetObstacleId: string;
  text: string;
};

export default function WorldPage() {
  const navigate = useNavigate();

  /* ---------------- Intro overlay timing controls ---------------- */
  const TEXT_1_DURATION_MS = 2200;
  const TEXT_2_DURATION_MS = 2000;
  const OVERLAY_FADE_DURATION_MS = 800;
  /* --------------------------------------------------------------- */

  const INTRO_SESSION_KEY = "rise_intro_seen_v4";
  const SPLASH_DONE_KEY = "rise_loading_splash_done_v1";

  const [showIntro, setShowIntro] = useState(false);
  const [fadeOutIntro, setFadeOutIntro] = useState(false);
  const [introStep, setIntroStep] = useState<1 | 2>(1);

  const startIntro = useCallback(() => {
    if (sessionStorage.getItem(INTRO_SESSION_KEY) === "1") return;

    sessionStorage.setItem(INTRO_SESSION_KEY, "1");
    setIntroStep(1);
    setFadeOutIntro(false);
    setShowIntro(true);

    const stepTimer = window.setTimeout(() => setIntroStep(2), TEXT_1_DURATION_MS);

    const fadeTimer = window.setTimeout(
      () => setFadeOutIntro(true),
      TEXT_1_DURATION_MS + TEXT_2_DURATION_MS
    );

    const removeTimer = window.setTimeout(
      () => setShowIntro(false),
      TEXT_1_DURATION_MS + TEXT_2_DURATION_MS + OVERLAY_FADE_DURATION_MS
    );

    return () => {
      window.clearTimeout(stepTimer);
      window.clearTimeout(fadeTimer);
      window.clearTimeout(removeTimer);
    };
  }, [TEXT_1_DURATION_MS, TEXT_2_DURATION_MS, OVERLAY_FADE_DURATION_MS]);

  useEffect(() => {
    if (sessionStorage.getItem(SPLASH_DONE_KEY) === "1") {
      const cleanup = startIntro();
      return () => {
        if (typeof cleanup === "function") cleanup();
      };
    }

    const onSplashDone = () => {
      sessionStorage.setItem(SPLASH_DONE_KEY, "1");
      startIntro();
    };

    window.addEventListener("rise:splashDone", onSplashDone);

    const fallback = window.setTimeout(() => {
      startIntro();
    }, 8000);

    return () => {
      window.removeEventListener("rise:splashDone", onSplashDone);
      window.clearTimeout(fallback);
    };
  }, [startIntro]);

  /* ---------------- Hint + Quest logic ---------------- */

  const [hint, setHint] = useState<{ active: boolean; id: string | null }>({
    active: false,
    id: null,
  });

  const quests = useMemo<Quest[]>(
    () => [
      { id: "q1", targetObstacleId: "b1", text: "Pick up biogas from the anaerobic digester" },
      { id: "q2", targetObstacleId: "b2", text: "Deposit biogas at Rise's processing module" },
      { id: "q3", targetObstacleId: "b3", text: "Transport processed DME to storage facility"},
      { id: "q4", targetObstacleId: "b4", text: "Go retire the truck!" },
    ],
    []
  );

  const [questIndex, setQuestIndex] = useState(0);

  const prevCollisionRef = useRef<{ active: boolean; id: string | null }>({
    active: false,
    id: null,
  });

  const hintLinesById = useMemo<Record<string, string[]>>(
    () => ({
      b1: [content.Farm1, content.Farm2, content.Farm3],
      b2: [content.Plant1, content.Plant2],
      b3: [content.Sell1, content.Sell2, content.Sell3],
      b4: [content.Retire1, content.Retire2, content.Retire3],
    }),
    []
  );

  const handleHintChange = useCallback(
    (active: boolean, obstacleId: string | null) => {
      setHint({ active, id: obstacleId });

      const prev = prevCollisionRef.current;
      const enteredContact = Boolean(active && obstacleId && (!prev.active || prev.id !== obstacleId));

      if (enteredContact && obstacleId) {
        setQuestIndex((idx) => {
          const current = quests[idx];
          if (!current) return idx;
          if (obstacleId === current.targetObstacleId) {
            return Math.min(idx + 1, quests.length);
          }
          return idx;
        });
      }

      prevCollisionRef.current = { active, id: obstacleId };
    },
    [quests]
  );

  const hintLines =
    (hint.id && hintLinesById[hint.id]) ||
    (hint.id ? [`Near obstacle: ${hint.id}`] : ["Near an obstacle"]);

  const currentQuest = quests[questIndex] ?? null;

  // tell WorldScene which obstacle is next, so it can point the arrow at it
  const nextObstacleId = currentQuest ? currentQuest.targetObstacleId : null;

  const questText = currentQuest ? currentQuest.text : "All quests complete. Click on the tech tab!";

  const allQuestsComplete = questIndex >= quests.length;

  /* ---------------- Render ---------------- */

  return (
    <div style={{ width: "100%", height: "100vh", overflow: "hidden" }}>
      <Navbar />

      <Canvas
        shadows={false}
        dpr={[1, 1.5]}
        camera={{ position: [10, 10, 10], fov: 45 }}
        onCreated={({ gl }) => {
          gl.setClearColor("#d7f0ff", 0.01);
        }}
      >
        <WorldScene onCollisionChange={handleHintChange} nextObstacleId={nextObstacleId} />
      </Canvas>

      {/* -------- Intro Overlay -------- */}
      {showIntro && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.55)",
            zIndex: 1000,
            opacity: fadeOutIntro ? 0 : 1,
            transition: `opacity ${OVERLAY_FADE_DURATION_MS}ms ease`,
            pointerEvents: "all",
          }}
        >
          <div className="h-full w-full flex items-center justify-center">
            <h1
              className="font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight max-w-[70vw] mx-auto"
              style={{
                opacity: introStep === 1 ? 1 : 0,
                transition: "opacity 0.6s ease",
                position: "absolute",
              }}
            >
              Welcome to Rise&apos;s interactive webpage
            </h1>

            <h1
              className="font-bahnschrift text-4xl md:text-6xl text-[#e0e0e0] px-6 text-center leading-tight max-w-[70vw] mx-auto"
              style={{
                opacity: introStep === 2 ? 1 : 0,
                transition: "opacity 0.6s ease",
                position: "absolute",
              }}
            >
              Help the truck complete its mission!
            </h1>
          </div>
        </div>
      )}
      {/* -------------------------------- */}

      {/* Right-side Directions */}
      <div
        style={{
          ...hudStyle,
          top: 80,
          left: "auto",
          right: 16,
          width: 320,
        }}
      >
        Use arrow keys or click to move
        <br />
        Scroll to adjust zoom
      </div>

      {/* Left-side Hint boxes (dynamic stacking) */}
      {hint.active && (
        <div style={hintContainerStyle}>
          {hintLines.map((line, i) => (
            <div key={`${hint.id ?? "hint"}-${i}`} style={hintBoxStyle}>
              {line}
            </div>
          ))}
        </div>
      )}

      {/* Right-side Quest box */}
      <div
        style={{
          ...hudStyle,
          top: 160,
          left: "auto",
          right: 16,
          width: 320,
        }}
      >
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Quest</div>
        <div>{questText}</div>
        <div style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          {Math.min(questIndex, quests.length)} / {quests.length}
        </div>
      </div>

      {/* Bottom-right navigation CTA (only after final quest) */}
      {allQuestsComplete && (
        <button
          type="button"
          onClick={() => navigate("/tech")}
          style={{
            position: "fixed",
            right: 16,
            bottom: 16,
            padding: "10px 12px",
            borderRadius: 12,
            background: "rgba(12, 26, 34, 0.62)",
            color: "#f8da9c",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
            zIndex: 60,
            pointerEvents: "auto",
          }}
          aria-label="Navigate to Tech"
        >
          Click to learn about tech!
        </button>
      )}
    </div>
  );
}
