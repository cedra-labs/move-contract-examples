import React, { useState, useEffect } from 'react';
import { ArrowLeft, Upload, Plus, X, Sparkles, Shield, Settings, DollarSign, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useWallet } from '../contexts/CedraWalletProvider';
import { useCreateDAO, useCheckSubnameAvailability } from '../useServices/useDAOCore';
import { useAlert } from './alert/AlertContext';
import { uploadToPinata } from '../services/pinataService';
import { cedraClient } from '../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../cedra_service/constants';

interface CreateDAOProps {
  onBack: () => void;
}

const CreateDAO: React.FC<CreateDAOProps> = ({ onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    subname: '',
    description: '',
    chain: 'cedra',
    minimumStake: '6',
    logo: null as File | null,
    background: null as File | null,
    logoUrl: '',
    backgroundUrl: '',
    useUrls: false,
    xLink: '',
    discordLink: '',
    telegramLink: '',
    website: '',
    category: ''
  });

  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactionHash, setTransactionHash] = useState('');
  const { showAlert } = useAlert();
  const [showSuccessModal, setShowSuccessModal] = useState<null | { title: string; message: string }>(null);

  // Removed preview success helper

  // Wallet and blockchain integration
  const { account } = useWallet();
  const { createDAO, createDAOWithUrls, testMinimalTransaction, isPending: isDAOPending, error: daoError } = useCreateDAO();
  const { checkSubname, isPending: isCheckingSubname } = useCheckSubnameAvailability();

  // Validate subname availability
  const validateSubname = async (subname: string): Promise<string | null> => {
    if (!subname.trim()) return 'Subname is required';
    if (subname.length < 3) return 'Subname must be at least 3 characters';
    if (subname.length > 50) return 'Subname must be less than 50 characters';

    // Check if subname contains only allowed characters (letters, numbers, hyphens)
    if (!/^[a-zA-Z0-9-]+$/.test(subname)) {
      return 'Subname can only contain letters, numbers, and hyphens';
    }

    try {
      const result = await checkSubname(subname);
      if (!result.isAvailable) {
        return `Subname "${subname}" is already taken. Please choose another one.`;
      }
      return null;
    } catch (error) {
      console.warn('Failed to check subname availability:', error);
      return 'Unable to verify subname availability. Please try again.';
    }
  };

  const steps = [
    { id: 1, title: 'Basic Info', icon: Sparkles },
    { id: 2, title: 'Governance', icon: Settings },
    { id: 3, title: 'Review', icon: Shield },
  ];

  // Aggressive but quality-preserving compression for blockchain storage
  const compressImage = (file: File, maxSizeKB: number, quality: number = 0.9, mimeOverride?: string): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      (img as any).decoding = 'async';
      
      img.onload = async () => {
        const isLogoGuess = maxSizeKB <= 100; // More aggressive detection
        
        // Original dimensions for good quality
        // Logos: crisp for UI display
        // Backgrounds: high quality for visual impact
        const targetMaxWidth = isLogoGuess ? 512 : 1400;
        const targetMaxHeight = isLogoGuess ? 512 : 900;

        const scale = Math.min(
          targetMaxWidth / img.width,
          targetMaxHeight / img.height,
          1
        );

        const width = Math.round(img.width * scale);
        const height = Math.round(img.height * scale);

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }
        
        // Enhanced rendering for better quality at smaller sizes
        ctx.imageSmoothingEnabled = true;
        // @ts-ignore: browser-specific property
        ctx.imageSmoothingQuality = 'high';
        
        // Apply sharpening filter for logos to maintain crispness
        if (isLogoGuess && scale < 0.8) {
          ctx.filter = 'contrast(1.1) brightness(1.02)';
        }
        
        // Pre-filter for crisp downscaling
        if (scale < 0.5) {
          // Two-pass downscaling for better quality
          const tempCanvas = document.createElement('canvas');
          const tempScale = Math.max(scale * 2, 0.5);
          tempCanvas.width = Math.round(img.width * tempScale);
          tempCanvas.height = Math.round(img.height * tempScale);
          const tempCtx = tempCanvas.getContext('2d');
          if (tempCtx) {
            tempCtx.imageSmoothingEnabled = true;
            // @ts-ignore
            tempCtx.imageSmoothingQuality = 'high';
            tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height);
            ctx.drawImage(tempCanvas, 0, 0, width, height);
          } else {
            ctx.drawImage(img, 0, 0, width, height);
          }
        } else {
          ctx.drawImage(img, 0, 0, width, height);
        }

        const targetBytes = maxSizeKB * 1024;
        // Original quality steps for good compression
        const qualities = [quality, 0.95, 0.92, 0.9, 0.88, 0.86, 0.84, 0.8];

        const nativeType = (file.type || '').toLowerCase();
        // Smart format selection: JPEG for photos, PNG for graphics with transparency
        const hasTransparency = nativeType.includes('png') && isLogoGuess;
        const outputMime = mimeOverride || (hasTransparency ? 'image/png' : 'image/jpeg');

        const toBlobWithQuality = (q: number) => new Promise<Blob | null>((res) => {
          canvas.toBlob(res, outputMime, outputMime === 'image/png' ? undefined : q);
        });

        for (let i = 0; i < qualities.length; i++) {
          const q = qualities[i];
          const blob = await toBlobWithQuality(q);
          if (blob) {
            if (blob.size <= targetBytes || i === qualities.length - 1) {
              const compressedFile = new File(
                [blob],
                outputMime === 'image/png'
                  ? file.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '.png')
                  : file.name.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '.jpg'),
                { type: outputMime, lastModified: Date.now() }
              );

              resolve(compressedFile);
              return;
            }
          }
        }

        // Fallback to original if something went wrong
        resolve(file);
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  // Light compression for good quality (original working settings)
  const shouldCompress = (file: File, type: 'logo' | 'background'): boolean => {
    const sizeKB = file.size / 1024;
    if (type === 'logo') {
      return sizeKB > 300; // only compress logos >300KB
    }
    return sizeKB > 800; // only compress backgrounds >800KB
  };

  const optimizeImage = async (file: File, type: 'logo' | 'background'): Promise<File> => {
    if (!shouldCompress(file, type)) {
      return file;
    }
    // Original working compression targets
    const targetKB = type === 'logo' ? 400 : 600; // Higher quality targets
    const outputMime = type === 'logo' && (file.type.includes('png') || file.type.includes('webp'))
      ? 'image/png'
      : 'image/jpeg';
    return compressImage(file, targetKB, 0.9, outputMime); // Higher starting quality
  };

  const handleFileUpload = async (file: File, type: 'logo' | 'background') => {
    if (file.size > 10 * 1024 * 1024) { // 10MB absolute limit
      setErrors({...errors, [type]: 'File size must be less than 10MB'});
      return;
    }

    if (!file.type.startsWith('image/')) {
      setErrors({...errors, [type]: 'File must be an image'});
      return;
    }

    // Upload to Pinata IPFS - stay in upload mode, just store IPFS URL internally
    try {
      showAlert(`Uploading ${type} to IPFS...`, 'info');

      const result = await uploadToPinata(file);

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Store IPFS URL in the corresponding URL field, but DON'T switch modes
      const urlField = type === 'logo' ? 'logoUrl' : 'backgroundUrl';
      setFormData({
        ...formData,
        [type]: file,  // Keep the file reference for display
        [urlField]: result.ipfsUrl  // Store IPFS URL internally
        // useUrls stays false - we're still in upload mode
      });

      setErrors({...errors, [type]: ''});
      showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded to IPFS successfully!`, 'success');

    } catch (error) {
      console.error(`Failed to upload ${type}:`, error);
      setErrors({...errors, [type]: `Failed to upload to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`});
      showAlert(`Failed to upload ${type} to IPFS`, 'error');
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: {[key: string]: string} = {};

    switch (step) {
      case 1:
        if (!formData.name.trim()) newErrors.name = 'DAO name is required';
        if (formData.name.trim().length < 3) newErrors.name = 'DAO name must be at least 3 characters';
        if (formData.name.length > 50) newErrors.name = 'DAO name must be less than 50 characters';
        if (!formData.subname.trim()) newErrors.subname = 'DAO subname is required';
        if (formData.subname.length > 20) newErrors.subname = 'DAO subname must be less than 20 characters';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (formData.description.trim().length < 10) newErrors.description = 'Description must be at least 10 characters';
        if (formData.description.length > 500) newErrors.description = 'Description must be less than 500 characters';

        // Validate images based on mode
        if (formData.useUrls) {
          // URL mode - require manual URL inputs
          if (!formData.logoUrl.trim()) newErrors.logoUrl = 'Logo URL is required';
          if (!formData.backgroundUrl.trim()) newErrors.backgroundUrl = 'Background URL is required';
          // Basic URL validation
          try {
            if (formData.logoUrl) new URL(formData.logoUrl);
          } catch { newErrors.logoUrl = 'Invalid logo URL format'; }
          try {
            if (formData.backgroundUrl) new URL(formData.backgroundUrl);
          } catch { newErrors.backgroundUrl = 'Invalid background URL format'; }
        } else {
          // Upload mode - require either files uploaded or IPFS URLs from uploads
          if (!formData.logo && !formData.logoUrl) newErrors.logo = 'Logo is required';
          if (!formData.background && !formData.backgroundUrl) newErrors.background = 'Background is required';
        }
        break;

      case 2:
        const minStake = parseFloat(formData.minimumStake || '6');
        if (isNaN(minStake) || minStake < 6 || minStake > 10000) {
          newErrors.minimumStake = 'Minimum stake must be between 6 and 10,000 CEDRA tokens';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Removed test transaction feature

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep(3)) return;

    if (!account) {
      showAlert('Please connect your wallet to create a DAO', 'error');
      setErrors({...errors, submit: 'Please connect your wallet to create a DAO'});
      return;
    }

    // Validate subname availability before submitting
    const subnameError = await validateSubname(formData.subname);
    if (subnameError) {
      showAlert(subnameError, 'error');
      setErrors({...errors, subname: subnameError});
      setCurrentStep(1); // Go back to step 1 to fix subname
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setTransactionHash('');

    try {
      // Check if using URL mode or if files were uploaded to IPFS
      // If logoUrl or backgroundUrl exist, use URL-based creation regardless of mode
      const hasUploadedFiles = formData.logoUrl || formData.backgroundUrl;

      if (formData.useUrls || hasUploadedFiles) {
        // URL-based creation - much faster!
        // Uses IPFS URLs from either manual URL input or file uploads

        const createDAOParams = {
          name: formData.name.trim(),
          subname: formData.subname.trim(),
          description: formData.description.trim(),
          logoUrl: formData.logoUrl.trim(),
          backgroundUrl: formData.backgroundUrl.trim(),
          minStakeToJoin: Math.round(parseFloat(formData.minimumStake || '6') * 1000000),
          xLink: formData.xLink.trim(),
          discordLink: formData.discordLink.trim(),
          telegramLink: formData.telegramLink.trim(),
          website: formData.website.trim(),
          category: formData.category.trim()
        };


        const result = await createDAOWithUrls(createDAOParams);

        // Extract transaction hash
        let txHash = ''
        if (result && typeof result === 'object') {
          if ('hash' in result) {
            txHash = String(result.hash)
          }
        }

        if (txHash) {
          setTransactionHash(txHash)
        }

        setShowSuccessModal({
          title: 'DAO Created Successfully!',
          message: `"${formData.name}" has been created on Cedra blockchain. It may take 1-2 minutes to appear in the DAO list while the indexer processes your transaction.`,
        });

        // Optimistically broadcast a lightweight DAO object so list updates instantly
        try {
          const optimisticDao = {
            id: account.address,
            name: formData.name.trim(),
            description: formData.description.trim(),
            image: formData.logoUrl.trim(),
            background: formData.backgroundUrl.trim(),
            subname: formData.subname.trim(),
            chain: formData.subname.trim() || 'Cedra',
            tokenName: formData.subname.trim() || 'DAO',
            tokenSymbol: formData.subname.trim() || 'DAO',
            tvl: '0',
            proposals: 0,
            members: 0,
            established: new Date().toLocaleString(),
            category: 'featured',
            isFollowing: false,
          } as any
          window.dispatchEvent(new CustomEvent('dao:created', { detail: optimisticDao }))
        } catch {}
        
      } else {
        // Binary creation mode
      
      // Ensure images are under on-chain limits (logo ≤ 1MB, background ≤ 5MB)
      const ensureImageLimit = async (file: File | null, limitBytes: number, type: 'logo' | 'background'): Promise<number[]> => {
        if (!file) return [];
        let current = file;
        let bytes = await fileToBytes(current);
        if (bytes.length <= limitBytes) return bytes;
        // Retry with much stronger optimization if over limit
        const fallback = await compressImage(current, type === 'logo' ? 60 : 80, 0.7);
        bytes = await fileToBytes(fallback);
        if (bytes.length <= limitBytes) return bytes;
        // Last resort: ultra compression
        const ultraFallback = await compressImage(current, type === 'logo' ? 40 : 60, 0.5);
        bytes = await fileToBytes(ultraFallback);
        if (bytes.length <= limitBytes) return bytes;
        throw new Error(`${type} image is too large after maximum compression (${(bytes.length/1024).toFixed(0)}KB). Please use a smaller or simpler image.`);
      };

      const logoBytes = await ensureImageLimit(formData.logo, 1_048_576, 'logo');
      const backgroundBytes = await ensureImageLimit(formData.background, 5_242_880, 'background');

      const createDAOParams = {
        name: formData.name.trim(),
        subname: formData.subname.trim(),
        description: formData.description.trim(),
        logo: new Uint8Array(logoBytes),
        background: new Uint8Array(backgroundBytes),
        minStakeToJoin: Math.round(parseFloat(formData.minimumStake || '6') * 1000000),
        xLink: formData.xLink.trim(),
        discordLink: formData.discordLink.trim(),
        telegramLink: formData.telegramLink.trim(),
        website: formData.website.trim(),
        category: formData.category.trim()
      };

        const result = await createDAO(createDAOParams);
      
      
      // Extract transaction hash from different wallet response formats
      let txHash = ''
      if (result && typeof result === 'object') {
        if ('hash' in result) {
          txHash = String(result.hash)
        } else if ('args' in result && result.args && typeof result.args === 'object' && 'hash' in result.args) {
          txHash = String(result.args.hash)
        } else if ('data' in result && result.data && typeof result.data === 'object' && 'hash' in result.data) {
          txHash = String(result.data.hash)
        }
      }
      
      if (txHash) {
        setTransactionHash(txHash)
      }

        setShowSuccessModal({
          title: 'DAO Created Successfully!',
          message: `"${formData.name}" has been created on Cedra blockchain. It may take 1-2 minutes to appear in the DAO list while the indexer processes your transaction.`,
        });

        // Optimistic broadcast for binary mode as well (no URLs available; images will resolve after refetch)
        try {
          const optimisticDao = {
            id: account.address,
            name: formData.name.trim(),
            description: formData.description.trim(),
            image: '',
            background: '',
            subname: formData.subname.trim(),
            chain: formData.subname.trim() || 'Cedra',
            tokenName: formData.subname.trim() || 'DAO',
            tokenSymbol: formData.subname.trim() || 'DAO',
            tvl: '0',
            proposals: 0,
            members: 0,
            established: new Date().toLocaleString(),
            category: 'featured',
            isFollowing: false,
          } as any
          window.dispatchEvent(new CustomEvent('dao:created', { detail: optimisticDao }))
        } catch {}
      }
      
      // Reset form after successful creation
      setTimeout(() => {
        setFormData({
          name: '',
          subname: '',
          description: '',
          chain: 'cedra',
          minimumStake: '6',
          logo: null,
          background: null,
          logoUrl: '',
          backgroundUrl: '',
          useUrls: false,
          xLink: '',
          discordLink: '',
          telegramLink: '',
          website: '',
          category: ''
        });
        setCurrentStep(1);
      }, 3000);
      
    } catch (error) {
      console.error(' Failed to create DAO:', error);
      const errorMsg = `Failed to create DAO: ${error instanceof Error ? error.message : 'Unknown error'}`;
      showAlert(errorMsg, 'error');
      setErrors({
        ...errors, 
        submit: errorMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const fileToBytes = (file: File): Promise<number[]> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        const bytes = Array.from(new Uint8Array(arrayBuffer));
        resolve(bytes);
      };
      reader.readAsArrayBuffer(file);
    });
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="professional-card rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                <span>DAO Identity</span>
              </h3>
              
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      DAO Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className={`professional-input w-full px-4 py-3 rounded-xl ${errors.name ? 'border-red-500' : ''}`}
                      placeholder="Enter your DAO name (max 50 characters)"
                      maxLength={50}
                    />
                    {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      DAO Subname *
                    </label>
                    <input
                      type="text"
                      value={formData.subname}
                      onChange={(e) => setFormData({...formData, subname: e.target.value})}
                      className={`professional-input w-full px-4 py-3 rounded-xl ${errors.subname ? 'border-red-500' : ''}`}
                      placeholder="Short identifier (max 20 characters)"
                      maxLength={20}
                    />
                    {errors.subname && <p className="text-red-400 text-sm mt-1">{errors.subname}</p>}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={4}
                    maxLength={500}
                    className={`professional-input w-full px-4 py-3 rounded-xl ${errors.description ? 'border-red-500' : ''}`}
                    placeholder="Describe your DAO's mission, goals, and community focus (max 500 characters)"
                  />
                  <div className="flex justify-between mt-1">
                    {errors.description && <p className="text-red-400 text-sm">{errors.description}</p>}
                    <p className="text-gray-500 text-sm ml-auto">{formData.description.length}/500</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category (Optional)
                  </label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="professional-input w-full px-4 py-3 rounded-xl"
                    placeholder="e.g., DeFi, NFT, Gaming, Social, etc."
                  />
                  <p className="text-gray-500 text-sm mt-1">Enter the category that best describes your DAO</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Social Links (Optional)
                  </label>
                  <div className="space-y-3">
                    <input
                      type="url"
                      value={formData.xLink}
                      onChange={(e) => setFormData({...formData, xLink: e.target.value})}
                      className="professional-input w-full px-4 py-3 rounded-xl"
                      placeholder="X (Twitter) URL - https://x.com/yourDAO"
                    />
                    <input
                      type="url"
                      value={formData.discordLink}
                      onChange={(e) => setFormData({...formData, discordLink: e.target.value})}
                      className="professional-input w-full px-4 py-3 rounded-xl"
                      placeholder="Discord URL - https://discord.gg/yourDAO"
                    />
                    <input
                      type="url"
                      value={formData.telegramLink}
                      onChange={(e) => setFormData({...formData, telegramLink: e.target.value})}
                      className="professional-input w-full px-4 py-3 rounded-xl"
                      placeholder="Telegram URL - https://t.me/yourDAO"
                    />
                    <input
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData({...formData, website: e.target.value})}
                      className="professional-input w-full px-4 py-3 rounded-xl"
                      placeholder="Website URL - https://yourdao.com"
                    />
                  </div>
                  <p className="text-gray-500 text-sm mt-1">Add social media links and website for your DAO</p>
                </div>
                
                <div className="grid grid-cols-1 gap-6">
                  {/* Image Mode Toggle */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Image Mode
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={!formData.useUrls}
                          onChange={() => setFormData({...formData, useUrls: false})}
                          className="text-indigo-500"
                        />
                        <span className="text-gray-300">Upload Files (Compressed)</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          checked={formData.useUrls}
                          onChange={() => setFormData({...formData, useUrls: true})}
                          className="text-indigo-500"
                        />
                        <span className="text-gray-300">Use URLs (Faster)</span>
                      </label>
                    </div>
                    <p className="text-gray-500 text-sm mt-1">
                      {formData.useUrls ? 'Use image URLs for faster creation with lower gas costs' : 'Upload files for on-chain storage (higher gas costs)'}
                    </p>
                  </div>
                  
                  {formData.useUrls ? (
                    // URL input mode
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Logo URL *
                        </label>
                        <input
                          type="url"
                          value={formData.logoUrl}
                          onChange={(e) => setFormData({...formData, logoUrl: e.target.value})}
                          className={`professional-input w-full px-4 py-3 rounded-xl ${errors.logoUrl ? 'border-red-500' : ''}`}
                          placeholder="https://example.com/logo.png"
                        />
                        {errors.logoUrl && <p className="text-red-400 text-sm mt-1">{errors.logoUrl}</p>}
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Background URL *
                        </label>
                        <input
                          type="url"
                          value={formData.backgroundUrl}
                          onChange={(e) => setFormData({...formData, backgroundUrl: e.target.value})}
                          className={`professional-input w-full px-4 py-3 rounded-xl ${errors.backgroundUrl ? 'border-red-500' : ''}`}
                          placeholder="https://example.com/background.jpg"
                        />
                        {errors.backgroundUrl && <p className="text-red-400 text-sm mt-1">{errors.backgroundUrl}</p>}
                      </div>
                    </>
                  ) : (
                    // File upload mode - Now uploads to IPFS automatically
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          DAO Logo
                        </label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center hover:border-indigo-500/50 transition-colors cursor-pointer ${formData.logo ? 'border-green-500/50 bg-green-500/10' : 'border-white/20'}`}
                      onClick={() => document.getElementById('logo-upload')?.click()}
                    >
                      {formData.logo && formData.logoUrl ? (
                        <>
                          <img src={formData.logoUrl} alt="Logo preview" className="w-20 h-20 object-cover mx-auto mb-2 rounded-lg" />
                          <p className="text-green-300 text-xs sm:text-sm mb-1">✓ {formData.logo.name}</p>
                          <p className="text-xs text-gray-500">Uploaded to IPFS</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-300 text-xs sm:text-sm mb-1">Upload DAO logo</p>
                          <p className="text-xs text-gray-500">Will be uploaded to IPFS</p>
                        </>
                      )}
                    </div>
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'logo');
                      }}
                    />
                    {errors.logo && <p className="text-red-400 text-sm mt-1">{errors.logo}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Background Image
                    </label>
                    <div
                      className={`border-2 border-dashed rounded-xl p-4 sm:p-6 text-center hover:border-indigo-500/50 transition-colors cursor-pointer ${formData.background ? 'border-green-500/50 bg-green-500/10' : 'border-white/20'}`}
                      onClick={() => document.getElementById('background-upload')?.click()}
                    >
                      {formData.background && formData.backgroundUrl ? (
                        <>
                          <img src={formData.backgroundUrl} alt="Background preview" className="w-full h-24 object-cover mx-auto mb-2 rounded-lg" />
                          <p className="text-green-300 text-xs sm:text-sm mb-1">✓ {formData.background.name}</p>
                          <p className="text-xs text-gray-500">Uploaded to IPFS</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-300 text-xs sm:text-sm mb-1">Upload background</p>
                          <p className="text-xs text-gray-500">Will be uploaded to IPFS</p>
                        </>
                      )}
                    </div>
                    <input
                      id="background-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'background');
                      }}
                    />
                        {errors.background && <p className="text-red-400 text-sm mt-1">{errors.background}</p>}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      
      case 2:
        return (
          <div className="space-y-6">
            <div className="professional-card rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <Settings className="w-5 h-5 text-purple-400" />
                <span>Governance Settings</span>
              </h3>
              
              <div className="max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <DollarSign className="w-4 h-4 inline mr-1" />
                    Minimum Stake to Join (CEDRA tokens) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="6"
                      max="10000"
                      step="1"
                      value={formData.minimumStake}
                      onChange={(e) => setFormData({...formData, minimumStake: e.target.value})}
                      className={`professional-input w-full px-4 py-3 rounded-xl ${errors.minimumStake ? 'border-red-500' : ''}`}
                      placeholder="6"
                    />
                  </div>
                  {errors.minimumStake && <p className="text-red-400 text-sm mt-1">{errors.minimumStake}</p>}
                  <p className="text-gray-500 text-sm mt-1">Members must stake at least 6 CEDRA tokens to join the DAO</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                <p className="text-purple-300 text-sm">
                  <strong>Governance Overview:</strong> The minimum stake requirement helps prevent spam and ensures committed members. 
                  6 CEDRA tokens is the minimum required by the protocol. Additional governance settings like voting periods 
                  will be configured automatically with sensible defaults. You can modify these later through governance proposals.
                </p>
              </div>
            </div>
          </div>
        );
        
      case 3:
        return (
          <div className="space-y-6">
            <div className="professional-card rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
                <Shield className="w-5 h-5 text-green-400" />
                <span>Review & Create DAO</span>
              </h3>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-400">Name:</span> <span className="text-white">{formData.name}</span></p>
                        <p><span className="text-gray-400">Subname:</span> <span className="text-white">{formData.subname}</span></p>
                        <p><span className="text-gray-400">Description:</span> <span className="text-white">{formData.description.substring(0, 100)}{formData.description.length > 100 ? '...' : ''}</span></p>
                        <p><span className="text-gray-400">Category:</span> <span className="text-white">{formData.category}</span></p>
                        <p><span className="text-gray-400">Image Mode:</span> <span className="text-white">{formData.useUrls ? 'URLs (Fast)' : 'Uploaded Files'}</span></p>
                        {formData.useUrls ? (
                          <>
                            <p><span className="text-gray-400">Logo URL:</span> <span className="text-white text-sm">{formData.logoUrl || 'Not provided'}</span></p>
                            <p><span className="text-gray-400">Background URL:</span> <span className="text-white text-sm">{formData.backgroundUrl || 'Not provided'}</span></p>
                          </>
                        ) : (
                          <>
                            <p><span className="text-gray-400">Logo:</span> <span className="text-white">{formData.logo ? formData.logo.name : 'Not uploaded'}</span></p>
                            <p><span className="text-gray-400">Background:</span> <span className="text-white">{formData.background ? formData.background.name : 'Not uploaded'}</span></p>
                          </>
                        )}
                      </div>
                    </div>

                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Social Links</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-400">X (Twitter):</span> <span className="text-white">{formData.xLink || 'Not provided'}</span></p>
                        <p><span className="text-gray-400">Discord:</span> <span className="text-white">{formData.discordLink || 'Not provided'}</span></p>
                        <p><span className="text-gray-400">Telegram:</span> <span className="text-white">{formData.telegramLink || 'Not provided'}</span></p>
                        <p><span className="text-gray-400">Website:</span> <span className="text-white">{formData.website || 'Not provided'}</span></p>
                      </div>
                    </div>
                    
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Governance</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="text-gray-400">Minimum Stake:</span> <span className="text-white">{parseFloat(formData.minimumStake || '6').toFixed(1)} CEDRA tokens</span></p>
                        <p><span className="text-gray-400">Voting Periods:</span> <span className="text-white">Configured automatically</span></p>
                      </div>
                    </div>
                  </div>
                  
                </div>
                
                
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {showSuccessModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ backgroundColor: 'transparent' }} onClick={() => setShowSuccessModal(null)}>
          <div className="rounded-xl p-6 w-full max-w-sm border shadow-2xl bg-[#0f0f11] border-white/10 text-center" onClick={(e)=>e.stopPropagation()}>
            <div className="w-16 h-16 bg-green-500/20 rounded-full mx-auto mb-4 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-500" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">{showSuccessModal.title}</h3>
            <p className="text-white text-lg font-semibold mb-5">{showSuccessModal.message}</p>
            <button onClick={() => setShowSuccessModal(null)} className="w-full h-11 px-6 rounded-xl font-semibold bg-white/10 text-gray-300 border border-white/10 hover:bg-white/15 transition-colors">OK, Close</button>
          </div>
        </div>
      )}
      <div className="relative mb-8">
        {/* Mobile: Back button absolute positioned, content centered */}
        <div className="sm:hidden">
          <button
            onClick={onBack}
            className="absolute left-0 top-0 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center pt-2">
            <h1 className="text-2xl font-bold text-white">Create New DAO</h1>
            <p className="text-gray-400 mt-1 text-sm">Build your decentralized community in minutes</p>
          </div>
        </div>
        
        {/* Desktop: Back button inline with content */}
        <div className="hidden sm:flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white">Create New DAO</h1>
            <p className="text-gray-400 mt-1 text-base">Build your decentralized community in minutes</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      {/* Mobile: One step at a time */}
      <div className="sm:hidden mb-8">
        <div className="space-y-3">
          {/* Progress indicator */}
          <div className="text-center">
            <span className="text-xs text-gray-400">Step {currentStep} of {steps.length}</span>
          </div>
          
          {/* Current step only */}
          {steps
            .filter(step => step.id === currentStep)
            .map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.id} className="flex justify-center">
                  <div className="bg-[#e1fd6a] text-black border border-transparent px-4 py-3 rounded-xl flex items-center space-x-3">
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{step.title}</span>
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Desktop: Original horizontal layout */}
      <div className="hidden sm:flex items-center justify-center mb-8 space-x-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = currentStep > step.id;
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center space-x-3 px-4 py-2 rounded-xl transition-all ${
                isActive ? 'bg-[#e1fd6a] text-black border border-transparent' :
                isCompleted ? 'bg-green-500/20 text-green-300 border border-green-500/30' :
                'bg-white/5 text-gray-400'
              }`}>
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{step.title}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={`w-8 h-0.5 mx-2 ${
                  isCompleted ? 'bg-green-500' : 'bg-white/20'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Important Notice about One DAO per Wallet */}
      <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
        <div className="flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-yellow-300">
            <h4 className="font-medium mb-1">One DAO per Wallet Address</h4>
            <p className="text-sm">
              Each wallet address can create and manage only <strong>ONE DAO</strong>. If you create a new DAO from this wallet, it will replace any existing DAO at your address ({account?.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : ''}). To create multiple DAOs, please use different wallet addresses.
            </p>
          </div>
        </div>
      </div>

      {/* Transaction Hash (if available) */}
      {transactionHash && (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <p className="text-blue-300 text-sm font-medium mb-2">Transaction Hash:</p>
          <code className="text-blue-200 text-xs break-all block bg-blue-500/10 p-2 rounded">
            {transactionHash}
          </code>
          <a
            href={`https://cedrascan.com/txn/${transactionHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm underline mt-2 inline-block"
          >
            View on Cedra Explorer →
          </a>
        </div>
      )}

      {/* Mode-specific Info */}
      {formData.useUrls ? (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
          <div className="text-green-300">
            <div className="text-green-400">⚡</div>
            <h4 className="font-medium mb-2">Fast URL Mode Active</h4>
            <p className="text-sm">
              You're using URL mode for lightning-fast DAO creation with minimal gas costs!
              <br />• ~70% lower gas usage compared to file uploads
              <br />• Instant deployment without file compression
              <br />• Images hosted externally for better performance
            </p>
          </div>
        </div>
      ) : (formData.logo || formData.background) ? (
        <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="text-blue-300">
            <div className="text-blue-400">🗜️</div>
            <h4 className="font-medium mb-2">Smart Image Compression</h4>
            <p className="text-sm">
              Your images have been automatically compressed for optimal gas efficiency:
              {formData.logo && <br />}• Logo: {formData.logo ? `${(formData.logo.size / 1024).toFixed(1)}KB` : 'Not uploaded'}
              {formData.background && <br />}• Background: {formData.background ? `${(formData.background.size / 1024).toFixed(1)}KB` : 'Not uploaded'}
            </p>
          </div>
        </div>
      ) : null}

      {/* Error Message */}
      {errors.submit && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <div className="text-red-300">
            <div className="text-red-400"></div>
            <p className="text-sm">{errors.submit}</p>
            {errors.submit.includes('Out of gas') && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <h5 className="text-blue-300 font-medium mb-2">💡 Gas Limit Solution:</h5>
                <p className="text-blue-200 text-sm">
                  This error occurs when storing large images on-chain. Try:
                  <br />• Use smaller images (under 500KB each)
                  <br />• Compress your images before upload
                  <br />• Use basic DAO creation without images first
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {renderStepContent()}

        <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8">
          <button
            type="button"
            onClick={() => currentStep > 1 ? setCurrentStep(currentStep - 1) : onBack()}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition-all order-2 sm:order-1"
            disabled={isSubmitting}
          >
            {currentStep === 1 ? 'Cancel' : 'Previous'}
          </button>
          
          {currentStep < 3 ? (
            <button
              type="button"
              onClick={() => {
                if (validateStep(currentStep)) {
                  setCurrentStep(currentStep + 1);
                }
              }}
              disabled={isSubmitting}
              className="px-6 py-3 font-medium disabled:opacity-50 order-1 sm:order-2 rounded-xl transition-all"
              style={{
                background: '#e1fd6a',
                color: '#000000',
                border: 'none'
              }}
            >
              Continue
            </button>
          ) : (
            <div className="flex gap-3 order-1 sm:order-2">
              {/* Main Create DAO button */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 font-medium disabled:opacity-50 flex items-center space-x-2 rounded-xl transition-all"
                style={{
                  background: '#e1fd6a',
                  color: '#000000',
                  border: 'none'
                }}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Creating DAO...</span>
                  </>
                ) : (
                  <span>Create DAO</span>
                )}
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

export default CreateDAO;