/**
 * Screener Voice Assistant for ASHA workers & rural PHC operators.
 * Uses Web Speech API for real-time audio guidance in English / Hindi.
 */

export function speakText(text: string, lang: 'en' | 'hi' = 'en'): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (lang === 'hi') {
      const hindiVoice = voices.find((v) => v.lang.includes('hi') || v.name.includes('Hindi'));
      if (hindiVoice) utterance.voice = hindiVoice;
    } else {
      const englishVoice = voices.find((v) => v.lang.includes('en-IN') || v.lang.includes('en-US'));
      if (englishVoice) utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch {
    // Graceful fallback if Speech Synthesis is restricted
  }
}

export function speakStageUpdate(stageTitle: string): void {
  speakText(`Running ${stageTitle}`);
}

export function speakQualityResult(verdict: string, score: number): void {
  if (verdict === 'good') {
    speakText(`Quality check passed with score ${score} out of 100.`);
  } else if (verdict === 'borderline') {
    speakText(`Quality is borderline at score ${score}. Proceeding with caution.`);
  } else {
    speakText(`Warning: Image quality rejected. Recapture required before proceeding.`);
  }
}

export function speakClinicalVerdict(gradeLabel: string, referable: boolean): void {
  if (referable) {
    speakText(`Assessment complete: ${gradeLabel}. Specialist referral required.`);
  } else {
    speakText(`Assessment complete: ${gradeLabel}. Routine annual follow-up recommended.`);
  }
}
