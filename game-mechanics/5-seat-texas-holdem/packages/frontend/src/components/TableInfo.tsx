import type { TableConfig, TableState } from "../types";
import { Users, Coins, Clock, Settings } from "lucide-react";
import "./TableInfo.css";

interface TableInfoProps {
    config: TableConfig;
    state: TableState;
    address: string;
}

export function TableInfo({ config, state, address }: TableInfoProps) {
    return (
        <div className="table-info">
            <div className="info-header">
                <Settings size={18} />
                <h3>Table Info</h3>
            </div>

            <div className="info-address">
                <span className="label">Address</span>
                <span className="value mono">{address.slice(0, 10)}...{address.slice(-8)}</span>
            </div>

            <div className="info-grid">
                <div className="info-item">
                    <Coins size={16} />
                    <span className="label">Blinds</span>
                    <span className="value">{config.smallBlind}/{config.bigBlind}</span>
                </div>

                <div className="info-item">
                    <Users size={16} />
                    <span className="label">Buy-In</span>
                    <span className="value">{config.minBuyIn}-{config.maxBuyIn}</span>
                </div>

                <div className="info-item">
                    <Clock size={16} />
                    <span className="label">Hand #</span>
                    <span className="value">{state.handNumber}</span>
                </div>

                {config.ante > 0 && (
                    <div className="info-item">
                        <Coins size={16} />
                        <span className="label">Ante</span>
                        <span className="value">{config.ante}</span>
                    </div>
                )}

                <div className="info-item">
                    <span className="label">Straddle</span>
                    <span className={`value badge ${config.straddleEnabled ? "enabled" : ""}`}>
                        {config.straddleEnabled ? "ON" : "OFF"}
                    </span>
                </div>

                <div className="info-item">
                    <span className="label">Fee</span>
                    <span className="value">{(config.feeBasisPoints / 100).toFixed(1)}%</span>
                </div>
            </div>

            <div className="info-stats">
                <div className="stat">
                    <span className="stat-label">Total Fees Collected</span>
                    <span className="stat-value">{state.totalFeesCollected.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
