import { Card } from "@/components/ui/card";
import { Bot, Brain, Sparkles, Target, Cpu, Zap, Globe, User } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { API_URL } from "@/config/api";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface AISelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  accentColor?: "primary" | "cyan";
  opponentValue?: string; // To grey out already selected model
}

interface AIModel {
  id: string;
  name: string;
  description: string;
  strength: number;
  style: string;
  icon: React.ReactNode;
  color: string;
}

const AI_MODELS: AIModel[] = [
  {
    id: 'human',
    name: 'Human Player',
    description: 'You control the pieces',
    strength: 0,
    style: 'Manual Control',
    icon: <User className="w-4 h-4" />,
    color: 'from-gray-500 to-gray-600'
  },
  {
    id: 'openai_gpt4o_mini',
    name: 'GPT-4o Mini',
    description: 'Efficient and capable AI',
    strength: 2100,
    style: 'Analytical & Precise',
    icon: <Brain className="w-4 h-4" />,
    color: 'from-emerald-500 to-teal-600'
  },
  {
    id: 'anthropic_claude_haiku',
    name: 'Claude Haiku',
    description: 'Fast and intelligent reasoning',
    strength: 1900,
    style: 'Quick & Precise',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'from-violet-500 to-purple-600'
  },
  {
    id: 'openai_gpt35_turbo_instruct',
    name: 'GPT-3.5 Turbo Instruct',
    description: 'Classic instruct model',
    strength: 1500,
    style: 'Instruction-Following',
    icon: <Brain className="w-4 h-4" />,
    color: 'from-blue-500 to-cyan-600'
  },
  {
    id: 'anthropic_claude_sonnet',
    name: 'Claude Sonnet',
    description: 'Most capable with excellent reasoning',
    strength: 2300,
    style: 'Deep & Thoughtful',
    icon: <Sparkles className="w-4 h-4" />,
    color: 'from-purple-500 to-indigo-600'
  },
  {
    id: 'gemini_pro',
    name: 'Gemini 1.5 Pro',
    description: 'Multimodal with strong analytics',
    strength: 2200,
    style: 'Analytical & Creative',
    icon: <Brain className="w-4 h-4" />,
    color: 'from-blue-500 to-purple-600'
  },
  {
    id: 'openai_gpt4o',
    name: 'GPT-4o',
    description: 'Flagship with advanced reasoning',
    strength: 2400,
    style: 'Sophisticated & Strategic',
    icon: <Brain className="w-4 h-4" />,
    color: 'from-emerald-600 to-blue-600'
  },
  {
    id: 'custom_ai_1',
    name: 'Custom AI 1',
    description: 'Custom AI via API',
    strength: 1800,
    style: 'Custom Strategy',
    icon: <Zap className="w-4 h-4" />,
    color: 'from-yellow-500 to-orange-600'
  },
  {
    id: 'custom_ai_2',
    name: 'Custom AI 2',
    description: 'Custom AI via API',
    strength: 1800,
    style: 'Custom Strategy',
    icon: <Globe className="w-4 h-4" />,
    color: 'from-pink-500 to-rose-600'
  },
  {
    id: 'custom_ai_3',
    name: 'Custom AI 3',
    description: 'Custom AI via API',
    strength: 1800,
    style: 'Custom Strategy',
    icon: <Target className="w-4 h-4" />,
    color: 'from-violet-500 to-purple-600'
  }
];

