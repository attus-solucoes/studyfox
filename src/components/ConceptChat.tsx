import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, Send, X, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { callOpenAIProxy } from '@/lib/gemini';
import type { GraphNode, Subject } from '@/types/course';

// ═══════════════════════════════════════════════════════
// STUDYOS — CHAT CONTEXTUAL DO CONCEITO
// ═══════════════════════════════════════════════════════

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ConceptChatProps {
  node: GraphNode;
  subject: Subject;
}

const QUICK_QUESTIONS = [
  'Pode dar um exemplo prático?',
  'Qual é o erro mais comum neste conceito?',
  'Como isso cai na prova?',
];

function buildSystemPrompt(node: GraphNode, subject: Subject): string {
  const parts = [
    `Você é um professor universitário expert na matéria "${subject.name}".`,
    `Responda baseado APENAS neste contexto do conceito "${node.title}":`,
  ];

  if (node.description) parts.push(`\n**Descrição:** ${node.description}`);
  if (node.intuition) parts.push(`\n**Intuição:** ${node.intuition}`);
  if (node.formula) parts.push(`\n**Fórmula:** ${node.formula}`);
  if (node.keyPoints?.length) parts.push(`\n**Pontos-chave:** ${node.keyPoints.join('; ')}`);
  if (node.commonMistakes?.length) parts.push(`\n**Erros comuns:** ${node.commonMistakes.join('; ')}`);

  if (subject.rawText) {
    const excerpt = subject.rawText.slice(0, 3000);
    parts.push(`\n**Material de referência (trecho):**\n${excerpt}`);
  }

  parts.push('\nResponda de forma clara, didática e concisa. Use exemplos quando possível. Se a pergunta fugir do contexto deste conceito, redirecione educadamente.');

  return parts.join('\n');
}

function getStorageKey(nodeId: string) {
  return `studyos_chat_${nodeId}`;
}

export default function ConceptChat({ node, subject }: ConceptChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(getStorageKey(node.id));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Persist to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(getStorageKey(node.id), JSON.stringify(messages));
    }
  }, [messages, node.id]);

  // Auto-scroll
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text.trim() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    try {
      const apiMessages = [
        { role: 'system', content: buildSystemPrompt(node, subject) },
        ...updatedMessages.map(m => ({ role: m.role, content: m.content })),
      ];

      const response = await callOpenAIProxy({
        messages: apiMessages,
        model: 'gpt-4o-mini',
        temperature: 0.7,
        max_tokens: 1024,
      });

      const assistantContent = response?.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.';
      setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
    } catch (err: any) {
      console.error('[ConceptChat] Error:', err);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Erro ao consultar a IA. Tente novamente.' }]);
    } finally {
      setIsLoading(false);
    }
  }, [messages, isLoading, node, subject]);

  const clearChat = () => {
    setMessages([]);
    localStorage.removeItem(getStorageKey(node.id));
  };

  return (
    <>
      {/* Floating button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: 'spring', stiffness: 260, damping: 20 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-foreground text-accent font-display font-bold text-sm px-5 py-3 rounded-full shadow-lg hover:shadow-xl transition-shadow flex items-center gap-2"
      >
        <MessageCircle size={18} />
        Perguntar
      </motion.button>

      {/* Chat Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:w-[400px] sm:max-w-[400px] p-0 flex flex-col bg-background">
          {/* Header */}
          <SheetHeader className="px-5 py-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                <MessageCircle size={16} className="text-accent" />
                Chat · {node.title}
              </SheetTitle>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  className="font-body text-[10px] text-muted-foreground hover:text-foreground transition-colors uppercase tracking-wide"
                >
                  Limpar
                </button>
              )}
            </div>
          </SheetHeader>

          {/* Messages area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <p className="text-2xl mb-3">💬</p>
                <p className="font-body text-sm text-foreground font-semibold">Tire suas dúvidas</p>
                <p className="font-body text-xs text-muted-foreground mt-1">
                  A IA vai responder com base no material deste conceito.
                </p>

                {/* Quick questions */}
                <div className="mt-5 space-y-2">
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      className="w-full text-left font-body text-xs border border-border rounded-lg px-3 py-2.5 hover:border-foreground hover:bg-secondary transition-all duration-150"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-lg px-3.5 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-foreground text-accent font-body text-sm'
                      : 'bg-card border border-border font-body text-sm text-foreground'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-card border border-border rounded-lg px-4 py-3 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-muted-foreground" />
                  <span className="font-body text-xs text-muted-foreground">Consultando material...</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick questions (when there are messages) */}
          {messages.length > 0 && !isLoading && (
            <div className="px-4 pb-2 flex gap-1.5 flex-wrap">
              {QUICK_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="font-body text-[10px] border border-border rounded-full px-2.5 py-1 hover:border-foreground hover:bg-secondary transition-all duration-150 text-muted-foreground"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* Input area */}
          <div className="px-4 pb-4 pt-2 border-t border-border flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Faça uma pergunta..."
                disabled={isLoading}
                className="flex-1 font-body text-sm bg-secondary border border-border rounded-lg px-3 py-2.5 placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="shrink-0 bg-foreground text-accent hover:bg-foreground/90"
              >
                <Send size={16} />
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
