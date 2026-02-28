import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async () => {
    if (password.length < 6) {
      toast.error("Пароль должен содержать минимум 6 символов");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) toast.error(error.message);
    else {
      toast.success("Пароль обновлён!");
      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-16 h-16 gradient-primary rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <Lock className="w-7 h-7 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Новый пароль</h1>
        </div>
        <div className="relative mb-4">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-inactive" />
          <input type="password" placeholder="Новый пароль" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-secondary text-foreground placeholder:text-inactive rounded-xl py-3.5 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all" />
        </div>
        <motion.button whileTap={{ scale: 0.97 }} onClick={handleReset} disabled={loading}
          className="w-full gradient-primary text-primary-foreground rounded-xl py-3.5 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg shadow-primary/25 disabled:opacity-50">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Сохранить пароль"}
        </motion.button>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
