'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Bot,
  ChevronDown,
  MessageSquare,
  Send,
  Sparkles,
  Stethoscope,
  UserCheck,
  Building2,
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
    text: 'Namaste! 👋 I am RetinaSetu AI Health Guide. How can I assist you today?',
  },
];

const QUICK_PROMPTS = [
  {
    label: '🩺 How do I test my eye image?',
    query: 'How do I test my eye image?',
    response:
      'You can test your retinal fundus photograph in our 7-Stage AI Screening Workspace. It checks image quality, detects lesions, and provides instant ICDR grading!',
    link: { href: '/screening', label: 'Go to Screening Workspace' },
  },
  {
    label: '🏥 Find nearest eye hospital',
    query: 'Find nearest eye hospital',
    response:
      'You can search for empaneled Ayushman Bharat PM-JAY Vision Centers, District Government Hospitals, and Retina Specialists near your district or pincode.',
    link: { href: '/hospitals', label: 'Open Hospital Finder' },
  },
  {
    label: '👨‍⚕️ Where do doctors review cases?',
    query: 'Where do doctors review cases?',
    response:
      'District Ophthalmologists can log into the Doctor Console to review high-risk referrals, inspect Red-Free green channel heatmaps, and sign off patient records.',
    link: { href: '/admin', label: 'Open Doctor Console' },
  },
  {
    label: '🛡️ Is treatment free under Ayushman Bharat?',
    query: 'Is treatment free under Ayushman Bharat?',
    response:
      'Yes! Empaneled PM-JAY Ayushman Bharat centers offer free diabetic retinopathy screening, laser photocoagulation, and follow-up care for eligible patients.',
    link: { href: '/hospitals', label: 'View Ayushman Centers' },
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

    // Match intelligent bot response
    setTimeout(() => {
      let botResponse =
        "I can help you navigate RetinaSetu! You can visit our Screening Workspace to test retinal photos, search for Ayushman Bharat Eye Hospitals, or access the Doctor Console for specialist sign-off.";
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
          'RetinaSetu is an AI-powered Diabetic Retinopathy clinical decision support platform built for rural Primary Health Centres (PHCs) in India.';
        actionLink = { href: '/about', label: 'Read About RetinaSetu' };
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
    }, 400);
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
    <div className="fixed bottom-6 right-6 z-50">
      {/* Trigger Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-3 rounded-full bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-3.5 text-white shadow-2xl shadow-emerald-600/40 hover:scale-105 active:scale-95 transition-all duration-300"
          aria-label="Open AI Health Assistant"
        >
          <span className="relative grid h-7 w-7 place-items-center">
            <Bot className="h-6 w-6" />
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse border-2 border-white" />
          </span>
          <span className="hidden pr-2 text-xs font-extrabold tracking-wide sm:inline-block">
            AI Assistant
          </span>
        </button>
      )}

      {/* Chatbot Window Modal */}
      {isOpen && (
        <div className="medical-card-hero flex h-[520px] w-[360px] flex-col overflow-hidden shadow-2xl border-emerald-500/30 bg-white sm:w-[400px] animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200/80 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 px-4 py-3.5 text-white">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/20 text-white backdrop-blur-md">
                <Bot className="h-5 w-5" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold font-display flex items-center gap-1">
                  RetinaSetu AI Guide
                  <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
                </h3>
                <p className="text-[10px] font-semibold text-emerald-100">
                  Instant Navigation & Health Assistance
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="grid h-7 w-7 place-items-center rounded-lg bg-white/10 text-white hover:bg-white/20 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scroll-slim text-xs bg-slate-50/50">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 leading-relaxed font-medium shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-emerald-600 text-white rounded-br-none'
                      : 'bg-white border border-slate-200/80 text-slate-800 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
                {m.actionLink && (
                  <Link
                    href={m.actionLink.href}
                    onClick={() => setIsOpen(false)}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-800 hover:bg-emerald-100 transition shadow-sm"
                  >
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    {m.actionLink.label}
                  </Link>
                )}
              </div>
            ))}

            {/* Quick Prompts */}
            <div className="pt-2 border-t border-slate-200/60 space-y-1.5">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Suggested Questions:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handlePromptClick(p)}
                    className="rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:border-emerald-500 hover:text-emerald-800 hover:bg-emerald-50/50 transition text-left shadow-2xs"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Input Footer */}
          <div className="border-t border-slate-200/80 bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                placeholder="Ask where to test, find hospitals..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-900 placeholder-slate-400 focus:border-emerald-500 focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-600 text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 transition"
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
