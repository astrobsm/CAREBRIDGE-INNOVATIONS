import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, LogIn, Heart, Stethoscope } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../../../contexts/AuthContext';
import { childLogin } from '../../../services/childAuth';

type Portal = 'astro' | 'family';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [portal, setPortal] = useState<Portal>('astro');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Child portal state
  const [childUsername, setChildUsername] = useState('');
  const [childPin, setChildPin] = useState('');
  const [showPin, setShowPin] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onAstroSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const success = await login(data.email, data.password);
      if (success) toast.success('Welcome back!');
      else toast.error('Invalid email or password');
    } catch {
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const onChildSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const res = await childLogin(childUsername, childPin);
    setIsLoading(false);
    if (!res.ok) { toast.error(res.error); return; }
    toast.success(`Welcome, ${res.session.first_name}!`);
    navigate('/family/me', { replace: true });
  };

  return (
    <div>
      {/* Mobile Logo */}
      <div className="lg:hidden text-center mb-8">
        <img
          src="/icons/logo.png"
          alt="AstroHEALTH"
          className="w-20 h-20 mx-auto mb-4 rounded-2xl object-contain"
        />
        <h1 className="text-2xl font-bold text-gray-900">AstroHEALTH</h1>
        <p className="text-gray-500">Surgical EMR + Family</p>
      </div>

      <div className="card p-8">
        {/* Portal toggle */}
        <div className="grid grid-cols-2 gap-2 p-1 mb-6 bg-gray-100 rounded-lg">
          <button
            type="button"
            onClick={() => setPortal('astro')}
            className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
              portal === 'astro' ? 'bg-white text-sky-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Stethoscope size={16}/> AstroHEALTH
          </button>
          <button
            type="button"
            onClick={() => setPortal('family')}
            className={`flex items-center justify-center gap-2 py-2 rounded-md text-sm font-medium transition ${
              portal === 'family' ? 'bg-white text-pink-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Heart size={16}/> Family (child)
          </button>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            {portal === 'astro' ? 'Welcome back' : 'Hi there!'}
          </h2>
          <p className="text-gray-600 mt-1">
            {portal === 'astro'
              ? 'Sign in to your clinical account to continue'
              : 'Sign in with the username and PIN your parent gave you'}
          </p>
        </div>

        {portal === 'astro' ? (
          <form onSubmit={handleSubmit(onAstroSubmit)} className="space-y-6">
            <div>
              <label htmlFor="email" className="label">Email Address</label>
              <input
                {...register('email')}
                type="email"
                id="email"
                autoComplete="email"
                className={`input ${errors.email ? 'input-error' : ''}`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500 mt-1">
                  {errors.email.message}
                </motion.p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  autoComplete="current-password"
                  className={`input pr-10 ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 min-w-touch min-h-touch flex items-center justify-center"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && (
                <motion.p initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-sm text-red-500 mt-1">
                  {errors.password.message}
                </motion.p>
              )}
            </div>

            <div className="flex flex-col xs:flex-row xs:items-center xs:justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer min-h-touch">
                <input type="checkbox" className="w-5 h-5 rounded border-gray-300 text-sky-500 focus:ring-sky-500"/>
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <a href="#" className="text-sm text-sky-600 hover:text-sky-700 font-medium min-h-touch flex items-center">Forgot password?</a>
            </div>

            <button type="submit" disabled={isLoading} className="btn btn-primary w-full">
              {isLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"/>
              ) : (
                <><LogIn size={18}/> Sign In</>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={onChildSubmit} className="space-y-6">
            <div>
              <label htmlFor="child-username" className="label">Username</label>
              <input
                id="child-username"
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="username"
                className="input"
                placeholder="e.g. chioma2015"
                value={childUsername}
                onChange={(e) => setChildUsername(e.target.value)}
                required
              />
            </div>
            <div>
              <label htmlFor="child-pin" className="label">PIN</label>
              <div className="relative">
                <input
                  id="child-pin"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  autoComplete="current-password"
                  className="input pr-10 tracking-widest"
                  placeholder="4–8 digits"
                  value={childPin}
                  onChange={(e) => setChildPin(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-2 min-w-touch min-h-touch flex items-center justify-center"
                >
                  {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} className="btn w-full inline-flex items-center justify-center gap-2 bg-pink-600 text-white hover:bg-pink-700 disabled:opacity-60 py-2.5 rounded-md font-medium">
              {isLoading ? (
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"/>
              ) : (
                <><Heart size={18}/> Sign in to Family</>
              )}
            </button>
            <p className="text-xs text-center text-gray-500">
              Don't have a username yet? Ask your parent to enable login from <span className="font-medium">Family → Children</span> in their AstroHEALTH account.
            </p>
          </form>
        )}

        {portal === 'astro' && (
          <p className="text-center text-gray-600 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-sky-600 hover:text-sky-700 font-medium">Create one</Link>
          </p>
        )}
      </div>
    </div>
  );
}
