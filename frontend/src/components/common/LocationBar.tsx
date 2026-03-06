/**
 * LocationBar — компонент выбора локации для астрологических расчётов.
 *
 * Показывает текущий город + флаг страны, кнопку "Определить GPS",
 * и поиск города через Nominatim.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLocationStore, UserLocation } from '../../store/locationStore';
import { useLocationDetect, searchCity } from '../../hooks/useLocationDetect';
import './LocationBar.css';

// Флаг страны из кода (ISO 3166-1 alpha-2 → emoji)
function countryFlag(code?: string): string {
    if (!code || code.length !== 2) return '🌍';
    const offset = 127397; // 'A' regional indicator = 127462
    return String.fromCodePoint(...code.split('').map((c) => c.charCodeAt(0) + offset));
}

interface LocationBarProps {
    /** Если true — только компактный inline-вид (без popup) */
    compact?: boolean;
    /** Коллбэк при смене локации */
    onChange?: (loc: UserLocation) => void;
}

export const LocationBar: React.FC<LocationBarProps> = ({ compact = false, onChange }) => {
    const { location, isDetecting, detectionError } = useLocationStore();
    const { setLocation } = useLocationStore();
    const { detectLocation } = useLocationDetect();

    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<UserLocation[]>([]);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Закрыть popup при клике вне
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Фокус на input при открытии
    useEffect(() => {
        if (open) {
            setTimeout(() => inputRef.current?.focus(), 50);
            setQuery('');
            setResults([]);
        }
    }, [open]);

    const handleSearch = useCallback((q: string) => {
        setQuery(q);
        setSearchError(null);

        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!q.trim() || q.length < 2) {
            setResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            setSearching(true);
            try {
                const found = await searchCity(q);
                setResults(found);
                if (found.length === 0) setSearchError('No cities found. Try another name.');
            } catch {
                setSearchError('Search failed. Check your connection.');
            } finally {
                setSearching(false);
            }
        }, 400);
    }, []);

    const handleSelect = (loc: UserLocation) => {
        setLocation(loc);
        onChange?.(loc);
        setOpen(false);
        setQuery('');
        setResults([]);
    };

    const handleAutoDetect = async () => {
        setOpen(false);
        await detectLocation();
    };

    return (
        <div className={`location-bar ${compact ? 'location-bar--compact' : ''}`} ref={wrapperRef}>
            {/* Trigger button */}
            <button
                className="location-bar__trigger"
                onClick={() => setOpen((v) => !v)}
                title="Change location"
                aria-label="Change location"
            >
                <span className="location-bar__flag">{countryFlag(location.countryCode)}</span>
                <span className="location-bar__city">{location.city || `${location.latitude.toFixed(2)}°`}</span>
                {isDetecting && <span className="location-bar__spinner" />}
                <span className="location-bar__chevron">{open ? '▲' : '▼'}</span>
            </button>

            {/* Popup */}
            {open && (
                <div className="location-bar__popup">
                    <div className="location-bar__popup-header">
                        <span className="location-bar__popup-title">📍 Location for calculations</span>
                        <button
                            className="location-bar__popup-close"
                            onClick={() => setOpen(false)}
                            aria-label="Close"
                        >
                            ✕
                        </button>
                    </div>

                    {/* Current location chip */}
                    <div className="location-bar__current">
                        <span className="location-bar__current-flag">{countryFlag(location.countryCode)}</span>
                        <div className="location-bar__current-info">
                            <span className="location-bar__current-city">{location.city || 'Unknown'}</span>
                            <span className="location-bar__current-coords">
                                {location.latitude.toFixed(4)}°, {location.longitude.toFixed(4)}°
                                &nbsp;·&nbsp;{location.timezone}
                            </span>
                        </div>
                    </div>

                    {/* GPS detect button */}
                    <button
                        className="location-bar__gps-btn"
                        onClick={handleAutoDetect}
                        disabled={isDetecting}
                    >
                        {isDetecting ? (
                            <>
                                <span className="location-bar__spinner location-bar__spinner--inline" />
                                Detecting...
                            </>
                        ) : (
                            <>🛰️ Detect my location</>
                        )}
                    </button>

                    {detectionError && (
                        <div className="location-bar__error">{detectionError}</div>
                    )}

                    {/* Search */}
                    <div className="location-bar__search-wrap">
                        <input
                            ref={inputRef}
                            className="location-bar__search"
                            type="text"
                            placeholder="Search city…"
                            value={query}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoComplete="off"
                        />
                        {searching && <span className="location-bar__spinner location-bar__spinner--search" />}
                    </div>

                    {searchError && (
                        <div className="location-bar__search-hint">{searchError}</div>
                    )}

                    {results.length > 0 && (
                        <ul className="location-bar__results">
                            {results.map((r, i) => (
                                <li
                                    key={i}
                                    className="location-bar__result-item"
                                    onClick={() => handleSelect(r)}
                                >
                                    <span className="location-bar__result-flag">{countryFlag(r.countryCode)}</span>
                                    <span className="location-bar__result-name">{r.city}</span>
                                    <span className="location-bar__result-country">{r.country}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};
