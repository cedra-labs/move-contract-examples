'use client';

import { Plus, AlertCircle, Clock, FileText, Loader2 } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface CreateTabProps {
  onCreateProposal: (description: string, duration: number) => Promise<void>;
  loading: boolean;
}

export default function CreateTab({ onCreateProposal, loading }: CreateTabProps) {
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(7);
  const [timeUnit, setTimeUnit] = useState<'days' | 'hours' | 'minutes'>('days');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (!description.trim()) {
      setError('Please enter a proposal description');
      return;
    }

    if (description.length < 10) {
      setError('Description must be at least 10 characters');
      return;
    }

    if (description.length > 500) {
      setError('Description must not exceed 500 characters');
      return;
    }

    if (duration < 1) {
      setError(`Duration must be at least 1 ${timeUnit === 'days' ? 'day' : timeUnit === 'hours' ? 'hour' : 'minute'}`);
      return;
    }

    // Validate max duration based on unit
    const maxDurations = { days: 365, hours: 8760, minutes: 525600 }; // 1 year in each unit
    if (duration > maxDurations[timeUnit]) {
      setError(`Duration must not exceed ${maxDurations[timeUnit]} ${timeUnit}`);
      return;
    }

    try {
      setIsSubmitting(true);
      // Convert to seconds based on time unit
      let durationInSeconds = duration;
      if (timeUnit === 'days') {
        durationInSeconds = duration * 24 * 60 * 60;
      } else if (timeUnit === 'hours') {
        durationInSeconds = duration * 60 * 60;
      } else {
        durationInSeconds = duration * 60;
      }

      await onCreateProposal(description, durationInSeconds);
      setSuccess(true);
      toast.success('Proposal created successfully!');
      setDescription('');
      setDuration(7);
      setTimeUnit('days');

      // We clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to create proposal';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // End date based on current time unit calculation
  let durationInSeconds = duration;
  if (timeUnit === 'days') {
    durationInSeconds = duration * 24 * 60 * 60;
  } else if (timeUnit === 'hours') {
    durationInSeconds = duration * 60 * 60;
  } else {
    durationInSeconds = duration * 60;
  }
  const endDate = new Date(Date.now() + durationInSeconds * 1000);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 mb-6">
          <Plus className="w-8 h-8 text-cyan-400" />
        </div>
        <h2 className="text-3xl font-bold text-white mb-4">Create New Proposal</h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Submit a proposal for the community to vote on. All proposals are immutable once created.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass rounded-2xl p-8">
        {/* Error Message         
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3">
            <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span className="text-emerald-400 text-sm">Proposal created successfully!</span>
          </div>
        )}

        {/* Proposal Description */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-white mb-3">
            Proposal Description
            <span className="text-red-400 ml-1">*</span>
          </label>
          <div className="relative">
            <FileText className="absolute left-4 top-4 w-5 h-5 text-gray-400" />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your proposal in detail..."
              rows={6}
              maxLength={500}
              className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all outline-none text-white placeholder:text-gray-500 resize-none"
            />
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-xs text-gray-500">
              Minimum 10 characters, maximum 500 characters
            </p>
            <span
              className={`text-xs font-medium ${
                description.length > 500
                  ? 'text-red-400'
                  : description.length > 400
                  ? 'text-amber-400'
                  : 'text-gray-500'
              }`}
            >
              {description.length}/500
            </span>
          </div>
        </div>

        {/* Voting Duration */}
        <div className="mb-8">
          <label className="block text-sm font-semibold text-white mb-3">
            Voting Duration
            <span className="text-red-400 ml-1">*</span>
          </label>

          {/* Time Unit Selector */}
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => setTimeUnit('days')}
              className={`flex-1 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                timeUnit === 'days'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:border-cyan-500/30'
              }`}
            >
              Days
            </button>
            <button
              type="button"
              onClick={() => setTimeUnit('hours')}
              className={`flex-1 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                timeUnit === 'hours'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:border-cyan-500/30'
              }`}
            >
              Hours
            </button>
            <button
              type="button"
              onClick={() => setTimeUnit('minutes')}
              className={`flex-1 px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                timeUnit === 'minutes'
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50'
                  : 'bg-white/5 text-gray-400 border border-white/10 hover:border-cyan-500/30'
              }`}
            >
              Minutes
            </button>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <input
              type="range"
              min="1"
              max={timeUnit === 'days' ? 30 : timeUnit === 'hours' ? 720 : 1440}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="flex-1 h-2 bg-white/10 rounded-lg appearance-none cursor-pointer"
            />
            <div className="glass-light px-4 py-2 rounded-xl min-w-[120px] text-center">
              <span className="text-xl font-bold text-gradient">{duration}</span>
              <span className="text-sm text-gray-400 ml-2">
                {timeUnit === 'days'
                  ? (duration === 1 ? 'day' : 'days')
                  : timeUnit === 'hours'
                  ? (duration === 1 ? 'hour' : 'hours')
                  : (duration === 1 ? 'minute' : 'minutes')
                }
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Clock className="w-4 h-4" />
            <span>
              Voting will end on{' '}
              <span className="text-white font-medium">
                {endDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </span>
          </div>
        </div>

        {/* Preview Box */}
        {description.trim() && (
          <div className="mb-8 p-6 bg-white/5 rounded-xl border border-white/10">
            <h3 className="text-sm font-semibold text-gray-400 mb-3">Preview</h3>
            <div className="glass-light p-4 rounded-lg">
              <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/10">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-xs text-gray-400">
                  Ends in {duration} {timeUnit === 'days'
                    ? (duration === 1 ? 'day' : 'days')
                    : timeUnit === 'hours'
                    ? (duration === 1 ? 'hour' : 'hours')
                    : (duration === 1 ? 'minute' : 'minutes')
                  }
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || loading || !description.trim()}
          className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Creating Proposal...
            </>
          ) : (
            <>
              <Plus className="w-5 h-5" />
              Create Proposal
            </>
          )}
        </button>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-cyan-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-cyan-400">
              <p className="font-semibold mb-1">Important Notes</p>
              <ul className="space-y-1 text-cyan-400/80">
                <li>• Proposals cannot be edited or deleted once created</li>
                <li>• Voting duration cannot be changed after creation</li>
                <li>• All community members can vote on your proposal</li>
              </ul>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
