"use client";

import React, { useState, useEffect } from "react";
import { resetDatabaseToDemo, db } from "@/lib/db";
import { Settings, RefreshCw, Database, HardDrive, X, Check, ShieldAlert } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResetComplete: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onResetComplete }) => {
  const [noteCount, setNoteCount] = useState<number>(0);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      db.notes.count().then((count) => setNoteCount(count));
    }
  }, [isOpen]);

  if (!isOpen) return null;

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
        <div className="p-6 space-y-6">
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

          {/* Vercel Deployment Notice */}
          <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-800/40 text-xs space-y-1">
            <h4 className="font-semibold text-indigo-300 flex items-center gap-1.5">
              <span>🚀 Ready for Vercel & Custom Domain</span>
            </h4>
            <p className="text-neutral-400 leading-relaxed text-[11px]">
              This Next.js app uses client-side browser storage (IndexedDB), making it 100% compatible with static export or standard Next.js hosting on your Vercel custom domain!
            </p>
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
