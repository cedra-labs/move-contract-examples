import React, { useState, useEffect } from 'react';
import { Shield, Users, Clock, Plus, Trash2, Settings, AlertTriangle, XCircle, UserCheck, Crown, UserMinus, UserPlus, DollarSign, Edit, RefreshCw } from 'lucide-react';
import { useGetProfile } from '../../useServices/useProfile';
import { FaCheckCircle } from 'react-icons/fa';
import { useWallet } from '../../contexts/CedraWalletProvider';
import { cedraClient } from '../../cedra_service/cedra-client';
import { MODULE_ADDRESS } from '../../cedra_service/constants';
import { safeView } from '../../utils/rpcUtils';

interface AdminProps {
  dao: any;
}

interface Admin {
  address: string;
  role: 'super' | 'standard' | 'temporary';
  addedAt: string;
  expiresAt?: string;
  status: 'active' | 'expired';
}

interface CouncilMember {
  address: string;
  addedAt: string;
  status: 'active';
}

const DAOAdmin: React.FC<AdminProps> = ({ dao }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [showAddAdmin, setShowAddAdmin] = useState(false);
  const [showAddCouncilMember, setShowAddCouncilMember] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    address: '',
    role: 'standard' as 'super' | 'standard' | 'temporary',
    expiresInDays: 0
  });
  const [newCouncilMemberForm, setNewCouncilMemberForm] = useState({
    address: ''
  });
  const [checkMemberForm, setCheckMemberForm] = useState({
    address: '',
    isChecking: false,
    result: null as boolean | null
  });
  const [stakeSettings, setStakeSettings] = useState({
    minStakeToJoin: 0,
    minStakeToPropose: 0,
    isLoading: false
  });
  const [showEditStake, setShowEditStake] = useState(false);
  const [newStakeForm, setNewStakeForm] = useState({
    minStakeToJoin: 0,
    minStakeToPropose: 0
  });
  const [newMinStake, setNewMinStake] = useState<string>('');
  const [newMinProposalStake, setNewMinProposalStake] = useState<string>('');
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const { account, signAndSubmitTransaction } = useWallet();
  const { data: profileData } = useGetProfile(account?.address || null);
  // Membership and staking use 6 decimals (1e6), not 8 decimals (1e8) like Cedra coins
  const MEMBERSHIP_DECIMALS = 1e6;  // 6 decimals for membership stakes

  const toMOVE = (u64: number): number => {
    if (u64 === 0) return 0;
    return u64 / MEMBERSHIP_DECIMALS;  // Use 6 decimals for membership stakes
  };
  const fromMOVE = (move: number): number => Math.floor(move * MEMBERSHIP_DECIMALS);

  // On-chain admin state
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentRole, setCurrentRole] = useState<'super' | 'standard' | 'temporary' | 'none'>('none');
  const [isRefreshingAdmins, setIsRefreshingAdmins] = useState(false);

  // Session cache for instant tab switches (SWR pattern)
  // @ts-ignore
  const adminSessionCache: Map<string, { admins: Admin[]; councilData: any; isAdmin: boolean; currentRole: 'super' | 'standard' | 'temporary' | 'none'; timestamp: number }>
    = (window as any).__adminSessionCache || ((window as any).__adminSessionCache = new Map());
  const SESSION_TTL_MS = 10 * 60 * 1000; // 10 minutes (longer cache)
  const MAX_STALE_MS = 20 * 60 * 1000; // 20 minutes stale window

  // Council data state (was missing!)
  const [councilData, setCouncilData] = useState({
    totalMembers: 0,
    maxMembers: 10, // Default value
    minMembers: 3,  // Default value
    members: [] as CouncilMember[],
    daoCreator: null as string | null
  });

  // Role constants matching the admin.move contract
  const ROLE_SUPER_ADMIN = 255;  // ROLE_SUPER_ADMIN from contract
  const ROLE_STANDARD = 100;     // ROLE_STANDARD from contract
  const ROLE_TEMPORARY = 50;     // ROLE_TEMPORARY from contract

  const mapRole = (roleNum: number): 'super' | 'standard' | 'temporary' => {
    if (roleNum === ROLE_SUPER_ADMIN) return 'super';
    if (roleNum === ROLE_STANDARD) return 'standard';
    if (roleNum === ROLE_TEMPORARY) return 'temporary';
    // Default to temporary for any unrecognized role
    return 'temporary';
  };

  const shortAddr = (addr: string) => (addr?.length > 14 ? `${addr.slice(0, 10)}...${addr.slice(-4)}` : addr);

  // Helper to get DAO creator from DAOCreated event (ABI no longer exposes get_dao_creator)
  const getDaoCreatorFromEvents = async (daoAddress: string): Promise<string | null> => {
    try {
      const events = await cedraClient.getModuleEventsByEventType({
        eventType: `${MODULE_ADDRESS}::dao_core_file::DAOCreated`,
        minimumLedgerVersion: 0
      });
      const ev = (events as any[]).find((e: any) => e?.data?.movedao_addrxess === daoAddress);
      return ev?.data?.creator || null;
    } catch {
      return null;
    }
  };

  const fetchCouncilData = async () => {
    if (!dao?.id) {
      console.error('No DAO ID provided for council data fetch');
      return;
    }
    try {
      
      // Get basic DAO existence
      const [daoExistsRes] = await Promise.allSettled([
        safeView({
          function: `${MODULE_ADDRESS}::dao_core_file::dao_exists`,
          functionArguments: [dao.id]
        })
      ]);
      
      
      if (daoExistsRes.status !== 'fulfilled' || !daoExistsRes.value?.[0]) {
        throw new Error(`DAO does not exist at address: ${dao.id}`);
      }
      
      let daoCreator: string | null = null;
      
      const knownMembers: CouncilMember[] = [];
      
      // Try to get initial council members from DAO creation event
      try {
        const daoCreatedEvents = await cedraClient.getModuleEventsByEventType({
          eventType: `${MODULE_ADDRESS}::dao_core_file::DAOCreated`,
          minimumLedgerVersion: 0
        });
        
        // Find the creation event for this specific DAO
        const creationEvent = daoCreatedEvents.find((event: any) => 
          event.data?.movedao_addrxess === dao.id
        );
        
        if (creationEvent) {
          // Set creator from event data when available
          daoCreator = creationEvent.data?.creator || null;
          
          // The DAO creation event should contain initial council info
          // Let's try to get the transaction details to extract council members
          try {
            // Use transaction_version from the event to get transaction details
            const txHash = creationEvent.transaction_version as string | undefined;
            if (txHash) {
              const txnDetails = await cedraClient.getTransactionByVersion({
                ledgerVersion: Number(txHash)
              });
              
              
              // Try to extract initial council from transaction payload if available
              const payload = (txnDetails as any)?.payload;
              if (payload?.function?.includes('create_dao') && payload.arguments) {
                const args = payload.arguments;
                // Initial council is typically the 6th argument (index 5) in create_dao
                if (args.length > 5 && Array.isArray(args[5])) {
                  const initialCouncil = args[5] as string[];
                  
                  initialCouncil.forEach((memberAddress, index) => {
                    if (memberAddress && memberAddress.startsWith('0x')) {
                      knownMembers.push({
                        address: memberAddress,
                        addedAt: `Initial Council Member #${index + 1}`,
            status: 'active'
          });
                    }
                  });
                }
              } else {
              }
            } else {
              console.warn(' No transaction version found in creation event');
            }
          } catch (txnError) {
            console.warn(' Could not extract council from transaction details:', txnError);
          }
        } else {
          console.warn(' No DAO creation event found for this DAO');
        }
      } catch (eventError) {
        console.warn(' Could not fetch DAO creation events:', eventError);
      }
      
      // If creator still unknown, try events again directly
      if (!daoCreator) {
        daoCreator = await getDaoCreatorFromEvents(dao.id);
      }

      // Always add the DAO creator if not already in the list
      if (daoCreator) {
        const isCreatorInCouncil = knownMembers.some(member => 
          member.address.toLowerCase() === daoCreator.toLowerCase()
        );
        
        if (!isCreatorInCouncil) {
          knownMembers.unshift({
            address: daoCreator,
            addedAt: 'DAO Creator',
            status: 'active'
          });
        }
      }
      
      // Set council data with discovered information
      setCouncilData({
        totalMembers: knownMembers.length,
        maxMembers: 10, // Default from contract
        minMembers: 3,  // Default from contract
        members: knownMembers,
        daoCreator
      });
      // Update session cache (preserve other fields)
      const existing = adminSessionCache.get(dao.id) || ({} as any);
      adminSessionCache.set(dao.id, {
        admins: existing.admins || [],
        councilData: {
          totalMembers: knownMembers.length,
          maxMembers: 10,
          minMembers: 3,
          members: knownMembers,
          daoCreator
        },
        isAdmin: existing.isAdmin ?? false,
        currentRole: existing.currentRole ?? 'none',
        timestamp: Date.now(),
      });
    } catch (error: any) {
      console.error('Failed to fetch council data:', error);
      console.error('Error details:', {
        message: (error && (error as any).message) ? (error as any).message : String(error),
        daoId: dao.id,
        moduleAddress: MODULE_ADDRESS
      });
      // Set safe defaults
      setCouncilData({
        totalMembers: 0,
        maxMembers: 10,
        minMembers: 3,
        members: [],
        daoCreator: null
      });
    }
  };

  const fetchAdminData = async (showSpinner: boolean = true) => {
    if (!dao?.id) return;
    
    try {
      if (showSpinner) setIsRefreshingAdmins(true);
      
      // Determine current user's admin status and role using is_admin function
      if (account?.address) {
        try {
          // Use is_admin function first (same as treasury)
          const adminResult = await safeView({
            function: `${MODULE_ADDRESS}::admin::is_admin`,
            functionArguments: [dao.id, account?.address]
          }, `is_admin_debug_${dao.id}_${account?.address}`);
          
          
          let adminNow = Boolean(adminResult?.[0]);
          let adminRole: 'super' | 'standard' | 'temporary' = 'standard';
          
          if (adminNow) {
            // Get role if user is admin
            try {
              const roleResult = await safeView({
                function: `${MODULE_ADDRESS}::admin::get_admin_role`,
                functionArguments: [dao.id, account.address]
              }, `get_role_debug_${dao.id}_${account?.address}`);
              
              if (roleResult?.[0] !== undefined) {
                adminRole = mapRole(Number(roleResult[0]));
              }
            } catch (roleError) {
              console.warn('Failed to get admin role:', roleError);
              // Default to standard role if role fetch fails but is_admin succeeds
            }
      } else {
            // Fallback: Check if user is DAO creator (should have admin privileges)
            try {
              const creator = await getDaoCreatorFromEvents(dao.id) || '';
              if (creator.toLowerCase() === account.address.toLowerCase()) {
                adminNow = true;
                adminRole = 'super';
              }
            } catch (creatorError) {
              console.warn('Failed to check DAO creator status:', creatorError);
            }
          }
          
          setIsAdmin(adminNow);
          setCurrentRole(adminNow ? adminRole : 'none');
          // Update session cache with role info (preserve others)
          const existing = adminSessionCache.get(dao.id) || ({} as any);
          adminSessionCache.set(dao.id, {
            admins: existing.admins || [],
            councilData: existing.councilData || {
              totalMembers: 0,
              maxMembers: 10,
              minMembers: 3,
              members: [],
              daoCreator: null
            },
            isAdmin: adminNow,
            currentRole: adminNow ? adminRole : 'none',
            timestamp: Date.now(),
          });
          
        } catch (error) {
          console.warn('Admin detection failed:', error);
          setIsAdmin(false);
          setCurrentRole('none');
        }
      } else {
        setIsAdmin(false);
        setCurrentRole('none');
      }

      // Fetch admin list (only if admin system exists)
      try {
        const addrRes = await safeView({
          function: `${MODULE_ADDRESS}::admin::get_admins`,
        functionArguments: [dao.id]
        }, `get_admins_debug_${dao.id}`);
        
        const addrs: string[] = Array.isArray(addrRes?.[0]) ? addrRes[0] : [];

        const collected: Admin[] = [];
        
        // Process admins sequentially to avoid circuit breaker
        for (let i = 0; i < addrs.length; i++) {
          const addr = addrs[i];
          try {
            // Add delay between requests to avoid circuit breaker
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            const [roleResult, activeResult] = await Promise.allSettled([
              safeView({
                function: `${MODULE_ADDRESS}::admin::get_admin_role`,
                functionArguments: [dao.id, addr]
              }, `admin_role_${dao.id}_${addr}_${i}`),
              safeView({
                function: `${MODULE_ADDRESS}::admin::is_admin`,
                functionArguments: [dao.id, addr]  
              }, `admin_active_${dao.id}_${addr}_${i}`)
            ]);
            
            const roleNum = roleResult.status === 'fulfilled' ? Number(roleResult.value?.[0] || ROLE_STANDARD) : ROLE_STANDARD;
            const role = mapRole(roleNum);
            const active = activeResult.status === 'fulfilled' ? Boolean(activeResult.value?.[0]) : true;
            
            const entry: Admin = {
              address: addr,
              role,
              addedAt: new Date().toLocaleDateString(),
              expiresAt: role === 'temporary' ? 'Varies' : undefined,
              status: active ? 'active' : 'expired',
            };
            collected.push(entry);
          } catch (adminError) {
            console.warn(`Failed to fetch data for admin ${addr}:`, adminError);
          }
        }

        setAdmins(collected);
        // Update session cache with admins (preserve others)
        const existing = adminSessionCache.get(dao.id) || ({} as any);
        adminSessionCache.set(dao.id, {
          admins: collected,
          councilData: existing.councilData || {
            totalMembers: 0,
            maxMembers: 10,
            minMembers: 3,
            members: [],
            daoCreator: null
          },
          isAdmin: existing.isAdmin ?? false,
          currentRole: existing.currentRole ?? 'none',
          timestamp: Date.now(),
        });
      } catch (adminsError) {
        console.warn('Failed to fetch admin list:', adminsError);
        setAdmins([]);
      }
      
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      if (showSpinner) setIsRefreshingAdmins(false);
    }
  };

  useEffect(() => {
    const cached = adminSessionCache.get(dao.id);
    if (cached) {
      setAdmins(cached.admins || []);
      setIsAdmin(Boolean(cached.isAdmin));
      setCurrentRole(cached.currentRole || 'none');
      if (cached.councilData) setCouncilData(cached.councilData);
    }
    // Always refresh in background quickly (no spinner)
    (async () => {
      try {
        await fetchAdminData(false);
        await fetchCouncilData();
      } catch {}
    })();
  }, [dao.id, account?.address]);

  // Silent refresh on window focus if cache is stale
  useEffect(() => {
    const onFocus = () => {
      const cached = adminSessionCache.get(dao.id);
      const now = Date.now();
      if (cached && (now - cached.timestamp) >= SESSION_TTL_MS && (now - cached.timestamp) < MAX_STALE_MS) {
        (async () => {
          try {
            await fetchAdminData(false);
            await fetchCouncilData();
          } catch {}
        })();
      }
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [dao.id, account?.address]);

  // Filter sections based on admin status - only admins see Manage Admins and Proposal Settings
  const sections = [
    { id: 'overview', label: 'Overview', icon: Shield },
    ...(isAdmin && (currentRole === 'super' || currentRole === 'standard')
      ? [
          { id: 'admins', label: 'Manage Admins', icon: Users },
          { id: 'settings', label: 'Proposal Settings', icon: Settings }
        ]
      : []
    )
  ];

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'standard': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'temporary': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  const handleAddAdmin = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      const addr = newAdminForm.address.trim();
      if (!addr.startsWith('0x') || addr.length < 6) {
      showAlert('Enter a valid admin address', 'error');
        return;
      }
      const roleNum = newAdminForm.role === 'super' ? ROLE_SUPER_ADMIN : newAdminForm.role === 'temporary' ? ROLE_TEMPORARY : ROLE_STANDARD;
      const expires_in_secs = newAdminForm.role === 'temporary' ? Math.max(300, newAdminForm.expiresInDays * 24 * 60 * 60) : 0;
      const payload = {
        function: `${MODULE_ADDRESS}::admin::add_admin`,
        typeArguments: [],
        functionArguments: [dao.id, addr, roleNum.toString(), expires_in_secs.toString()],
      };
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (!tx || !(tx as any).hash) {
        showAlert('Transaction cancelled', 'error');
        return;
      }
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
    setShowAddAdmin(false);
    setNewAdminForm({ address: '', role: 'standard', expiresInDays: 0 });
      await fetchAdminData();
      showAlert('Admin added', 'success');
    } catch (e: any) {
      console.error('Add admin failed:', e);
      let errorMessage = 'Failed to add admin.';
      
      if (e?.message || e?.toString()) {
        const errorString = e.message || e.toString();
        if (errorString.includes('not_admin') || errorString.includes('not_authorized') || errorString.includes('0x1')) {
          errorMessage = 'Only existing admins can add new admins.';
        } else if (errorString.includes('already_exists') || errorString.includes('0x8')) {
          errorMessage = 'This address is already an admin.';
        } else if (errorString.includes('invalid_role') || errorString.includes('0x4')) {
          errorMessage = 'Invalid admin role specified.';
        } else if (errorString.includes('insufficient_balance')) {
          errorMessage = 'Insufficient balance to complete transaction.';
        }
      }
      
      showAlert(errorMessage, 'error');
    }
  };

  const handleRemoveAdmin = async (adminAddress: string) => {
    if (!account || !signAndSubmitTransaction) return;
    try {
      const payload = {
        function: `${MODULE_ADDRESS}::admin::remove_admin`,
        typeArguments: [],
        functionArguments: [dao.id, adminAddress],
      };
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (!tx || !(tx as any).hash) {
        showAlert('Transaction cancelled', 'error');
        return;
      }
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({ transactionHash: (tx as any).hash, options: { checkSuccess: true } });
      }
      await fetchAdminData();
      showAlert('Admin removed', 'success');
    } catch (e: any) {
      console.error('Remove admin failed:', e);
      let errorMessage = 'Failed to remove admin.';
      
      if (e?.message || e?.toString()) {
        const errorString = e.message || e.toString();
        if (errorString.includes('not_admin') || errorString.includes('not_authorized') || errorString.includes('0x1')) {
          errorMessage = 'Only admins can remove other admins.';
        } else if (errorString.includes('not_found') || errorString.includes('0x3')) {
          errorMessage = 'Admin not found or already removed.';
        } else if (errorString.includes('cannot_remove_self')) {
          errorMessage = 'Cannot remove yourself as admin.';
        } else if (errorString.includes('min_admins') || errorString.includes('last_admin')) {
          errorMessage = 'Cannot remove the last admin. Add another admin first.';
        }
      }
      
      showAlert(errorMessage, 'error');
    }
  };

  // Debug function to check council system status
  const debugCouncilSystem = async () => {
    try {

      // Check if you're an admin first
      const adminResult = await safeView({
        function: `${MODULE_ADDRESS}::admin::is_admin`,
        functionArguments: [dao.id, account?.address]
      });

      // Try to get council object
      try {
        const councilObjectResult = await safeView({
          function: `${MODULE_ADDRESS}::dao_core_file::get_council_object`,
          functionArguments: [dao.id]
        });
        
        if (councilObjectResult?.[0]) {
          
          // Let's try to use the legacy council functions to test if member exists
          try {
            const isMemberResult = await safeView({
              function: `${MODULE_ADDRESS}::council::is_council_member`,
              functionArguments: [dao.id, account?.address]
            });
          } catch (e) {
          }
        }
      } catch (e) {
        alert('Council system is not initialized for this DAO. An admin needs to call init_council() first.');
        return;
      }
      } catch (error) {
    }
  };

  const handleAddCouncilMember = async () => {
    if (!account || !signAndSubmitTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    const memberAddress = newCouncilMemberForm.address.trim();
    
    if (!memberAddress) {
      alert('Please enter a valid address');
      return;
    }
    
    if (!memberAddress.startsWith('0x') || memberAddress.length < 10) {
      alert('Please enter a valid Cedra address (starts with 0x and is at least 10 characters long)');
      return;
    }
    
    if (memberAddress === dao.id) {
      alert('Cannot add the DAO itself as a council member');
      return;
    }
    
    if (memberAddress === account.address) {
      alert('Cannot add yourself to the council via this form');
      return;
    }

    // Run debug checks first
    await debugCouncilSystem();
    
    // Test different parameter formats to find the right one

    try {

      // Get the council object first
      const councilObjectResult = await safeView({
        function: `${MODULE_ADDRESS}::dao_core_file::get_council_object`,
        functionArguments: [dao.id]
      });

      const rawCouncilObject = (councilObjectResult as any)?.[0];
      if (!rawCouncilObject) {
        alert('Council object not found.');
        return;
      }

      
      // Test multiple parameter formats to see which one works
      
      // Format 1: Pass the full object as received
      const format1Payload = {
        function: `${MODULE_ADDRESS}::council::add_council_member_to_object`,
        functionArguments: [dao.id, rawCouncilObject, memberAddress]
      };
      
      // Format 2: Pass the inner address as string
      const format2Payload = {
        function: `${MODULE_ADDRESS}::council::add_council_member_to_object`,
        functionArguments: [dao.id, rawCouncilObject.inner, memberAddress]
      };

      // Format 3: Try legacy method
      const format3Payload = {
        function: `${MODULE_ADDRESS}::council::add_council_member`,
        functionArguments: [memberAddress]
      };


      // Ask user which format to try
      const formatChoice = confirm(
        'Simulation might fail. Choose format to test:\n\n' +
        'OK = Try Format 1 (full object)\n' +
        'Cancel = Try Format 2 (inner address only)'
      );

      const payloadToUse = formatChoice ? format1Payload : format2Payload;
      

      // Show a warning before submitting
      const proceed = confirm(
        'About to submit transaction. This may show simulation error but could still work.\n\n' +
        'Parameters:\n' +
        `DAO: ${dao.id}\n` +
        `Council: ${formatChoice ? 'Full Object' : rawCouncilObject.inner}\n` +
        `Member: ${memberAddress}\n\n` +
        'Continue?'
      );

      if (!proceed) {
        return;
      }

      const transaction = await signAndSubmitTransaction({ 
        payload: payloadToUse as any
      });
      

      if (transaction && (transaction as any).hash) {
        
        // Wait for transaction but don't check success initially
        try {
          await cedraClient.waitForTransaction({
            transactionHash: (transaction as any).hash,
            options: { checkSuccess: true }
          });
          
          alert('Council member added successfully!');
          
          // Refresh council data
          await fetchCouncilData();
          
          // Close form and reset
          setShowAddCouncilMember(false);
          setNewCouncilMemberForm({ address: '' });
        } catch (waitError) {
          alert('Transaction submitted but confirmation failed. Check the blockchain explorer to verify.');
        }
      }


    } catch (error: any) {
      console.error('Failed to add council member:', error);
      
      let errorMessage = 'Failed to add council member';
      if (error?.message) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('MISSING_DATA') || error.message.includes('council_not_found')) {
          errorMessage = 'Council system not initialized. The DAO admin needs to initialize the council first using init_council().';
        } else if (error.message.includes('not_admin') || error.message.includes('unauthorized')) {
          errorMessage = 'Only DAO admins can add council members';
        } else if (error.message.includes('already_member')) {
          errorMessage = 'This address is already a council member';
        } else if (error.message.includes('max_members')) {
          errorMessage = 'Council has reached maximum member limit';
        } else if (error.message.includes('invalid_address')) {
          errorMessage = 'Invalid member address provided';
        } else if (error.message.includes('simulation')) {
          errorMessage = 'Transaction simulation failed. The council may not be initialized, or you may not have admin permissions.';
        } else {
          errorMessage = `Failed to add council member: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    }
  };

  const handleRemoveCouncilMember = async (memberAddress: string) => {
    if (!account || !signAndSubmitTransaction) {
      alert('Please connect your wallet first');
      return;
    }

    if (!confirm(`Are you sure you want to remove ${shortAddr(memberAddress)} from the council?`)) {
      return;
    }

    try {

      // Step 1: Get the council object for this DAO
      const councilObjectResult = await safeView({
        function: `${MODULE_ADDRESS}::dao_core_file::get_council_object`,
        functionArguments: [dao.id]
      });

      const rawCouncilObject = (councilObjectResult as any)?.[0];

      if (!rawCouncilObject) {
        alert('Council object not found. The council system may not be initialized for this DAO.');
        return;
      }

      // Step 2: Remove the council member using the object-based function
      // Note: Pass the full council object as received from the contract
      const payload = {
        function: `${MODULE_ADDRESS}::council::remove_council_member_from_object`,
        functionArguments: [dao.id, rawCouncilObject, memberAddress]
      };


      const transaction = await signAndSubmitTransaction({ payload: payload as any });

      if (transaction && (transaction as any).hash) {
        await cedraClient.waitForTransaction({
          transactionHash: (transaction as any).hash,
          options: { checkSuccess: true }
        });
        
        alert('Council member removed successfully!');
        
        // Refresh council data
        await fetchCouncilData();
      }

    } catch (error: any) {
      console.error('Failed to remove council member:', error);
      
      let errorMessage = 'Failed to remove council member';
      if (error?.message) {
        if (error.message.includes('User rejected')) {
          errorMessage = 'Transaction cancelled by user';
        } else if (error.message.includes('not_admin') || error.message.includes('unauthorized')) {
          errorMessage = 'Only DAO admins can remove council members';
        } else if (error.message.includes('not_member')) {
          errorMessage = 'This address is not a council member';
        } else if (error.message.includes('min_members')) {
          errorMessage = 'Cannot remove member: Council would have too few members';
        } else if (error.message.includes('cannot_remove_creator')) {
          errorMessage = 'Cannot remove the DAO creator from the council';
        } else {
          errorMessage = `Failed to remove council member: ${error.message}`;
        }
      }
      
      alert(errorMessage);
    }
  };

  const checkCouncilMembership = async () => {
    const address = checkMemberForm.address.trim();
    if (!address.startsWith('0x') || address.length < 6) {
      alert('Please enter a valid address');
      return;
    }

    setCheckMemberForm(prev => ({ ...prev, isChecking: true, result: null }));

    try {
      // Unfortunately, the contract's council functions are not marked as #[view] functions
      // So we can't directly query council membership from the frontend
      // This is a limitation that needs to be fixed in the smart contract

      alert('Council membership verification is currently unavailable due to contract limitations. The council functions are not marked as view functions in the smart contract.');
      setCheckMemberForm(prev => ({ ...prev, result: null }));

    } catch (error) {
      console.error('Council membership check failed:', error);
      alert('Failed to check membership: ' + (error as any).message);
    } finally {
      setCheckMemberForm(prev => ({ ...prev, isChecking: false }));
    }
  };

  // Fetch current stake settings
  const fetchStakeSettings = async () => {
    try {
      setStakeSettings(prev => ({ ...prev, isLoading: true }));
      
      
      const [minStakeToJoinRes, minStakeToProposalRes] = await Promise.allSettled([
        cedraClient.view({ 
          payload: { 
            function: `${MODULE_ADDRESS}::membership::get_min_stake`, 
            functionArguments: [dao.id] 
          } 
        }),
        cedraClient.view({ 
          payload: { 
            function: `${MODULE_ADDRESS}::membership::get_min_proposal_stake`, 
            functionArguments: [dao.id] 
          } 
        })
      ]);

      // Debug the raw values
      const rawMinStakeToJoin = Number(minStakeToJoinRes.status === 'fulfilled' ? minStakeToJoinRes.value[0] || 0 : 0);
      const rawMinStakeToPropose = Number(minStakeToProposalRes.status === 'fulfilled' ? minStakeToProposalRes.value[0] || 0 : 0);
      
      
      const minStakeToJoin = rawMinStakeToJoin > 0 ? toMOVE(rawMinStakeToJoin) : 0;
      const minStakeToPropose = rawMinStakeToPropose > 0 ? toMOVE(rawMinStakeToPropose) : 0;
      

      setStakeSettings({
        minStakeToJoin,
        minStakeToPropose,
        isLoading: false
      });

      setNewStakeForm({
        minStakeToJoin,
        minStakeToPropose
      });
      setNewMinStake(minStakeToJoin.toString());
      setNewMinProposalStake(minStakeToPropose.toString());

    } catch (error) {
      console.error('Failed to fetch stake settings:', error);
      setStakeSettings(prev => ({ ...prev, isLoading: false }));
    }
  };


  // Update minimum stake to join
  const handleUpdateMinStake = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      
      const raw = parseFloat(newMinStake);
      if (!Number.isFinite(raw) || raw < 0.1) {
        setErrors({ ...errors, minStake: 'Minimum stake must be at least 0.1 CEDRA' });
        return;
      }
      if (raw > 10000) {
        setErrors({ ...errors, minStake: 'Maximum stake cannot exceed 10,000 CEDRA' });
      return;
    }

      const amountOctas = fromMOVE(raw);
      if (amountOctas === 0) {
        setErrors({ ...errors, minStake: 'Amount too small' });
      return;
    }

      const payload = {
        function: `${MODULE_ADDRESS}::membership::update_min_stake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas.toString()],
      };
      
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({ 
          transactionHash: (tx as any).hash, 
          options: { checkSuccess: true } 
        });
      }
      
      await fetchStakeSettings();
      setErrors({ ...errors, minStake: '' });
    } catch (error: any) {
      console.error('Update min stake failed:', error);
      setErrors({ ...errors, minStake: 'Failed to update minimum stake' });
    }
  };

  // Update minimum proposal stake
  const handleUpdateMinProposalStake = async () => {
    try {
      if (!account || !signAndSubmitTransaction) throw new Error('Wallet not connected');
      
      const raw = parseFloat(newMinProposalStake);
      if (!Number.isFinite(raw) || raw < 0.1) {
        setErrors({ ...errors, minProposalStake: 'Minimum proposal stake must be at least 0.1 CEDRA' });
        return;
      }
      if (raw > 10000) {
        setErrors({ ...errors, minProposalStake: 'Maximum proposal stake cannot exceed 10,000 CEDRA' });
        return;
      }
      
      // CONTRACT CONSTRAINT: Proposal stake must be >= join stake
      if (raw < stakeSettings.minStakeToJoin) {
        setErrors({ 
          ...errors, 
          minProposalStake: `Proposal stake must be at least ${stakeSettings.minStakeToJoin} CEDRA (equal to or greater than current join stake)` 
        });
        return;
      }
      
      const amountOctas = fromMOVE(raw);
      if (amountOctas === 0) {
        setErrors({ ...errors, minProposalStake: 'Amount too small' });
        return;
      }
      
      // Debug: Log all values before transaction
      
      const payload = {
        function: `${MODULE_ADDRESS}::membership::update_min_proposal_stake`,
        typeArguments: [],
        functionArguments: [dao.id, amountOctas.toString()],
      };
      
      
      const tx = await signAndSubmitTransaction({ payload } as any);
      if (tx && (tx as any).hash) {
        await cedraClient.waitForTransaction({ 
          transactionHash: (tx as any).hash, 
          options: { checkSuccess: true } 
        });
      }
      
      await fetchStakeSettings();
      setErrors({ ...errors, minProposalStake: '' });
    } catch (error: any) {
      console.error('Update min proposal stake failed:', error);
      let errorMessage = 'Failed to update minimum proposal stake';
      
      // Provide more specific error messages based on contract validation
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        if (errorString.includes('0x4') || errorString.includes('invalid_amount')) {
          errorMessage = 'Invalid amount. Proposal stake must be at least equal to current join stake.';
        } else if (errorString.includes('not_admin') || errorString.includes('0x1')) {
          errorMessage = 'Only DAO admins can update stake requirements.';
        }
      }
      
      setErrors({ ...errors, minProposalStake: errorMessage });
    }
  };

  // Update both stake requirements at once
  const handleUpdateBothStakes = async () => {
    if (!account || !signAndSubmitTransaction) {
      alert('Please connect your wallet');
      return;
    }

    // Validate inputs
    if (newStakeForm.minStakeToJoin < 6) {
      alert('Membership stake cannot be less than 6 CEDRA (contract requirement)');
      return;
    }
    if (newStakeForm.minStakeToJoin > 10000) {
      alert('Membership stake cannot exceed 10,000 CEDRA');
      return;
    }

    if (newStakeForm.minStakeToPropose < newStakeForm.minStakeToJoin) {
      alert(`Proposal stake cannot be less than ${newStakeForm.minStakeToJoin} CEDRA (must be equal to or greater than membership stake)`);
      return;
    }
    if (newStakeForm.minStakeToPropose > 10000) {
      alert('Proposal stake cannot exceed 10,000 CEDRA');
      return;
    }

    if (newStakeForm.minStakeToPropose < newStakeForm.minStakeToJoin) {
      alert('Proposal creation stake should be equal to or greater than membership stake');
      return;
    }

    try {
      // Update membership stake first
      const membershipStakeInOctas = fromMOVE(newStakeForm.minStakeToJoin);
      const membershipPayload = {
        function: `${MODULE_ADDRESS}::membership::update_min_stake`,
        typeArguments: [],
        functionArguments: [
          dao.id,
          membershipStakeInOctas.toString()
        ]
      };

      await signAndSubmitTransaction({ payload: membershipPayload } as any);

      // Update proposal stake
      const proposalStakeInOctas = fromMOVE(newStakeForm.minStakeToPropose);
      const proposalPayload = {
        function: `${MODULE_ADDRESS}::membership::update_min_proposal_stake`,
        typeArguments: [],
        functionArguments: [
          dao.id,
          proposalStakeInOctas.toString()
        ]
      };

      await signAndSubmitTransaction({ payload: proposalPayload } as any);
      
      await fetchStakeSettings();
      setShowEditStake(false);
      alert('Stake requirements updated successfully!');
    } catch (error: any) {
      console.error('Failed to update stake requirements:', error);
      
      let errorMessage = 'Failed to update stake requirements.';
      if (error?.message || error?.toString()) {
        const errorString = error.message || error.toString();
        if (errorString.includes('not_admin') || errorString.includes('0x1')) {
          errorMessage = 'Only DAO admins can update stake requirements.';
        } else if (errorString.includes('invalid_amount') || errorString.includes('0x4')) {
          errorMessage = 'Invalid stake amount. Please check your values and try again.';
        }
      }
      
      alert(errorMessage);
    }
  };

  // useEffect to fetch stake settings on component mount
  useEffect(() => {
    fetchStakeSettings();
  }, [dao.id]);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Admin Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Admins</p>
              <p className="text-2xl font-bold text-white">{admins.length}</p>
            </div>
            <Shield className="w-8 h-8 text-purple-400" />
          </div>
        </div>

        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Super Admins</p>
              <p className="text-2xl font-bold text-white">{admins.filter(a => a.role === 'super').length}</p>
            </div>
            <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-red-400" />
            </div>
          </div>
        </div>

        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Standard</p>
              <p className="text-2xl font-bold text-white">{admins.filter(a => a.role === 'standard').length}</p>
            </div>
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>

        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Temporary</p>
              <p className="text-2xl font-bold text-white">{admins.filter(a => a.role === 'temporary').length}</p>
            </div>
            <div className="w-8 h-8 bg-yellow-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-yellow-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Current User Info */}
      <div className="border border-white/10 rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <FaCheckCircle className="w-5 h-5 text-green-400" />
          <span>Your Admin Status</span>
        </h3>

        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              {/* Avatar same method as Overview/Members */}
              {profileData?.avatarUrl ? (
                <img
                  src={profileData.avatarUrl}
                  alt={profileData.displayName || (account?.address || '-')}
                  className="w-10 h-10 rounded-lg object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                    const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white font-bold ${profileData?.avatarUrl ? 'hidden' : ''}`}>
                {(account?.address || '0x').slice(2, 4).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-white break-all">{account?.address || '-'}</p>
                <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(isAdmin ? (currentRole === 'none' ? 'standard' : currentRole) : 'temporary')}`}>
                  {isAdmin ? (currentRole === 'none' ? 'Admin' : `${currentRole.charAt(0).toUpperCase() + currentRole.slice(1)} Admin`) : 'Not Admin'}
                </span>
              </div>
            </div>
            <div className="text-green-400 self-start sm:self-center">
              <FaCheckCircle className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Admin Rules removed per user request */}
    </div>
  );

  const renderAdminManagement = () => (
    <div className="space-y-6">
      {/* Add Admin Button */}
      {isAdmin && (
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
          <h3 className="text-lg font-semibold text-white">Admin Management</h3>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchAdminData(true)}
              className="px-4 py-2 border border-white/20 hover:bg-white/5 text-white rounded-xl transition-all font-medium flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
            <button onClick={() => setShowAddAdmin(true)} className="px-4 py-2 border border-white/20 hover:bg-white/5 text-white rounded-xl transition-all font-medium flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Admin</span>
            </button>
          </div>
        </div>
      )}
      {/* Add Admin Form */}
      {showAddAdmin && (
        <div className="border border-white/10 rounded-xl p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Add New Admin</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Admin Address</label>
              <input
                type="text"
                value={newAdminForm.address}
                onChange={(e) => setNewAdminForm({ ...newAdminForm, address: e.target.value })}
                className="professional-input w-full px-3 py-2 rounded-lg text-sm placeholder-gray-500"
                placeholder="0x..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Admin Role</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="standard"
                    checked={newAdminForm.role === 'standard'}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value as any })}
                    className="text-indigo-500"
                  />
                  <span className="text-gray-300">Standard Admin</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="temporary"
                    checked={newAdminForm.role === 'temporary'}
                    onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value as any })}
                    className="text-indigo-500"
                  />
                  <span className="text-gray-300">Temporary Admin</span>
                </label>
                {currentRole === 'super' && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="super"
                      checked={newAdminForm.role === 'super'}
                      onChange={(e) => setNewAdminForm({ ...newAdminForm, role: e.target.value as any })}
                      className="text-indigo-500"
                    />
                    <span className="text-gray-300">Super Admin</span>
                  </label>
                )}
              </div>
            </div>
            {newAdminForm.role === 'temporary' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Expires in (days)</label>
                <input
                  type="number"
                  value={newAdminForm.expiresInDays}
                  onChange={(e) => setNewAdminForm({ ...newAdminForm, expiresInDays: parseInt(e.target.value) })}
                  className="professional-input w-full px-3 py-2 rounded-lg text-sm placeholder-gray-500"
                  placeholder="7"
                  min="1"
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 5 minutes required by contract</p>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={handleAddAdmin} className="px-5 py-2 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto" style={{ backgroundColor: '#facc16', color: '#0f172a' }}>Add Admin</button>
              <button onClick={() => setShowAddAdmin(false)} className="px-5 py-2 rounded-xl font-semibold bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 transition-colors w-full sm:w-auto">Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Admins List */}
      <div className="border border-white/10 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-white">Current Admins</h4>
          <div className="text-sm text-gray-400">{admins.length} admins</div>
          <button onClick={fetchAdminData} title="Refresh" className="p-2 text-[#e1fd6a] hover:text-[#e1fd6a]/80 hover:border border-white/10 rounded-lg">
            <RefreshCw className={`w-4 h-4 ${isRefreshingAdmins ? 'animate-spin' : ''}`} />
          </button>
          </div>
        {/* Admin Table - Desktop */}
        <div className="hidden sm:block w-full min-w-0 p-0 m-0">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-4 px-4 font-medium text-gray-300">Admin</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Role</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Status</th>
                <th className="text-left py-4 px-4 font-medium text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {admins.map((admin, index) => (
                <tr key={index} className="border-b border-white/5 hover:border border-white/10 transition-all">
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">{admin.address.slice(2, 4).toUpperCase()}</div>
                      <div>
                        <p className="font-medium text-white">{shortAddr(admin.address)}</p>
                        <p className="text-sm text-gray-400">Admin #{index + 1}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getRoleColor(admin.role)}`}>{admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${admin.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                      <span className={`text-sm ${admin.status === 'active' ? 'text-green-400' : 'text-red-400'}`}>{admin.status.charAt(0).toUpperCase() + admin.status.slice(1)}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {isAdmin && admin.address !== account?.address && (
                      <button onClick={() => handleRemoveAdmin(admin.address)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all" title="Remove Admin">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Card layout for mobile */}
        <div className="sm:hidden space-y-4">
          {admins.map((admin, index) => (
            <div key={index} className="border border-white/10 rounded-xl p-4 flex flex-col space-y-3 shadow border border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-sm">{admin.address.slice(2, 4).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white break-all">{admin.address}</p>
                  <p className="text-xs text-gray-400">Admin #{index + 1}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${admin.status === 'active' ? 'bg-green-400' : 'bg-red-400'}`} />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">Role:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(admin.role)}`}>{admin.role.charAt(0).toUpperCase() + admin.role.slice(1)}</span>
                </div>
                </div>
              <div className="flex justify-end">
                {isAdmin && admin.address !== account?.address && (
                  <button onClick={() => handleRemoveAdmin(admin.address)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    );
  

  const renderCouncilManagement = () => {
    return (
    <div className="space-y-6">
      {/* Add Council Member Button */}
      {/* This section is not directly tied to the admin::add_admin functionality,
          so it remains as is, but the add/remove logic for council members
          is still using object-based functions, which are not directly
          tied to the admin::add_admin. This might need further refinement
          depending on the exact council management flow. */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h3 className="text-lg font-semibold text-white">Council Management</h3>
          <p className="text-sm text-gray-400">Manage trusted DAO members with special governance roles</p>
        </div>
        <div className="flex space-x-2">
              <button
            onClick={debugCouncilSystem}
            className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl transition-all flex items-center space-x-2"
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Debug</span>
              </button>
                <button
            onClick={() => setShowAddCouncilMember(true)}
            className="flex items-center space-x-2 px-4 py-2 border border-white/20 hover:bg-white/5 text-white rounded-xl transition-all font-medium"
          >
              <UserPlus className="w-4 h-4" />
              <span>Add Council Member</span>
                </button>
            </div>
          </div>

      {/* Council Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Members</p>
              <p className="text-2xl font-bold text-white">{councilData.totalMembers}</p>
        </div>
            <Crown className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
        
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Available Slots</p>
              <p className="text-2xl font-bold text-white">{councilData.maxMembers - councilData.totalMembers}</p>
            </div>
            <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
              <Plus className="w-5 h-5 text-green-400" />
            </div>
          </div>
        </div>
        
        <div className="border border-white/10 rounded-xl p-4">
          <div className="flex items-center justify-between">
              <div>
              <p className="text-sm text-gray-400">Min Required</p>
              <p className="text-2xl font-bold text-white">{councilData.minMembers}</p>
              </div>
            <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Add Council Member Form */}
      {showAddCouncilMember && (
        <div className="border border-white/10 rounded-xl p-4 sm:p-6">
          <h4 className="text-lg font-semibold text-white mb-4">Add New Council Member</h4>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Member Address</label>
              <input
                type="text"
                value={newCouncilMemberForm.address}
                onChange={(e) => setNewCouncilMemberForm({ ...newCouncilMemberForm, address: e.target.value })}
                className="w-full px-4 py-3 border border-white/10 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="0x..."
              />
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3">
            <button
                onClick={handleAddCouncilMember}
                className="btn-primary flex-1 w-full sm:w-auto"
              >
                Add Council Member
              </button>
              <button
                onClick={() => setShowAddCouncilMember(false)}
                className="px-6 py-3 border border-white/10 hover:bg-white/10 text-gray-300 rounded-xl transition-all w-full sm:w-auto"
              >
                Cancel
            </button>
          </div>
          </div>
        </div>
      )}

      {/* Council Members List */}
      <div className="border border-white/10 rounded-xl p-4 sm:p-6">
        <div className="flex items-center justify-between mb-6">
          <h4 className="text-lg font-semibold text-white">Council Members</h4>
              <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-400">
              {councilData.totalMembers} members
                </div>
            <button 
              onClick={fetchCouncilData} 
              title="Refresh Council Data" 
              className="p-2 text-[#e1fd6a] hover:text-[#e1fd6a]/80 hover:border border-white/10 rounded-lg"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
              </div>
            </div>

        {councilData.totalMembers > 0 ? (
          <div className="space-y-6">
            {/* Known Members List */}
            {councilData.members.length > 0 && (
          <div className="space-y-4">
                <h4 className="text-md font-semibold text-white">Known Council Members</h4>
                <div className="space-y-2">
              {councilData.members.map((member, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border border-white/10 rounded-lg border border-white/10">
                    <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-full flex items-center justify-center">
                          <Crown className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div>
                          <p className="text-white font-mono text-sm">{shortAddr(member.address)}</p>
                          <p className="text-xs text-gray-400">{member.addedAt}</p>
                          {member.address.toLowerCase() === councilData.daoCreator?.toLowerCase() && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 mt-1">
                              <Crown className="w-3 h-3 mr-1" />
                              Creator
                            </span>
                          )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded-lg border border-green-500/30">
                          Active
                      </span>
                        {isAdmin && member.address !== councilData.daoCreator && (
                <button
                        onClick={() => handleRemoveCouncilMember(member.address)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                        title="Remove Council Member"
                >
                        <UserMinus className="w-4 h-4" />
                </button>
              )}
            </div>
                    </div>
              ))}
        </div>
              </div>
            )}
                    </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-500/20 to-gray-600/20 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No Council Members</h3>
            <p className="text-gray-400 mb-4">
              This DAO currently has no council members. Add trusted members to help with governance decisions.
            </p>
                      <button
              onClick={() => setShowAddCouncilMember(true)}
              className="btn-primary flex items-center justify-center space-x-2 mx-auto"
                  >
              <UserPlus className="w-4 h-4" />
              <span>Add First Council Member</span>
                      </button>
          </div>
                    )}
                  </div>

      {/* Council Info */}
      <div className="border border-white/10 rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span>Council Information</span>
        </h3>
        
        <div className="space-y-3">
          <div className="flex items-start space-x-3 p-3 border border-white/10 rounded-lg">
            <Crown className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Object-Based System</p>
              <p className="text-sm text-gray-400">Council management uses Cedra Objects for enhanced security and efficiency</p>
              </div>
          </div>

          <div className="flex items-start space-x-3 p-3 border border-white/10 rounded-lg">
            <UserCheck className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Initialization Required</p>
              <p className="text-sm text-gray-400">Council must be initialized with init_council() before members can be added</p>
            </div>
          </div>
          
          <div className="flex items-start space-x-3 p-3 border border-white/10 rounded-lg">
            <Shield className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-white font-medium">Admin Required</p>
              <p className="text-sm text-gray-400">Only admins can add or remove council members using object-based functions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Council Information & Contract Limitations */}
      <div className="border border-white/10 rounded-xl p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span>Council System Information</span>
              </h3>
        
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <XCircle className="w-5 h-5 text-red-400" />
              <span className="text-red-400 font-medium">Contract Limitation</span>
            </div>
            <p className="text-red-200 text-sm mb-3">
              The smart contract's council functions (<code>get_member_count_from_object</code> and <code>is_council_member_in_object</code>) 
              are not marked as <code>#[view]</code> functions, making them inaccessible from the frontend.
            </p>
            <p className="text-red-200 text-sm">
              <strong>Impact:</strong> We can only display the DAO creator as a known initial council member. 
              Additional council members exist but cannot be enumerated or verified through the UI.
            </p>
          </div>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <UserCheck className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-400 font-medium">Recommended Solution</span>
            </div>
            <p className="text-yellow-200 text-sm">
              To fix this, the smart contract needs to be updated to add <code>#[view]</code> attributes to the 
              council functions. This would allow the frontend to properly query council membership and display 
              all members.
            </p>
          </div>
          
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <FaCheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-400 font-medium">What Still Works</span>
            </div>
            <ul className="text-green-200 text-sm space-y-1">
              <li>• DAO creator is automatically shown as initial council member</li>
              <li>• Admin functions for adding/removing council members work via transactions</li>
              <li>• Council system operates correctly on-chain</li>
              <li>• Object-based council storage provides security and efficiency benefits</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    );
  };

  const renderProposalSettings = () => {
    return (
      <div className="space-y-6">
      {/* Current Stake Settings */}
      <div className="border border-white/10 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4 mb-4">
          <h3 className="text-lg font-semibold text-white leading-tight flex items-center space-x-2">
            <DollarSign className="w-5 h-5 text-green-400" />
            <span>Current Stake Requirements</span>
          </h3>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={fetchStakeSettings}
              className="px-3 py-2 border border-white/20 hover:bg-white/5 text-white rounded-xl text-sm flex items-center justify-center transition-all"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowEditStake(true)}
              className="flex items-center justify-center space-x-2 px-4 py-2 border border-white/20 hover:bg-white/5 text-white rounded-xl transition-all font-medium"
            >
                <Edit className="w-4 h-4" />
                <span>Edit Settings</span>
            </button>
          </div>
        </div>

        {stakeSettings.isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading stake requirements...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            <div className="border border-white/10 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  <span className="text-white font-medium text-sm">Membership</span>
                    </div>
                <div className="text-left sm:text-right">
                  <div className="text-lg font-bold text-blue-300">
                    {stakeSettings.minStakeToJoin} CEDRA
                  </div>
                  <div className="text-xs text-gray-400">Required to join</div>
              </div>
              </div>
            </div>

            <div className="border border-white/10 rounded-lg p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-green-400" />
                  <span className="text-white font-medium text-sm">Proposals</span>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-lg font-bold text-green-300">
                    {stakeSettings.minStakeToPropose} CEDRA
                  </div>
                  <div className="text-xs text-gray-400">Required to propose</div>
                </div>
              </div>
          </div>
        </div>
      )}
      </div>

      {/* Edit Stake Settings Form */}
      {showEditStake && (
        <div className="border border-white/10 rounded-xl p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-semibold text-white flex items-center space-x-2">
              <Edit className="w-5 h-5 text-purple-400" />
              <span>Update Stake Requirements</span>
            </h4>
              <button
                onClick={() => {
                setShowEditStake(false);
                setNewStakeForm({
                  minStakeToJoin: stakeSettings.minStakeToJoin,
                  minStakeToPropose: stakeSettings.minStakeToPropose
                });
                setNewMinStake(stakeSettings.minStakeToJoin.toString());
                setNewMinProposalStake(stakeSettings.minStakeToPropose.toString());
                setErrors({});
                }}
                className="p-2 text-gray-400 hover:text-white hover:border border-white/10 rounded-lg transition-all"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Membership Stake */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Membership Stake (MOVE)
                </label>
                <input
                  type="text"
                  value={newMinStake}
                  onChange={(e) => setNewMinStake(e.target.value)}
                  className="professional-input w-full px-3 py-2 rounded-lg text-sm"
                  placeholder="0.1 - 10,000 CEDRA"
                />
                {errors.minStake && <p className="text-red-400 text-xs">{errors.minStake}</p>}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Current: {stakeSettings.minStakeToJoin} CEDRA</span>
                  <span>Required to join DAO</span>
              </div>
              </div>

              {/* Proposal Stake */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">
                  Proposal Stake (MOVE)
                </label>
                <input
                  type="text"
                  value={newMinProposalStake}
                  onChange={(e) => setNewMinProposalStake(e.target.value)}
                  className="professional-input w-full px-3 py-2 rounded-lg text-sm"
                  placeholder={`Min ${stakeSettings.minStakeToJoin} CEDRA`}
                />
                {errors.minProposalStake && <p className="text-red-400 text-xs">{errors.minProposalStake}</p>}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Current: {stakeSettings.minStakeToPropose} CEDRA</span>
                  <span>Required to create proposals</span>
                </div>
              </div>
            </div>

            {/* Validation Warning */}
            {newStakeForm.minStakeToPropose < newStakeForm.minStakeToJoin && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400" />
                  <span className="text-yellow-400 text-sm font-medium">Proposal stake must be ≥ membership stake</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                onClick={handleUpdateBothStakes}
                className="px-5 py-2 rounded-xl font-semibold bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                <Settings className="w-4 h-4" />
                <span>Update Both</span>
              </button>
              <button
                onClick={handleUpdateMinStake}
                disabled={!newMinStake}
                className="px-5 py-2 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: '#e1ff62', color: '#0f172a' }}
              >
                Update Join
              </button>
              <button
                onClick={handleUpdateMinProposalStake}
                disabled={!newMinProposalStake}
                className="px-5 py-2 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{ backgroundColor: '#e1ff62', color: '#0f172a' }}
              >
                Update Proposals
                </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Info */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="border border-white/10 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-white text-sm font-medium">Membership</span>
    </div>
          <p className="text-xs text-gray-400">Required to join DAO and vote</p>
        </div>
        
        <div className="border border-white/10 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Settings className="w-4 h-4 text-green-400" />
            <span className="text-white text-sm font-medium">Proposals</span>
          </div>
          <p className="text-xs text-gray-400">Required to create governance proposals</p>
        </div>
        
        <div className="border border-white/10 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Shield className="w-4 h-4 text-purple-400" />
            <span className="text-white text-sm font-medium">Admins</span>
          </div>
          <p className="text-xs text-gray-400">Can create proposals regardless of stake</p>
        </div>
        
        <div className="border border-white/10 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <DollarSign className="w-4 h-4 text-yellow-400" />
            <span className="text-white text-sm font-medium">Dynamic</span>
          </div>
          <p className="text-xs text-gray-400">Requirements can be updated anytime</p>
        </div>
      </div>
    </div>
    );
  };

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return renderOverview();
      case 'admins':
        // Only super and standard admins can access admin management
        if (!isAdmin || (currentRole !== 'super' && currentRole !== 'standard')) {
          return (
            <div className="border border-red-500/30 rounded-xl p-8 text-center bg-red-500/10">
              <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-300 mb-2">Access Denied</h3>
              <p className="text-red-200">Only Super Admins and Standard Admins can manage admins.</p>
            </div>
          );
        }
        return renderAdminManagement();
      case 'settings':
        // Only super and standard admins can access proposal settings
        if (!isAdmin || (currentRole !== 'super' && currentRole !== 'standard')) {
          return (
            <div className="border border-red-500/30 rounded-xl p-8 text-center bg-red-500/10">
              <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-red-300 mb-2">Access Denied</h3>
              <p className="text-red-200">Only Super Admins and Standard Admins can modify proposal settings.</p>
            </div>
          );
        }
        return renderProposalSettings();
      default:
        return renderOverview();
    }
  };
  
  return (
    <div className="w-full max-w-none px-4 sm:px-6 space-y-6 sm:space-y-8 overflow-hidden flex-shrink min-w-0">
      {/* Navigation */}
      <div className="flex flex-wrap gap-1 border border-white/10 rounded-lg p-1">
        {sections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          return (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md font-medium transition-all text-sm ${
                isActive
                  ? 'bg-white/10 text-white shadow-sm'
                  : 'text-gray-400 hover:text-white hover:border border-white/10'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : ''}`} />
              <span className="hidden sm:inline">{section.label}</span>
              <span className="sm:hidden">{section.label.split(' ')[0]}</span>
            </button>
          );
        })}
            </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default DAOAdmin;