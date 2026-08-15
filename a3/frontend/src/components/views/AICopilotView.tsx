"use client";

import React, { useState } from "react";
import { AIChatMessage, DatasetInfo, ViewType } from "../../lib/types";
import { Card } from "../ui/Card";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { api } from "../../lib/api";

interface AICopilotViewProps {
  dataset: DatasetInfo | null;
  onNavigate: (view: ViewType) => void;
}

export function AICopilotView({ dataset, onNavigate }: AICopilotViewProps) {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      id: "1",
      role: "assistant",
      text: dataset
        ? `Hello! I am your local AI Analytics Copilot for **${dataset.name}**. I can help you compute KPIs, inspect data completeness, detect anomalies, analyze correlations, or configure time-series forecasts. What would you like to explore?`
        : "Hello! Please select or upload a dataset to begin analytical copilot reasoning.",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sampleChips = [
    "Summarize this dataset",
    "Check for missing values",
    "Find unusual values",
    "What are the strongest correlations?",
    "Forecast primary metric",
    "Plot monthly trend",
  ];

  async function handleSend(textToSend?: string) {
    const text = textToSend || input;
    if (!text.trim()) return;

    const userMsg: AIChatMessage = {
      id: Math.random().toString(),
      role: "user",
      text,
      timestamp: "Just now",
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setLoading(true);

    try {
      const res = await api.sendAIChat(text, dataset?.id);
      const assistantMsg: AIChatMessage = {
        id: Math.random().toString(),
        role: "assistant",
        text: res.reply,
        intent: res.intent,
        insights: res.insights,
        suggested_action: res.suggested_action,
        suggested_view: res.suggested_view,
        plot_data: res.plot_data,
        timestamp: `${res.execution_time_ms}ms`,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "assistant",
          text: "I was unable to process this analytical query. Please ensure the backend service is running.",
          timestamp: "Error",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span>AI Analytics Copilot</span>
            <Badge variant="purple">Offline / Privacy Safe</Badge>
          </h2>
          <p className="text-xs text-[var(--text-secondary)]">
            Ask natural-language questions grounded strictly in local statistical facts without raw data leakage.
          </p>
        </div>
      </div>

      {/* Main Chat Conversation Container */}
      <Card className="flex flex-col h-[560px] p-0 overflow-hidden">
        {/* Messages Scroll Area */}
        <div className="flex-1 p-5 overflow-y-auto space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"} space-y-2`}
            >
              <div
                className={`max-w-2xl p-4 rounded-2xl text-xs leading-relaxed ${
                  m.role === "user"
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-black font-semibold shadow-lg shadow-emerald-500/10"
                    : "glass-card bg-[rgba(15,20,35,0.8)] border border-white/10 text-gray-200"
                }`}
              >
                <div className="whitespace-pre-wrap">{m.text}</div>

                {/* Structured Fact / Observation / Recommendation Cards */}
                {m.insights && m.insights.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    {m.insights.map((ins, i) => (
                      <div
                        key={i}
                        className={`p-2.5 rounded-xl text-[11px] border ${
                          ins.category === "FACT"
                            ? "bg-blue-500/10 border-blue-500/20 text-blue-200"
                            : ins.category === "OBSERVATION"
                            ? "bg-purple-500/10 border-purple-500/20 text-purple-200"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-200"
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold mb-1">
                          <span>[{ins.category}] {ins.title}</span>
                          <span className="font-mono opacity-60 text-[10px]">{(ins.confidence * 100).toFixed(0)}% conf</span>
                        </div>
                        <p className="opacity-90 leading-normal">{ins.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Navigation Action Pill */}
                {m.suggested_action && m.suggested_view && (
                  <div className="mt-3 pt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => onNavigate(m.suggested_view as ViewType)}
                    >
                      {m.suggested_action} →
                    </Button>
                  </div>
                )}
              </div>

              {m.timestamp && (
                <span className="text-[10px] text-gray-500 px-2 font-mono">{m.timestamp}</span>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-gray-400 p-2">
              <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span>Analyzing dataset statistics…</span>
            </div>
          )}
        </div>

        {/* Suggestion Chips */}
        <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01] flex flex-wrap gap-1.5">
          {sampleChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[11px] text-gray-300 transition-colors cursor-pointer"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 border-t border-white/10 bg-[#070a12] flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your data (e.g. 'Find statistical outliers')..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-[var(--accent-emerald)]"
          />
          <Button variant="primary" size="md" type="submit" disabled={loading || !input.trim()}>
            Send ↵
          </Button>
        </form>
      </Card>
    </div>
  );
}
