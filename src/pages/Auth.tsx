import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Loader2, AtSign } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const { signIn, signUp, resetPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (loading) return;
    setLoading(true);

    if (showReset) {
      const { error } = await resetPassword(email);
      if (error) toast.error(error);
      else toast.success("Письмо для сброса пароля отправлено!");
      setLoading(false);
      setShowReset(false);
      return;
    }

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error);
      } else {
        navigate("/");
      }
    } else {
      if (!username.trim() || username.length < 3) {
        toast.error("Username должен содержать минимум 3 символа");
        setLoading(false);
        return;
      }
      if (password.length < 6) {
        toast.error("Пароль должен содержать минимум 6 символов");
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, username.trim(), displayName.trim() || username.trim());
      if (error) {
        toast.error(error);
      } else {
        toast.success("Проверьте email для подтверждения!");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="text-center mb-10">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.6, type: "spring" }}
            className="w-20 h-20 gradient-primary rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-lg shadow-primary/30"
          >
            <span className="text-3xl font-bold text-primary-foreground">V</span>
          </motion.div>
          <h1 className="text-2xl font-bold text-foreground">Vortex</h1>
          <p className="text-muted-foreground text-sm mt-1">Премиальный мессенджер</p>
        </div>

        {showReset ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground text-center">Сброс пароля</h2>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inactive" />
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-secondary text-foreground placeholder:text-inactive rounded-xl py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
            </div>
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading}
              className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Отправить"}
            </motion.button>
            <button onClick={() => setShowReset(false)} className="text-sm text-primary hover:underline w-full text-center">
              Назад к входу
            </button>
          </motion.div>
        ) : (
          <>
            <div className="flex bg-secondary rounded-xl p-1 mb-8">
              <button onClick={() => setIsLogin(true)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${isLogin ? "gradient-primary text-primary-foreground shadow-lg" : "text-muted-foreground"}`}>
                Вход
              </button>
              <button onClick={() => setIsLogin(false)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${!isLogin ? "gradient-primary text-primary-foreground shadow-lg" : "text-muted-foreground"}`}>
                Регистрация
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div key={isLogin ? "login" : "register"} initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
                transition={{ duration: 0.25 }} className="space-y-4">
                
                {!isLogin && (
                  <>
                    <div className="relative">
                      <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inactive" />
                      <input type="text" placeholder="Username (уникальный)" value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        className="w-full bg-secondary text-foreground placeholder:text-inactive rounded-xl py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                    </div>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inactive" />
                      <input type="text" placeholder="Имя" value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-secondary text-foreground placeholder:text-inactive rounded-xl py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                    </div>
                  </>
                )}

                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inactive" />
                  <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-secondary text-foreground placeholder:text-inactive rounded-xl py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                </div>

                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inactive" />
                  <input type={showPassword ? "text" : "password"} placeholder="Пароль" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="w-full bg-secondary text-foreground placeholder:text-inactive rounded-xl py-3.5 pl-12 pr-12 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
                  <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-inactive">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                {isLogin && (
                  <button onClick={() => setShowReset(true)} className="text-sm text-primary hover:underline ml-1">
                    Забыли пароль?
                  </button>
                )}

                <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={loading}
                  className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 mt-2 disabled:opacity-50">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>{isLogin ? "Войти" : "Создать аккаунт"}<ArrowRight className="w-4 h-4" /></>
                  )}
                </motion.button>
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default Auth;
