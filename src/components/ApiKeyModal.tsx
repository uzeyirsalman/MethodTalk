import React, { useState, useEffect } from 'react';
import { X, Key, Check, Trash2 } from 'lucide-react';
import {
  getStoredApiKey,
  setStoredApiKey,
  clearStoredApiKey,
} from '../services/geminiAudioService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose }) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKeyInput(getStoredApiKey());
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStoredApiKey(apiKeyInput);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleClear = () => {
    clearStoredApiKey();
    setApiKeyInput('');
    setSavedSuccess(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/40 backdrop-blur-xs p-4">
      <div className="bg-white border border-stone-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-stone-900">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-[#9A3412]" />
            <h2 className="text-base font-bold">Gemini API Key Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          Enter your Google Gemini API key to enable live neural TTS synthesis and pronunciation coaching. Your key is stored locally in your browser.
        </p>

        <form onSubmit={handleSave} className="space-y-4">
          <input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder="AIzaSy... or AQ..."
            className="w-full px-3.5 py-2 rounded-xl bg-[#FAF8F5] border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-[#9A3412]"
          />

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 text-xs font-medium text-stone-600 hover:bg-stone-100"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Reset to Default
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#9A3412] hover:bg-orange-900 text-white text-xs font-bold"
            >
              <Check className="w-3.5 h-3.5" />
              {savedSuccess ? 'Saved!' : 'Save Key'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
