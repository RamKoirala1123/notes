"use client";

import React, { useState, useEffect } from "react";
import { resetDatabaseToDemo, db } from "@/lib/db";
import { Settings, RefreshCw, HardDrive, X, ShieldAlert, Smartphone, Download, CheckCircle2 } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onResetComplete }) => {
  const [noteCount, setNoteCount] = useState<number>(0);
  const [isResetting, setIsResetting] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (isOpen) {
      db.notes.count().then((count) => setNoteCount(count));
    }

    if (typeof window !== "undefined") {
      const match = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone;
      setIsStandalone(Boolean(match));

      const handleBeforeInstallPrompt = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e);
      };

      window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    }
  };

  const handleResetDemo = async () => {
    if (confirm("Are you sure you want to reset all notes to initial demo state?")) {
      setIsResetting(true);
      await resetDatabaseToDemo();
      setIsResetting(false);
      onResetComplete();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Settings className="w-4 h-4" />
            </div>
            <h2 className="font-bold text-base text-neutral-100">Application Settings</h2>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1 rounded-lg hover:bg-neutral-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* PWA Android / Mobile Installation Card */}
          <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-300 font-semibold text-xs">
                <Smartphone className="w-4 h-4 text-indigo-400" />
                <span>Install on Android / Mobile (PWA)</span>
              </div>
              {isStandalone && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Installed
                </span>
              )}
            </div>

            <p className="text-neutral-300 text-[11px] leading-relaxed">
              Install <strong>Notes</strong> directly on your Android phone home screen to run standalone full-screen like a native app with fast offline access!
            </p>

            {deferredPrompt ? (
              <button
                onClick={handleInstallPWA}
                className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-colors shadow-md"
              >
                <Download className="w-4 h-4" />
                <span>Install App on Android</span>
              </button>
            ) : isStandalone ? (
              <div className="p-2 rounded bg-neutral-900/60 text-[11px] text-emerald-300 text-center font-medium border border-emerald-900/50">
                ✓ Running in Standalone App Mode
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[11px] text-neutral-400 space-y-1">
                <p className="font-medium text-neutral-300">How to install on Android Chrome:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-[10px] text-neutral-400">
                  <li>Tap Chrome&apos;s <strong>⋮ (Three dots menu)</strong> at top right.</li>
                  <li>Select <strong>&quot;Add to Home screen&quot;</strong> or <strong>&quot;Install app&quot;</strong>.</li>
                  <li>Confirm installation — your app icon will appear on your phone screen!</li>
                </ol>
              </div>
            )}
          </div>

          {/* Storage Gauge */}
          <div className="p-4 rounded-xl bg-neutral-950/80 border border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HardDrive className="w-5 h-5 text-indigo-400" />
              <div>
                <h3 className="text-xs font-semibold text-neutral-200">IndexedDB Browser Storage</h3>
                <p className="text-[11px] text-neutral-400">Total stored notes: {noteCount}</p>
              </div>
            </div>
            <span className="text-[10px] px-2 py-1 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
              Client Offline Mode
            </span>
          </div>

          {/* Reset Action */}
          <div className="pt-4 border-t border-neutral-800 space-y-2">
            <h4 className="text-xs font-semibold text-rose-400 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Danger Zone
            </h4>

            <button
              onClick={handleResetDemo}
              disabled={isResetting}
              className="w-full py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isResetting ? "animate-spin" : ""}`} />
              <span>{isResetting ? "Resetting..." : "Reset All Notes to Demo Content"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
