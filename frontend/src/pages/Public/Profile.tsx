import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { Sparkles, User as UserIcon, Mail, Shield, AlertCircle, Check } from 'lucide-react';

const profileSchema = z.object({
  fullName: z.string().min(2, { message: "Name must be at least 2 characters" }),
});

type ProfileFields = z.infer<typeof profileSchema>;

export const Profile: React.FC = () => {
  const { user, profile, refreshProfile } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ProfileFields>({
    resolver: zodResolver(profileSchema)
  });

  useEffect(() => {
    if (profile) {
      setValue('fullName', profile.full_name);
    }
  }, [profile, setValue]);

  const onSubmit = async (data: ProfileFields) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ full_name: data.fullName })
        .eq('id', user.id);

      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess("Profile name updated successfully.");
        await refreshProfile();
      }
    } catch (err) {
      setError("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-12 px-6 font-inter space-y-6">
      
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold text-[#1F2937] font-poppins">Account Profile</h1>
        <p className="text-sm text-gray-500">Configure your user information and view platform permissions</p>
      </div>

      <div className="bg-white border border-[#DCE5E2] rounded-3xl p-8 shadow-sm space-y-6">
        
        {/* Messages */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl flex items-start space-x-2 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-2xl flex items-start space-x-2 text-sm">
            <Check className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Email (Disabled) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Registered Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input 
                type="email" 
                disabled
                value={profile?.email || user?.email || ''}
                className="w-full bg-gray-100 border border-[#DCE5E2] rounded-xl pl-10 pr-4 py-3 text-sm text-gray-500 focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>

          {/* Role (Disabled) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Account Authorization Role</label>
            <div className="relative">
              <Shield className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input 
                type="text" 
                disabled
                value={profile?.role || 'Citizen'}
                className="w-full bg-gray-100 border border-[#DCE5E2] rounded-xl pl-10 pr-4 py-3 text-sm text-gray-500 focus:outline-none cursor-not-allowed font-semibold"
              />
            </div>
          </div>

          {/* Full Name (Editable) */}
          <div className="space-y-1">
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500">Full Name</label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-gray-400 absolute left-3 top-3.5" />
              <input 
                type="text" 
                required
                placeholder="Ramesh Verma"
                {...register('fullName')}
                className="w-full bg-gray-50 border border-[#DCE5E2] rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:border-[#2F5D62] transition"
              />
            </div>
            {errors.fullName && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.fullName.message}</p>}
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
              <span>Update Profile Info</span>
            )}
          </button>
        </form>

      </div>
    </div>
  );
};

export default Profile;
