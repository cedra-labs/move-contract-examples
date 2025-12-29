import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Coins } from "lucide-react";
import { useWallet } from "./wallet-provider";
import { useChipsView, useContractActions } from "../hooks/useContract";
import "./ChipsPanel.css";

const CHIPS_PER_CEDRA = 1000;
const OCTAS_PER_CEDRA = 100_000_000;
const OCTAS_PER_CHIP = OCTAS_PER_CEDRA / CHIPS_PER_CEDRA;
const MIN_GAS_OCTAS = 2_000;

interface ChipsPanelProps {
    balance?: number;
    onBalanceRefresh?: () => void | Promise<void>;
}

export function ChipsPanel({ balance, onBalanceRefresh }: ChipsPanelProps) {
    const { connected } = useWallet();
    const { buyChips, cashOut } = useContractActions();
    const { getBalance, getCedraBalance, getTreasuryBalance } = useChipsView();

    const [localBalance, setLocalBalance] = useState(0);
    const [cedraBalance, setCedraBalance] = useState<number | null>(null);
    const [treasuryBalance, setTreasuryBalance] = useState<number | null>(null);
    const [buyAmount, setBuyAmount] = useState("");
    const [cashAmount, setCashAmount] = useState("");
    const [status, setStatus] = useState<{ type: "error" | "success"; message: string } | null>(null);
    const [activeAction, setActiveAction] = useState<"buy" | "cash" | null>(null);

    const effectiveBalance = balance ?? localBalance;
    const hasCedraBalance = cedraBalance !== null;
    const cedraBalanceOctas = cedraBalance ?? 0;
    const cedraBalancePending = connected && cedraBalance === null;
    const hasTreasuryBalance = treasuryBalance !== null;
    const treasuryBalanceOctas = treasuryBalance ?? 0;
    const treasuryBalancePending = connected && treasuryBalance === null;
    const cedraBalanceDisplay = hasCedraBalance
        ? (cedraBalanceOctas / OCTAS_PER_CEDRA).toLocaleString(undefined, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 6,
        })
        : "--";
    const treasuryBalanceDisplay = hasTreasuryBalance
        ? (treasuryBalanceOctas / OCTAS_PER_CEDRA).toLocaleString(undefined, {
            minimumFractionDigits: 3,
            maximumFractionDigits: 6,
        })
        : "--";

    const refreshBalance = useCallback(async () => {
        if (!connected) {
            if (balance === undefined) {
                setLocalBalance(0);
            }
            setCedraBalance(null);
            setTreasuryBalance(null);
            return;
        }

        const refreshChips = onBalanceRefresh
            ? onBalanceRefresh()
            : getBalance().then((value) => setLocalBalance(value));
        const refreshCedra = getCedraBalance().then((value) => setCedraBalance(value));
        const refreshTreasury = getTreasuryBalance().then((value) => setTreasuryBalance(value));

        await Promise.all([refreshChips, refreshCedra, refreshTreasury]);
    }, [balance, connected, getBalance, getCedraBalance, getTreasuryBalance, onBalanceRefresh]);

    useEffect(() => {
        if (!connected) {
            setCedraBalance(null);
            setTreasuryBalance(null);
            return;
        }

        getCedraBalance().then((value) => setCedraBalance(value));
        getTreasuryBalance().then((value) => setTreasuryBalance(value));
    }, [connected, getCedraBalance, getTreasuryBalance]);

    useEffect(() => {
        if (balance === undefined) {
            refreshBalance();
        }
    }, [balance, refreshBalance]);

    const buyCedraValue = Number(buyAmount);
    const buyOctas = Number.isFinite(buyCedraValue) ? Math.round(buyCedraValue * OCTAS_PER_CEDRA) : 0;
    const buyChipEstimate = buyOctas > 0 ? Math.floor(buyOctas / OCTAS_PER_CHIP) : 0;
    const buyExceedsBalance = hasCedraBalance && buyOctas > cedraBalanceOctas;
    const buyLeavesNoGas = hasCedraBalance && buyOctas > 0 && cedraBalanceOctas - buyOctas < MIN_GAS_OCTAS;
    // LOW-1 Fix: Ensure buy amount is exact multiple of OCTAS_PER_CHIP to prevent rounding errors
    const buyNotExactMultiple = buyOctas > 0 && buyOctas % OCTAS_PER_CHIP !== 0;
    // Calculate the rounded-down exact multiple for suggestion
    const suggestedBuyOctas = Math.floor(buyOctas / OCTAS_PER_CHIP) * OCTAS_PER_CHIP;
    const suggestedBuyCedra = suggestedBuyOctas / OCTAS_PER_CEDRA;

    const cashChipValue = Number(cashAmount);
    const cashCedraEstimate = Number.isFinite(cashChipValue) ? cashChipValue / CHIPS_PER_CEDRA : 0;
    const cashCedraDisplay = Number.isFinite(cashCedraEstimate)
        ? cashCedraEstimate.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 3 })
        : "0.000";
    const needsGasBalance = hasCedraBalance && cedraBalanceOctas < MIN_GAS_OCTAS;
    const cashOutOctas = Number.isFinite(cashChipValue) ? Math.round(cashChipValue * OCTAS_PER_CHIP) : 0;
    const treasuryInsufficient = hasTreasuryBalance && cashOutOctas > treasuryBalanceOctas;

    const buyDisabled =
        !connected ||
        activeAction !== null ||
        !buyAmount ||
        !Number.isFinite(buyCedraValue) ||
        buyOctas < OCTAS_PER_CHIP ||
        !Number.isSafeInteger(buyOctas) ||
        buyExceedsBalance ||
        buyNotExactMultiple;

    const cashDisabled =
        !connected ||
        activeAction !== null ||
        !cashAmount ||
        !Number.isFinite(cashChipValue) ||
        cashChipValue < 1 ||
        !Number.isInteger(cashChipValue) ||
        cashChipValue > effectiveBalance ||
        !Number.isSafeInteger(cashChipValue) ||
        needsGasBalance ||
        cedraBalancePending ||
        treasuryInsufficient ||
        treasuryBalancePending;

    const buyHint = useMemo(() => {
        if (!buyAmount) return "Enter CEDRA in multiples of 0.001 (1 chip).";
        if (!Number.isFinite(buyCedraValue) || buyCedraValue <= 0) return "Enter a valid CEDRA amount.";
        if (buyExceedsBalance) return "Insufficient CEDRA balance for this purchase.";
        if (buyChipEstimate < 1) return "Minimum 0.001 CEDRA (1 chip).";
        if (buyNotExactMultiple) {
            return `Amount must be exact chip multiple. Try ${suggestedBuyCedra.toFixed(3)} CEDRA for ${buyChipEstimate} chips.`;
        }
        if (buyLeavesNoGas) return "Leave ~0.00002 CEDRA for gas after purchase.";
        return `Buying ${buyChipEstimate.toLocaleString()} chips.`;
    }, [buyAmount, buyCedraValue, buyChipEstimate, buyExceedsBalance, buyLeavesNoGas, buyNotExactMultiple, suggestedBuyCedra]);

    const cashHint = useMemo(() => {
        if (!cashAmount) return "Enter chips to cash out.";
        if (cedraBalancePending) return "Checking CEDRA balance for gas...";
        if (treasuryBalancePending) return "Checking treasury balance...";
        if (!Number.isFinite(cashChipValue) || cashChipValue <= 0) return "Enter a valid chip amount.";
        if (!Number.isInteger(cashChipValue)) return "Chip amount must be a whole number.";
        if (cashChipValue > effectiveBalance) return "Insufficient chips for cash out.";
        if (needsGasBalance) return "Keep ~0.00002 CEDRA for gas to cash out.";
        if (treasuryInsufficient) return "Treasury lacks enough CEDRA to cash out this amount.";
        return `Estimated ${cashCedraDisplay} CEDRA.`;
    }, [
        cashAmount,
        cashCedraDisplay,
        cashChipValue,
        cedraBalancePending,
        effectiveBalance,
        needsGasBalance,
        treasuryBalancePending,
        treasuryInsufficient,
    ]);

    const handleBuy = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setStatus(null);

        if (!connected) {
            setStatus({ type: "error", message: "Connect your wallet to buy chips." });
            return;
        }

        if (!buyAmount || !Number.isFinite(buyCedraValue) || buyCedraValue <= 0) {
            setStatus({ type: "error", message: "Enter a valid CEDRA amount." });
            return;
        }

        if (!Number.isSafeInteger(buyOctas)) {
            setStatus({ type: "error", message: "CEDRA amount is too large." });
            return;
        }

        if (buyExceedsBalance) {
            setStatus({ type: "error", message: "Insufficient CEDRA balance for this purchase." });
            return;
        }

        if (buyOctas < OCTAS_PER_CHIP || buyChipEstimate < 1) {
            setStatus({ type: "error", message: "Minimum purchase is 0.001 CEDRA (1 chip)." });
            return;
        }

        // LOW-1 Fix: Ensure exact multiple to prevent contract E_NOT_EXACT_MULTIPLE error
        if (buyNotExactMultiple) {
            setStatus({
                type: "error",
                message: `Amount must be exact chip multiple. Try ${suggestedBuyCedra.toFixed(3)} CEDRA.`,
            });
            return;
        }

        try {
            setActiveAction("buy");
            await buyChips(buyOctas);
            setStatus({ type: "success", message: `Bought ${buyChipEstimate.toLocaleString()} chips.` });
            setBuyAmount("");
            await refreshBalance();
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("chips:updated"));
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to buy chips.";
            setStatus({ type: "error", message });
        } finally {
            setActiveAction(null);
        }
    };

    const handleCashOut = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setStatus(null);

        if (!connected) {
            setStatus({ type: "error", message: "Connect your wallet to cash out chips." });
            return;
        }

        if (!cashAmount || !Number.isFinite(cashChipValue) || cashChipValue <= 0) {
            setStatus({ type: "error", message: "Enter a valid chip amount." });
            return;
        }

        if (!Number.isInteger(cashChipValue)) {
            setStatus({ type: "error", message: "Chip amount must be a whole number." });
            return;
        }

        if (!Number.isSafeInteger(cashChipValue)) {
            setStatus({ type: "error", message: "Chip amount is too large." });
            return;
        }

        if (needsGasBalance) {
            setStatus({
                type: "error",
                message: "Not enough CEDRA to cover gas. Keep at least ~0.00002 CEDRA.",
            });
            return;
        }

        if (treasuryInsufficient) {
            setStatus({
                type: "error",
                message: "Treasury doesn't have enough CEDRA. Try a smaller cash out or wait for more buy-ins.",
            });
            return;
        }

        if (cashChipValue > effectiveBalance) {
            setStatus({ type: "error", message: "Insufficient chip balance for cash out." });
            return;
        }

        try {
            setActiveAction("cash");
            await cashOut(cashChipValue);
            setStatus({
                type: "success",
                message: `Cashed out ${cashChipValue.toLocaleString()} chips.`,
            });
            setCashAmount("");
            await refreshBalance();
            if (typeof window !== "undefined") {
                window.dispatchEvent(new Event("chips:updated"));
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to cash out chips.";
            setStatus({ type: "error", message });
        } finally {
            setActiveAction(null);
        }
    };

    return (
        <section className="chips-panel">
            <div className="chips-header">
                <Coins size={18} />
                <div>
                    <h3>Chips Exchange</h3>
                    <p>1 CEDRA = 1000 chips</p>
                </div>
            </div>

            <div className="chips-balance">
                <span>Wallet chips</span>
                <strong>{connected ? effectiveBalance.toLocaleString() : "--"}</strong>
            </div>
            <div className="chips-balance">
                <span>Wallet CEDRA</span>
                <strong>{connected ? cedraBalanceDisplay : "--"}</strong>
            </div>
            <div className="chips-balance">
                <span>Treasury CEDRA</span>
                <strong>{connected ? treasuryBalanceDisplay : "--"}</strong>
            </div>

            {!connected && <p className="chips-note">Connect your wallet to buy chips or cash out.</p>}
            {connected && needsGasBalance && (
                <p className="chips-warning">You need a tiny CEDRA balance to cover gas for cash out.</p>
            )}
            {connected && !needsGasBalance && buyLeavesNoGas && (
                <p className="chips-warning">This buy leaves little CEDRA for gas. Consider buying slightly less.</p>
            )}
            {connected && treasuryInsufficient && (
                <p className="chips-warning">Treasury balance is too low to honor this cash out.</p>
            )}

            <div className="chips-forms">
                <form className="chip-form" onSubmit={handleBuy}>
                    <div className="chip-form-header">
                        <h4>Buy chips</h4>
                        <span className="chip-tag">Pay CEDRA</span>
                    </div>
                    <label className="chip-field">
                        <span>CEDRA amount</span>
                        <input
                            type="number"
                            min="0.001"
                            step="0.001"
                            placeholder="0.1"
                            value={buyAmount}
                            onChange={(e) => {
                                setBuyAmount(e.target.value);
                                setStatus(null);
                            }}
                            disabled={!connected || activeAction === "buy"}
                        />
                        <small className="chip-hint">{buyHint}</small>
                    </label>
                    <div className="chip-actions">
                        <button type="submit" className="btn btn-primary" disabled={buyDisabled}>
                            {activeAction === "buy" ? "Buying..." : "Buy chips"}
                        </button>
                    </div>
                </form>

                <form className="chip-form" onSubmit={handleCashOut}>
                    <div className="chip-form-header">
                        <h4>Cash out</h4>
                        <span className="chip-tag">Receive CEDRA</span>
                    </div>
                    <label className="chip-field">
                        <span>Chip amount</span>
                        <input
                            type="number"
                            min="1"
                            step="1"
                            placeholder="500"
                            value={cashAmount}
                            onChange={(e) => {
                                setCashAmount(e.target.value);
                                setStatus(null);
                            }}
                            disabled={!connected || activeAction === "cash"}
                        />
                        <small className="chip-hint">{cashHint}</small>
                    </label>
                    <div className="chip-actions">
                        <button type="submit" className="btn btn-secondary" disabled={cashDisabled}>
                            {activeAction === "cash" ? "Cashing out..." : "Cash out"}
                        </button>
                    </div>
                </form>
            </div>

            {status && <div className={`chip-status ${status.type}`}>{status.message}</div>}
        </section>
    );
}
