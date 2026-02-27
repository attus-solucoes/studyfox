import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

export default function Login() {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { login, signup } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignup) {
      signup(name, email, password);
    } else {
      login(email, password);
    }
    navigate('/home');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="lg:w-1/2 bg-ink p-10 lg:p-14 flex flex-col justify-between min-h-[40vh] lg:min-h-screen"
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🦊</span>
            <span className="font-display font-bold text-[32px] text-lime">StudyOS</span>
          </div>

          <div className="mt-12">
            <h1 className="font-display font-extrabold text-4xl lg:text-[36px] text-paper leading-[1.05]">
              Estude o<br />que importa.<br />Ignore o resto.
            </h1>
            <p className="font-body text-sm text-muted mt-4 max-w-md">
              IA que mapeia o que você sabe, detecta onde você trava, e gera exatamente o que precisa estudar.
            </p>
          </div>
        </div>

        <p className="font-body text-xs text-graphite">247 estudantes ativos</p>
      </motion.div>

      {/* Right Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="lg:w-1/2 bg-paper p-10 lg:p-14 flex items-center justify-center"
      >
        <div className="w-full max-w-sm">
          <span className="font-body text-[10px] text-muted uppercase tracking-widest">
            {isSignup ? 'CRIAR CONTA' : 'ACESSAR CONTA'}
          </span>
          <h2 className="font-display font-bold text-[28px] text-ink mt-1">
            {isSignup ? 'Cadastrar' : 'Entrar'}
          </h2>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {isSignup && (
              <div>
                <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-1 block">Nome</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-white border-[1.5px] border-line rounded-md px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none transition-fast"
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}

            <div>
              <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-1 block">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-white border-[1.5px] border-line rounded-md px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none transition-fast"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="font-body text-[11px] text-muted uppercase tracking-wide mb-1 block">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border-[1.5px] border-line rounded-md px-4 py-3 font-body text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none transition-fast pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-fast"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-ink text-lime font-display font-bold text-sm tracking-wide py-3 rounded-md hover:bg-graphite transition-fast"
            >
              {isSignup ? 'Criar conta →' : 'Entrar →'}
            </button>
          </form>

          <p className="mt-4 text-center font-body text-[13px] text-muted">
            {isSignup ? 'Já tem conta? ' : 'Sem conta? '}
            <button
              onClick={() => setIsSignup(!isSignup)}
              className="text-ink underline hover:text-graphite transition-fast"
            >
              {isSignup ? 'Entrar' : 'Criar grátis'}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
