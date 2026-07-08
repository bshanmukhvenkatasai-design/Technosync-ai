import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabaseClient';
import { Sparkles, Lock, AlertCircle } from 'lucide-react';

const resetSchema = z.object({
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"]
});

type ResetFields = z.infer<typeof resetSchema>;

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetFields>({
    resolver: zodResolver(resetSchema)
  });

  const onSubmit = async (data: ResetFields) => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.password
      });

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] flex items-center justify-center p-6 relative overflow-hidden font-inter">
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#7CC6FE]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#96ACA0]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-[#DCE5E2] rounded-3xl p-8 shadow-xl relative z-10 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2F5D62] to-[#7CC6FE] items-center justify-center text-white shadow-md mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#1F2937] font-poppins">Reset password</h2>
          <p className="text-sm text-gray-500">Configure your new secure account password</p>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-gray-800 font-poppins">Password Restored</h3>
            <p className="text-sm text-gray-500">Your credentials have been successfully updated.</p>
            <Link 
              to="/login"
              className="inline-block bg-[#2F5D62] text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              Sign In
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start space-x-2 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              
              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">New Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    {...register('password')}
                    className="w-full bg-gray-50 border border-[#DCE5E2] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#2F5D62] transition"
                  />
                </div>
                {errors.password && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.password.message}</p>}
              </div>

              {/* Confirm Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type="password" 
                    required
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                    className="w-full bg-gray-50 border border-[#DCE5E2] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#2F5D62] transition"
                  />
                </div>
                {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.confirmPassword.message}</p>}
              </div>

              {/* Submit */}
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#2F5D62] hover:bg-[#2F5D62]/95 disabled:bg-gray-300 text-white font-semibold py-3.5 rounded-xl shadow-md transition duration-300 flex items-center justify-center space-x-2"
              >
                {loading ? (
                  <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                ) : (
                  <span>Update Password</span>
                )}
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
};

export default ResetPassword;
