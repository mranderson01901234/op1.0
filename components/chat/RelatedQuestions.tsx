'use client';

import { CornerDownRight } from 'lucide-react';

interface RelatedQuestionsProps {
  questions: string[];
  onQuestionClick: (question: string) => void;
}

export default function RelatedQuestions({ questions, onQuestionClick }: RelatedQuestionsProps) {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 pt-6 border-t border-gray-800">
      <h3 className="text-lg font-medium text-white mb-4">Related</h3>
      <div className="space-y-2">
        {questions.map((question, index) => (
          <button
            key={index}
            onClick={() => onQuestionClick(question)}
            className="group flex items-start gap-3 w-full text-left p-3 rounded-lg hover:bg-white/5 transition-colors"
          >
            <CornerDownRight className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-gray-400 group-hover:text-gray-300 transition-colors">
              {question}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