export const AISelector = ({ label, value, onChange, accentColor = "primary", opponentValue }: AISelectorProps) => {
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch(`${API_URL}/models`);
        if (response.ok) {
          const data = await response.json();
          // Filter AI_MODELS to only show available models from backend
          const backendModelIds = Object.keys(data.models).filter(
            (key) => data.models[key] !== null
          );
          // Always include human player, then add available AI models
          const available = AI_MODELS.filter((model) =>
            model.id === 'human' || backendModelIds.includes(model.id)
          );
          setAvailableModels(available);
        }
      } catch (error) {
        console.error("Error fetching AI models:", error);
        // Fallback to showing human and some default models
        const fallbackModels = AI_MODELS.filter(m =>
          m.id === 'human' || ['openai_gpt4o_mini', 'anthropic_claude_haiku', 'openai_gpt35_turbo_instruct'].includes(m.id)
        );
        setAvailableModels(fallbackModels);
      } finally {
        setLoading(false);
      }
    };

    fetchModels();
  }, []);

  const selectedModel = availableModels.find((m) => m.id === value);

  const borderClass = accentColor === "cyan"
    ? "border-accent-cyan/50 shadow-cyan"
    : "border-primary/50 shadow-neon";

  const iconClass = accentColor === "cyan"
    ? "text-accent-cyan"
    : "text-primary";

  return (
    <Card className={`p-6 border ${borderClass} bg-card/50 backdrop-blur-sm transition-smooth hover:border-opacity-100`}>
      <div className="flex items-center gap-3 mb-4">
        <Bot className={`h-6 w-6 ${iconClass}`} />
        <h3 className="text-lg font-semibold text-foreground">{label}</h3>
      </div>

      <div className="relative">
        {/* Selected Model Display */}
        <button
          ref={buttonRef}
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="w-full p-4 border border-border bg-background/50 rounded-lg hover:bg-background/80 transition-all text-left"
        >
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading models...</div>
          ) : selectedModel ? (
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg bg-gradient-to-r",
                selectedModel.color
              )}>
                {selectedModel.icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">{selectedModel.name}</span>
                  {selectedModel.id !== 'human' && (
                    <Badge variant="secondary" className="text-xs">
                      {selectedModel.strength} ELO
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">{selectedModel.description}</div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Select AI Model</div>
          )}
        </button>

        {/* Dropdown Menu - Rendered via Portal */}
        {isOpen && !loading && createPortal(
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-[999998] bg-black/20"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown Content */}
            <div
              className="fixed max-h-[500px] overflow-y-auto bg-popover border-2 border-primary/30 rounded-lg shadow-[0_0_50px_rgba(168,85,247,0.4)] z-[999999]"
              style={{
                top: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().bottom + 8}px` : '0',
                left: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().left}px` : '0',
                width: buttonRef.current ? `${buttonRef.current.getBoundingClientRect().width}px` : 'auto',
              }}
            >
              <div className="p-2 space-y-2">
                {availableModels.map((model) => {
                  const isSelected = model.id === value;
                  const isDisabledByOpponent = opponentValue === model.id && model.id !== 'human';

                  return (
                    <button
                      key={model.id}
                      onClick={() => {
                        if (!isDisabledByOpponent) {
                          onChange(model.id);
                          setIsOpen(false);
                        }
                      }}
                      disabled={isDisabledByOpponent}
                      className={cn(
                        "w-full p-3 rounded-lg transition-all text-left",
                        isSelected
                          ? "bg-primary/20 border border-primary/50"
                          : isDisabledByOpponent
                          ? "opacity-40 cursor-not-allowed bg-muted/20 border border-muted"
                          : "hover:bg-primary/10 border border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg bg-gradient-to-r",
                          model.color,
                          isDisabledByOpponent && "opacity-50"
                        )}>
                          {model.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={cn(
                              "font-medium",
                              isDisabledByOpponent ? "text-muted-foreground" : "text-foreground"
                            )}>
                              {model.name}
                            </span>
                            {model.id !== 'human' && (
                              <Badge variant="secondary" className="text-xs">
                                {model.strength} ELO
                              </Badge>
                            )}
                          </div>
                          <div className={cn(
                            "text-xs mb-1",
                            isDisabledByOpponent ? "text-muted-foreground/60" : "text-muted-foreground"
                          )}>
                            {model.description}
                          </div>
                          <div className="text-xs">
                            <span className={cn(
                              "font-medium",
                              isDisabledByOpponent ? "text-muted-foreground/60" : "text-accent"
                            )}>
                              {model.style}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    </Card>
  );
};
