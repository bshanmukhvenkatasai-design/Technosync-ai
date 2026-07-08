import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/lib/supabaseClient';
import { Sparkles, Mail, Lock, User as UserIcon, AlertCircle, ArrowRight } from 'lucide-react';

const registerSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(6, { message: "Password must be at least 6 characters" }),
  role: z.enum(['Citizen', 'Officer', 'MP', 'Admin'], { 
    required_error: "Please select an account role" 
  }),
});

type RegisterFields = z.infer<typeof registerSchema>;

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'Citizen'
    }
  });

  const onSubmit = async (data: RegisterFields) => {
    setLoading(true);
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: data.role,
          }
        }
      });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      if (authData.user) {
        // Registration successful! Trigger triggers in backend to build profile
        setSuccess(true);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F9F8] flex items-center justify-center p-6 relative overflow-hidden font-inter">
      {/* Decorative blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#7CC6FE]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#96ACA0]/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md bg-white border border-[#DCE5E2] rounded-3xl p-8 shadow-xl relative z-10 space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#2F5D62] to-[#7CC6FE] items-center justify-center text-white shadow-md mb-2">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-[#1F2937] font-poppins">Create account</h2>
          <p className="text-sm text-gray-500">Register a new access role on the planning network</p>
        </div>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
              ✓
            </div>
            <h3 className="text-lg font-bold text-gray-800 font-poppins">Registration Successful!</h3>
            <p className="text-sm text-gray-500">Please check your inbox to confirm your email verification, or sign in directly if auto-confirmation is active.</p>
            <Link 
              to="/login"
              className="inline-block bg-[#2F5D62] text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              Go to Login
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
              
              {/* Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type="text" 
                    required
                    placeholder="e.g. Ramesh Verma"
                    {...register('fullName')}
                    className="w-full bg-gray-50 border border-[#DCE5E2] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#2F5D62] transition"
                  />
                </div>
                {errors.fullName && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.fullName.message}</p>}
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
                  <input 
                    type="email" 
                    required
                    placeholder="you@agency.gov"
                    {...register('email')}
                    className="w-full bg-gray-50 border border-[#DCE5E2] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#2F5D62] transition"
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.email.message}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Password</label>
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

              {/* Role Selection */}
              <div className="space-y-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Access Portal Role</label>
                <select 
                  {...register('role')}
                  className="w-full bg-gray-50 border border-[#DCE5E2] rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#2F5D62] transition cursor-pointer"
                >
                  <option value="Citizen">Citizen Portal Access</option>
                  <option value="Officer">Department Officer Access</option>
                  <option value="MP">Member of Parliament Access</option>
                  <option value="Admin">System Administrator Access</option>
                </select>
                {errors.role && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.role.message}</p>}
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
                  <>
                    <span>Create Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </>
        )}

        {/* Footer Link */}
        <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
          <span>Already have an account? </span>
          <Link to="/login" className="font-semibold text-[#2F5D62] hover:underline">
            Sign In
          </Link>
        </div>

      </div>
    </div>
  );
};

export default Register;
