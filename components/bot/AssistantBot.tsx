'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  Send,
  Sparkles,
  X,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  actionLink?: {
    href: string;
    label: string;
  };
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'bot',
    text: 'Namaste! 👋 I am the RetinaSetu Clinical Triage Assistant. How can I assist you with diabetic retinopathy screening or hospital referral today?',
  },
];

const QUICK_PROMPTS = [
  {
    label: '🩺 How do I screen an eye image?',
    query: 'How do I screen an eye image?',
    response:
      'You can test fundus photographs in our 7-Stage AI Clinical Workspace. It automatically verifies image quality, isolates retinal lesions, and provides standard ICDR grading.',
    link: { href: '/screening', label: 'Open Screening Workspace' },
  },
  {
    label: '🏥 Find nearest government eye hospital',
    query: 'Find nearest government eye hospital',
    response:
      'Search empaneled Ayushman Bharat PM-JAY Vision Centers, District Civil Hospitals, and Retina Specialists near your district.',
    link: { href: '/hospitals', label: 'Open Hospital Finder' },
  },
  {
    label: '👨‍⚕️ Where do ophthalmologists review cases?',
    query: 'Where do ophthalmologists review cases?',
    response:
      'District Ophthalmologists can log into the Doctor Console to inspect high-risk referrals, examine Red-Free green channel heatmaps, and digitally sign off patient reports.',
    link: { href: '/admin', label: 'Open Doctor Console' },
  },
  {
    label: '🛡️ Is laser treatment free under PM-JAY?',
    query: 'Is laser treatment free under PM-JAY?',
    response:
      'Yes! Empaneled Ayushman Bharat PM-JAY vision centers offer free diabetic retinopathy screening, laser photocoagulation, and follow-up care for eligible card holders.',
    link: { href: '/hospitals', label: 'View PM-JAY Centers' },
  },
];

export function AssistantBot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputQuery, setInputQuery] = useState('');

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputQuery;
    if (!query.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');

    setTimeout(() => {
      let botResponse =
        'I can guide you through RetinaSetu! You can screen fundus photos in the Screening Workspace, search for Ayushman Bharat eye hospitals, or access the Doctor Console for specialist review.';
      let actionLink: { href: string; label: string } | undefined;

      const lower = query.toLowerCase();
      if (lower.includes('test') || lower.includes('upload') || lower.includes('photo') || lower.includes('screen')) {
        botResponse =
          'To test or upload a fundus photograph, open our 7-Stage Clinical Screening Workspace. It will automatically check photo quality, locate lesions, and provide ICDR grade 0-4.';
        actionLink = { href: '/screening', label: 'Open Screening Workspace' };
      } else if (lower.includes('hospital') || lower.includes('center') || lower.includes('ayushman') || lower.includes('near')) {
        botResponse =
          'You can locate nearest Government District Eye Hospitals and Ayushman Bharat PM-JAY Vision Health Centers using our Hospital Finder.';
        actionLink = { href: '/hospitals', label: 'Open Hospital Finder' };
      } else if (lower.includes('doctor') || lower.includes('admin') || lower.includes('referral') || lower.includes('queue')) {
        botResponse =
          'Ophthalmologists can access the Doctor Console to review pending patient referrals, check lesion heatmaps, and digitally sign off patient reports.';
        actionLink = { href: '/admin', label: 'Open Doctor Console' };
      } else if (lower.includes('about') || lower.includes('sih') || lower.includes('what is')) {
        botResponse =
          'RetinaSetu is an AI-assisted Diabetic Retinopathy clinical decision support platform designed for frontline health workers in rural Primary Health Centres.';
        actionLink = { href: '/about', label: 'Read Clinical Documentation' };
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          sender: 'bot',
          text: botResponse,
          actionLink,
        },
      ]);
    }, 300);
  };

  const handlePromptClick = (prompt: (typeof QUICK_PROMPTS)[0]) => {
    setMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, sender: 'user', text: prompt.query },
      {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: prompt.response,
        actionLink: prompt.link,
      },
    ]);
  };

  return (
    <div className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-50">
      {/* Trigger Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2 rounded-full bg-emerald-700 p-3 text-white shadow-lg hover:bg-emerald-800 active:scale-95 transition-all"
          aria-label="Open Clinical AI Assistant"
        >
          <Bot className="h-5 w-5" />
          <span className="hidden pr-1.5 text-xs font-bold tracking-wide sm:inline-block">
            Clinical AI Guide
          </span>
        </button>
      )}

      {/* Chatbot Window Modal */}
      {isOpen && (
        <div className="clinical-card flex h-[480px] w-[340px] sm:w-[380px] flex-col overflow-hidden shadow-xl bg-white animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-emerald-800 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-900 text-white">
                <Bot className="h-4 w-4" />
              </span>
              <div>
                <h3 className="text-xs font-bold font-display">RetinaSetu Clinical Assistant</h3>
                <p className="text-[10px] text-emerald-200">
                  Triage & Screening Support
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="grid h-6 w-6 place-items-center rounded text-emerald-200 hover:text-white transition"
              aria-label="Close Assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-2.5 leading-relaxed font-medium ${
                    m.sender === 'user'
                      ? 'bg-emerald-700 text-white rounded-br-none'
                      : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-xs'
                  }`}
                >
                  {m.text}
                </div>
                {m.actionLink && (
                  <Link
                    href={m.actionLink.href}
                    onClick={() => setIsOpen(false)}
                    className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition"
                  >
                    <Sparkles className="h-3 w-3 text-emerald-700" />
                    {m.actionLink.label}
                  </Link>
                )}
              </div>
            ))}

            {/* Quick Prompts */}
            <div className="pt-2 border-t border-slate-200 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Common Inquiries:
              </p>
              <div className="flex flex-wrap gap-1">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handlePromptClick(p)}
                    className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10.5px] font-medium text-slate-700 hover:border-emerald-500 hover:bg-emerald-50 text-left transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input Footer */}
          <div className="border-t border-slate-200 bg-white p-2.5">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-1.5"
            >
              <input
                type="text"
                placeholder="Ask clinical or navigation question..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-600 focus:bg-white focus:outline-none transition"
              />
              <button
                type="submit"
                className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
