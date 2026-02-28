import React, { useEffect, useRef, useState, useMemo } from 'react';
import type { CelestialBody } from '@adaptive-astro/shared/types';
import type { ZodiacWheelData } from '../ZodiacWheel/types';
import './CesiumSkyViewer.css';

// Use global Cesium from CDN
declare const Cesium: any;

// Set Cesium Ion token from environment
if (typeof window !== 'undefined' && Cesium) {
    Cesium.Ion.defaultAccessToken = import.meta.env.VITE_CESIUM_ION_TOKEN || '';
}

export interface CesiumSkyViewerProps {
    planetData?: ZodiacWheelData;
    currentTime?: Date;
    height?: number | string;
    autoRotate?: boolean;
    activeBodies?: string[];
    loading?: boolean;
    eventTitle?: string;
    isPlaying?: boolean;
    animationSpeed?: number;
    onTogglePlay?: () => void;
}

export const CesiumSkyViewer: React.FC<CesiumSkyViewerProps> = ({
    planetData,
    currentTime,
    height = 600,
    autoRotate = false,
    activeBodies = [],
    loading = false,
    eventTitle,
    isPlaying = false,
    animationSpeed = 1,
    onTogglePlay,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const viewerRef = useRef<any>(null);

    // State
    // Removed internal isPlaying state in favor of props
    const [viewMode, setViewMode] = useState<'3d' | '2d' | 'both'>('3d');
    const [cinematicMode, setCinematicMode] = useState(false);
    const [selectedPlanet, setSelectedPlanet] = useState<CelestialBody | null>(null);

    // Refs for animation and camera
    const planetDataRef = useRef<ZodiacWheelData | undefined>(planetData);
    const activeBodiesRef = useRef<string[]>(activeBodies);
    const viewRefHeading = useRef<number>(0);
    const cinematicRef = useRef<number | null>(null);
    const orbitCenterRef = useRef<any>(null);

    // Convert planet longitude to position in the sky as seen from Earth
    // Places planets on a distant sphere that appears as the night sky
    const longitudeToPosition = (longitude: number, time?: Date) => {
        // Convert ecliptic longitude to a position on the celestial sphere
        // Distance is very far so planets appear as points in the sky
        const distance = 100000000; // 100 million meters

        let skyLongitude = longitude - 180; // Center view

        // Compensate for Earth's rotation to show "Inertial" view (planets moving against stars)
        // Otherwise, they just spin with the Earth every 24h
        if (time) {
            const msPerDay = 86400000;
            // Calculate rotation angle based on UTC time of day
            // This roughly cancels out the ECEF rotation of Cesium
            const phase = (time.getTime() % msPerDay) / msPerDay;
            const earthRotation = phase * 360;
            skyLongitude -= earthRotation;
        }

        // Mock inclination
        const skyLatitude = (Math.sin(longitude * Math.PI / 180) * 23.5);

        return Cesium.Cartesian3.fromDegrees(skyLongitude, skyLatitude, distance);
    };

    // Planet colors matching the zodiac wheel
    const getPlanetColor = (planetName: string) => {
        const colorMap: Record<string, any> = {
            Sun: Cesium.Color.GOLD,
            Moon: Cesium.Color.LIGHTGRAY,
            Mercury: Cesium.Color.LIGHTBLUE,
            Venus: Cesium.Color.PINK,
            Mars: Cesium.Color.RED,
            Jupiter: Cesium.Color.ORANGE,
            Saturn: Cesium.Color.KHAKI,
            Uranus: Cesium.Color.CYAN,
            Neptune: Cesium.Color.BLUE,
            Pluto: Cesium.Color.PURPLE,
            Chiron: Cesium.Color.BROWN,
            Lilith: Cesium.Color.BLACK,
            Node: Cesium.Color.TEAL,
        };
        return colorMap[planetName] || Cesium.Color.WHITE;
    };

    // Initialize Cesium viewer
    useEffect(() => {
        if (!containerRef.current || viewerRef.current) return;

        // Check if Cesium is loaded globally (via CDN)
        if (typeof (window as any).Cesium === 'undefined') {
            console.error('Cesium not loaded');
            return;
        }

        let isCleanedUp = false;

        try {
            const viewer = new Cesium.Viewer(containerRef.current, {
                animation: false,
                baseLayerPicker: false,
                fullscreenButton: false, // Hide fullscreen button
                vrButton: false,
                geocoder: false,
                homeButton: false,
                infoBox: false,
                sceneModePicker: false,
                selectionIndicator: true,
                timeline: false,
                navigationHelpButton: false,
                navigationInstructionsInitiallyVisible: false,
                scene3DOnly: true,
                shouldAnimate: false,
                contextOptions: {
                    webgl: {
                        alpha: true,
                    }
                }
            });

            if (isCleanedUp) {
                viewer.destroy();
                return;
            }

            // Remove credit container
            (viewer.cesiumWidget.creditContainer as HTMLElement).style.display = 'none';

            // Configure globe
            viewer.scene.globe.enableLighting = true;
            viewer.scene.globe.showGroundAtmosphere = true;
            viewer.scene.globe.baseColor = Cesium.Color.BLACK;

            // Earth telescope view - looking at the night sky from Earth's surface
            // Position camera on Earth looking outward at the celestial sphere
            viewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(0, 45, 10000), // On Earth surface (45° lat)
                orientation: {
                    heading: Cesium.Math.toRadians(180), // Looking south
                    pitch: Cesium.Math.toRadians(30), // Looking up at 30° above horizon
                    roll: 0,
                },
            });

            // Disable atmosphere for clearer space view
            viewer.scene.skyAtmosphere.show = true;

            // Configure clock
            viewer.clock.clockRange = Cesium.ClockRange.UNBOUNDED;
            viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
            viewer.clock.multiplier = 1;
            viewer.clock.shouldAnimate = false;

            // Handle selection
            viewer.selectedEntityChanged.addEventListener((entity: any) => {
                if (entity && entity.properties && entity.properties.planetData) {
                    setSelectedPlanet(entity.properties.planetData.getValue());
                } else {
                    setSelectedPlanet(null);
                }
            });

            viewerRef.current = viewer;
        } catch (error) {
            console.error('Error initializing Cesium viewer:', error);
        }

        return () => {
            isCleanedUp = true;
            if (viewerRef.current && !viewerRef.current.isDestroyed()) {
                try {
                    viewerRef.current.destroy();
                } catch (e) {
                    console.warn('Error destroying Cesium viewer:', e);
                }
                viewerRef.current = null;
            }
        };
    }, []);




    useEffect(() => {
        planetDataRef.current = planetData;
        activeBodiesRef.current = activeBodies;
    }, [planetData, activeBodies]);

    // Initialize Entities and Animation Loop
    useEffect(() => {
        if (!viewerRef.current) return;

        const viewer = viewerRef.current;
        const entities = viewer.entities;

        // Enable animation based on prop
        viewer.clock.shouldAnimate = isPlaying;
        viewer.clock.multiplier = animationSpeed;

        // 1. Init Entities
        const setupEntities = () => {
            if (!planetData?.planets) return;

            entities.removeAll();

            planetData.planets.forEach((planet) => {
                const color = getPlanetColor(planet.name);
                const isActive = activeBodies.includes(planet.name);
                const position = Cesium.Cartesian3.fromDegrees(0, 0, 100000000);

                entities.add({
                    id: `planet-${planet.name}`,
                    name: planet.name,
                    position: position,
                    billboard: {
                        image: createPlanetIcon(planet.name, color),
                        scale: isActive ? 0.5 : 0.35,
                        verticalOrigin: Cesium.VerticalOrigin.CENTER,
                        color: Cesium.Color.WHITE,
                    },

                });

                if (isActive) {
                    entities.add({
                        id: `halo-${planet.name}`,
                        position: position,
                        ellipse: {
                            semiMajorAxis: 3000000,
                            semiMinorAxis: 3000000,
                            material: new Cesium.ColorMaterialProperty(color.withAlpha(0.05)),
                            outline: true,
                            outlineColor: color.withAlpha(0.3),
                            outlineWidth: 2,
                        }
                    });
                }
            });

            if (activeBodies.length >= 2) {
                entities.add({
                    id: 'alignment-line',
                    name: 'Alignment Line',
                    polyline: {
                        positions: [],
                        width: 3,
                        material: new Cesium.PolylineGlowMaterialProperty({
                            glowPower: 0.3,
                            color: Cesium.Color.GOLD.withAlpha(0.8)
                        }),
                        clampToGround: false
                    }
                });

                for (let i = 0; i < 10; i++) {
                    entities.add({
                        id: `arc-${i}`,
                        polyline: {
                            positions: [],
                            width: 1,
                            material: new Cesium.PolylineGlowMaterialProperty({
                                glowPower: 0.1,
                                color: Cesium.Color.WHITE.withAlpha(0.3)
                            })
                        },
                        show: false
                    });
                }
            }
        };

        setupEntities();

        // 2. Animation Tick Listener
        const onTick = (clock: any) => {
            const now = Cesium.JulianDate.toDate(clock.currentTime);
            const baseData = planetDataRef.current;

            if (!baseData?.planets) return;

            const active = activeBodiesRef.current;

            const baseTime = baseData.timestamp.getTime();
            const currentTimeMs = now.getTime();
            const elapsedMs = currentTimeMs - baseTime;
            const elapsedDays = elapsedMs / (86400000);

            const phase = (currentTimeMs % 86400000) / 86400000;
            const earthRotationDeg = phase * 360;

            const activePlanetsData: any[] = [];
            const activePositions: any[] = [];

            baseData.planets.forEach(planet => {
                let newLongitude = planet.longitude + (planet.speed * elapsedDays);
                newLongitude = ((newLongitude % 360) + 360) % 360;

                // Accurate conversion from Ecliptic to Equatorial Coordinates
                const rad = Math.PI / 180;
                const lambda = newLongitude * rad;
                const beta = ((planet as any).latitude || 0) * rad; // Real Ecliptic Latitude
                const epsilon = 23.44 * rad; // Obliquity of the Ecliptic

                // sin(Dec) = sin(Lat)*cos(Obl) + cos(Lat)*sin(Obl)*sin(Lon)
                const sinDelta = Math.sin(beta) * Math.cos(epsilon) + Math.cos(beta) * Math.sin(epsilon) * Math.sin(lambda);
                const delta = Math.asin(sinDelta); // Declination (Sky Latitude)

                // tan(RA) = (sin(Lon)*cos(Obl) - tan(Lat)*sin(Obl)) / cos(Lon)
                const y = Math.sin(lambda) * Math.cos(epsilon) - Math.tan(beta) * Math.sin(epsilon);
                const x = Math.cos(lambda);
                const alpha = Math.atan2(y, x); // Right Ascension

                const raDeg = alpha * 180 / Math.PI;
                const decDeg = delta * 180 / Math.PI;

                // Adjust for Earth rotation (RA - EarthRotation)
                // Sky view rotates relative to Earth
                const skyLongitude = raDeg - earthRotationDeg - 180; // -180 to align view
                const skyLatitude = decDeg;



                // Physically Exact Distance (Linear Scale)
                const AU = 149597870700.0; // Meters
                const distAU = (planet as any).distanceAU || 1.0;
                const distance = distAU * AU;

                const position = Cesium.Cartesian3.fromDegrees(skyLongitude, skyLatitude, distance);

                const planetEntity = entities.getById(`planet-${planet.name}`);
                if (planetEntity) {
                    (planetEntity.position as any).setValue(position);
                }

                const haloEntity = entities.getById(`halo-${planet.name}`);
                if (haloEntity) {
                    (haloEntity.position as any).setValue(position);
                    // Scale halo radius to maintain constant angular size (e.g. ~1.5 degrees)
                    // Radius = Distance * tan(0.75 deg) ~= Distance * 0.013
                    const radius = distance * 0.015;
                    (haloEntity.ellipse!.semiMajorAxis as any).setValue(radius);
                    (haloEntity.ellipse!.semiMinorAxis as any).setValue(radius);
                }

                if (active.includes(planet.name)) {
                    activePlanetsData.push({ longitude: newLongitude, position });
                    activePositions.push(position);
                }
            });

            const lineEntity = entities.getById('alignment-line');
            if (activePositions.length >= 2 && lineEntity) {
                activePlanetsData.sort((a, b) => a.longitude - b.longitude);
                const sortedPositions = activePlanetsData.map(p => p.position);

                (lineEntity.polyline.positions as any).setValue(sortedPositions);

                for (let i = 0; i < 10; i++) {
                    const arcEntity = entities.getById(`arc-${i}`);
                    if (i < sortedPositions.length - 1 && arcEntity) {
                        const start = sortedPositions[i];
                        const end = sortedPositions[i + 1];
                        (arcEntity.polyline.positions as any).setValue([start, end]);
                        arcEntity.show = true;
                    } else if (arcEntity) {
                        arcEntity.show = false;
                    }
                }
            }
        };

        const removeListener = viewer.clock.onTick.addEventListener(onTick);

        return () => {
            removeListener();
        };
    }, [activeBodies, (planetData?.planets || []).length, isPlaying, animationSpeed]); // Added isPlaying, animationSpeed to dependencies

    // Handle Play State Changes efficiently
    useEffect(() => {
        if (!viewerRef.current) return;
        viewerRef.current.clock.shouldAnimate = isPlaying;
        viewerRef.current.clock.multiplier = animationSpeed;
    }, [isPlaying, animationSpeed]);

    // Sync Cesium Clock when currentTime prop changes
    useEffect(() => {
        if (!viewerRef.current || !currentTime) return;

        const clock = viewerRef.current.clock;
        const currentCesiumTime = Cesium.JulianDate.toDate(clock.currentTime);
        const timeDiff = Math.abs(currentCesiumTime.getTime() - currentTime.getTime());

        // Relaxed sync threshold when playing fast to avoid "fighting" the native clock
        // Strict sync when paused or slow
        const threshold = isPlaying ? (animationSpeed > 100 ? 500000 : 2000) : 100;

        if (timeDiff > threshold) {
            clock.currentTime = Cesium.JulianDate.fromDate(currentTime);
            viewerRef.current.scene.requestRender();
        }
    }, [currentTime, isPlaying, animationSpeed]);

    // Focus camera on active celestial bodies
    useEffect(() => {
        if (!viewerRef.current || !activeBodies.length || !planetData?.planets) return;

        const viewer = viewerRef.current;
        const activePlanets = planetData.planets.filter(p => activeBodies.includes(p.name));

        if (activePlanets.length === 0) return;

        // Collect positions
        const positions: any[] = [];
        activePlanets.forEach(p => {
            const pos = longitudeToPosition(p.longitude);
            positions.push(pos);
        });

        // Create bounding sphere
        const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);

        // Adjust view to fit all active bodies
        // We fly to a point looking at the center of the group
        viewer.camera.flyToBoundingSphere(boundingSphere, {
            offset: new Cesium.HeadingPitchRange(
                viewRefHeading.current || 0, // Keep current heading if possible, or 0
                Cesium.Math.toRadians(-20), // Low angle look
                boundingSphere.radius * 3.0 + 50000000 // Distance with padding
            ),
            duration: 1.5, // Smooth flight
            ellipsoid: viewer.scene.globe.ellipsoid // Standard reference
        });

    }, [activeBodies, planetData]);



    // Track heading to preserve it
    useEffect(() => {
        const interval = setInterval(() => {
            if (viewerRef.current) {
                viewRefHeading.current = viewerRef.current.camera.heading;
            }
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Cinematic orbit animation
    useEffect(() => {
        if (!cinematicMode || !viewerRef.current || !orbitCenterRef.current) {
            if (cinematicRef.current) {
                cancelAnimationFrame(cinematicRef.current);
                cinematicRef.current = null;
            }
            return;
        }

        const viewer = viewerRef.current;
        const center = orbitCenterRef.current;
        let heading = viewer.camera.heading;
        const orbitSpeed = 0.0005; // Radians per frame (~0.03 deg/frame = ~2 deg/sec)

        const animateOrbit = () => {
            if (!cinematicMode || !viewerRef.current) return;

            heading += orbitSpeed;
            if (heading > Math.PI * 2) heading -= Math.PI * 2;

            // Smooth orbit around the center
            viewer.camera.lookAt(
                center,
                new Cesium.HeadingPitchRange(
                    heading,
                    Cesium.Math.toRadians(-15), // Slight downward angle
                    Cesium.Cartesian3.distance(viewer.camera.position, center) // Maintain distance
                )
            );

            cinematicRef.current = requestAnimationFrame(animateOrbit);
        };

        cinematicRef.current = requestAnimationFrame(animateOrbit);

        return () => {
            if (cinematicRef.current) {
                cancelAnimationFrame(cinematicRef.current);
                cinematicRef.current = null;
            }
            // Unlock camera when exiting cinematic mode
            if (viewerRef.current) {
                viewerRef.current.camera.lookAtTransform(Cesium.Matrix4.IDENTITY);
            }
        };
    }, [cinematicMode]);

    // Auto-enable cinematic mode when event is selected
    useEffect(() => {
        if (activeBodies.length >= 2 && planetData?.planets) {
            const activePlanets = planetData.planets.filter(p => activeBodies.includes(p.name));
            if (activePlanets.length >= 2) {
                // Calculate center for orbit
                const positions = activePlanets.map(p => longitudeToPosition(p.longitude));
                const boundingSphere = Cesium.BoundingSphere.fromPoints(positions);
                orbitCenterRef.current = boundingSphere.center;

                // Enable cinematic mode after flight completes
                setTimeout(() => setCinematicMode(true), 2000);
            }
        } else {
            setCinematicMode(false);
            orbitCenterRef.current = null;
        }
    }, [activeBodies, planetData]);

    const toggleCinematicMode = () => {
        setCinematicMode(prev => !prev);
    };

    const handlePlayPause = () => {
        if (onTogglePlay) {
            onTogglePlay();
        }
    };

    const handleSpeedChange = (multiplier: number) => {
        if (!viewerRef.current) return;
        viewerRef.current.clock.multiplier = multiplier;
    };

    const handleZoomIn = () => {
        if (!viewerRef.current) return;
        const camera = viewerRef.current.camera;
        camera.zoomIn(camera.positionCartographic.height * 0.5);
    };

    const handleZoomOut = () => {
        if (!viewerRef.current) return;
        const camera = viewerRef.current.camera;
        camera.zoomOut(camera.positionCartographic.height * 0.5);
    };

    const handleResetView = () => {
        if (!viewerRef.current) return;
        viewerRef.current.camera.flyTo({
            destination: Cesium.Cartesian3.fromDegrees(0, 45, 10000),
            orientation: {
                heading: Cesium.Math.toRadians(180),
                pitch: Cesium.Math.toRadians(30),
                roll: 0,
            },
            duration: 2,
        });
    };

    // Check if data is loading based on prop or missing data
    const isLoadingData = useMemo(() => {
        if (loading) return true;
        if (!planetData?.planets) return true;
        return false;
    }, [loading, planetData]);

    if (!import.meta.env.VITE_CESIUM_ION_TOKEN || import.meta.env.VITE_CESIUM_ION_TOKEN === 'your_cesium_ion_token_here') {
        return (
            <div className="cesium-sky-viewer cesium-sky-viewer--error" style={{ height }}>
                <div className="cesium-error-message">
                    <h3>⚠️ Cesium Ion Token Required</h3>
                    <p>To use the 3D sky viewer, you need a free Cesium Ion access token.</p>
                    <ol>
                        <li>Create a free account at <a href="https://ion.cesium.com/" target="_blank" rel="noopener noreferrer">ion.cesium.com</a></li>
                        <li>Generate an access token</li>
                        <li>Add it to your <code>.env.local</code> file as <code>VITE_CESIUM_ION_TOKEN</code></li>
                    </ol>
                </div>
            </div>
        );
    }

    return (
        <div className="cesium-sky-viewer" style={{ height, position: 'relative' }}>
            <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

            {/* Loading Overlay */}
            {isLoadingData && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    color: 'white',
                    zIndex: 2000,
                    backdropFilter: 'blur(2px)',
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div className="spinner" style={{
                            border: '3px solid rgba(255,255,255,0.3)',
                            borderTop: '3px solid white',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            animation: 'spin 1s linear infinite',
                            margin: '0 auto 10px auto'
                        }} />
                        <span>Loading planetary data...</span>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                    </div>
                </div>
            )}

            {/* Event Title Overlay */}
            {eventTitle && (
                <div style={{
                    position: 'absolute',
                    top: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    textAlign: 'center',
                    zIndex: 900,
                    pointerEvents: 'none'
                }}>
                    <div style={{
                        background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(30,30,60,0.9) 100%)',
                        padding: '15px 30px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 215, 0, 0.4)',
                        boxShadow: '0 4px 30px rgba(0,0,0,0.5), 0 0 40px rgba(255, 215, 0, 0.1)'
                    }}>
                        <h2 style={{
                            margin: 0,
                            fontSize: '24px',
                            fontWeight: 'bold',
                            color: 'white',
                            textShadow: '0 2px 10px rgba(255, 215, 0, 0.5)',
                            letterSpacing: '1px'
                        }}>
                            ✨ {eventTitle}
                        </h2>
                        {cinematicMode && (
                            <div style={{
                                marginTop: '8px',
                                fontSize: '12px',
                                color: 'rgba(255, 215, 0, 0.8)',
                                textTransform: 'uppercase',
                                letterSpacing: '2px'
                            }}>
                                🎬 Cinematic View
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Custom controls overlay */}
            <div className="cesium-controls">
                <div className="cesium-controls__group">
                    <button
                        className="cesium-control-btn"
                        onClick={handlePlayPause}
                        title={isPlaying ? 'Pause' : 'Play'}
                    >
                        {isPlaying ? '⏸' : '▶️'}
                    </button>

                    <select
                        className="cesium-control-select"
                        onChange={(e) => handleSpeedChange(Number(e.target.value))}
                        defaultValue="1"
                    >
                        <option value="1">1x</option>
                        <option value="10">10x</option>
                        <option value="100">100x</option>
                        <option value="1000">1000x</option>
                        <option value="86400">1 day/sec</option>
                    </select>

                    {/* Cinematic Mode Toggle */}
                    <button
                        className="cesium-control-btn"
                        onClick={toggleCinematicMode}
                        title={cinematicMode ? 'Exit Cinematic Mode' : 'Cinematic Mode'}
                        style={{
                            background: cinematicMode ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 0, 0, 0.6)',
                            border: cinematicMode ? '2px solid gold' : '1px solid rgba(255,255,255,0.3)'
                        }}
                    >
                        🎬
                    </button>
                </div>

                <div className="cesium-controls__group">
                    <button
                        className="cesium-control-btn"
                        onClick={handleZoomIn}
                        title="Zoom In"
                    >
                        🔍+
                    </button>
                    <button
                        className="cesium-control-btn"
                        onClick={handleZoomOut}
                        title="Zoom Out"
                    >
                        🔍−
                    </button>
                    <button
                        className="cesium-control-btn"
                        onClick={handleResetView}
                        title="Reset View"
                    >
                        🏠
                    </button>
                </div>
            </div>

            {/* Selected Planet Details Overlay */}
            {selectedPlanet && (
                <div className="cesium-details-overlay" style={{
                    position: 'absolute',
                    top: '20px',
                    left: '20px',
                    backgroundColor: 'rgba(0, 0, 0, 0.85)',
                    padding: '20px',
                    borderRadius: '12px',
                    color: 'white',
                    width: '280px',
                    zIndex: 1000,
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '10px' }}>
                        <h3 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: getPlanetColor(selectedPlanet.name).toCssColorString() }}>{selectedPlanet.name}</h3>
                        <button
                            onClick={() => {
                                if (viewerRef.current) viewerRef.current.selectedEntity = undefined;
                                setSelectedPlanet(null);
                            }}
                            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: '20px', padding: '0 5px' }}
                        >✕</button>
                    </div>

                    <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Zodiac Sign</span>
                            <span style={{ fontWeight: '500' }}>{selectedPlanet.zodiacSign.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Ecliptic Longitude</span>
                            <span style={{ fontFamily: 'monospace' }}>{selectedPlanet.longitude.toFixed(2)}°</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'rgba(255,255,255,0.6)' }}>Orbital Speed</span>
                            <span style={{ fontFamily: 'monospace' }}>{selectedPlanet.speed.toFixed(3)}°/d</span>
                        </div>

                        {selectedPlanet.isRetrograde && (
                            <div style={{
                                background: 'rgba(255, 99, 99, 0.2)',
                                color: '#ff8888',
                                marginTop: '15px',
                                padding: '8px',
                                borderRadius: '6px',
                                textAlign: 'center',
                                fontWeight: 'bold',
                                border: '1px solid rgba(255, 99, 99, 0.3)'
                            }}>
                                ℞ Retrograde Motion
                            </div>
                        )}

                        {activeBodies.includes(selectedPlanet.name) && (
                            <div style={{
                                background: 'rgba(255, 215, 0, 0.2)',
                                color: '#ffd700',
                                marginTop: '10px',
                                padding: '8px',
                                borderRadius: '6px',
                                textAlign: 'center',
                                fontSize: '13px',
                                border: '1px solid rgba(255, 215, 0, 0.3)'
                            }}>
                                ✨ Featured Event Body
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Info overlay */}
            {planetData && (
                <div className="cesium-info">
                    <div className="cesium-info__item">
                        <span className="cesium-info__label">Planets:</span>
                        <span className="cesium-info__value">{planetData.planets.length}</span>
                    </div>
                    <div className="cesium-info__item">
                        <span className="cesium-info__label">Time:</span>
                        <span className="cesium-info__value">
                            {(currentTime || new Date()).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                            })}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to create planet icon
function createPlanetIcon(name: string, color: any): string {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128; // Large canvas for high-res icons
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    // Clear canvas
    ctx.clearRect(0, 0, 128, 128);

    const centerX = 64;
    const centerY = 64;
    const radius = 42; // Sphere radius

    // 1. Draw Background Features (e.g. Saturn Rings)
    if (name === 'Saturn') {
        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(Math.PI / 6); // Tilt 30 deg
        ctx.scale(1, 0.3); // Flatten ellipse

        // Ring Gradient
        const ringGrad = ctx.createRadialGradient(0, 0, radius * 1.1, 0, 0, radius * 2.3);
        ringGrad.addColorStop(0, 'rgba(0,0,0,0)'); // Gap
        ringGrad.addColorStop(0.2, color.withAlpha(0.6).toCssColorString());
        ringGrad.addColorStop(0.5, color.withAlpha(0.3).toCssColorString()); // Cassini hint
        ringGrad.addColorStop(0.6, color.withAlpha(0.6).toCssColorString());
        ringGrad.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.beginPath();
        ctx.arc(0, 0, radius * 2.3, 0, Math.PI * 2);
        ctx.fillStyle = ringGrad;
        ctx.fill();
        ctx.restore();
    }

    // 2. Main Sphere Gradient (3D Shading Effect)
    // Light source from top-left
    const sphereGrad = ctx.createRadialGradient(
        centerX - radius / 2.5, centerY - radius / 2.5, radius / 10,
        centerX, centerY, radius
    );
    try {
        const highlight = color.brighten(0.6, new Cesium.Color()).toCssColorString();
        const base = color.toCssColorString();
        const shadow = color.darken(0.6, new Cesium.Color()).toCssColorString();

        sphereGrad.addColorStop(0, highlight);
        sphereGrad.addColorStop(0.4, base);
        sphereGrad.addColorStop(1, shadow);
    } catch (e) {
        // Fallback if color manipulation fails
        sphereGrad.addColorStop(0, 'white');
        sphereGrad.addColorStop(1, color.toCssColorString());
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = sphereGrad;
    ctx.fill();

    // 3. Surface Details (Clipped to sphere)
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.clip(); // Clip details to sphere

    // Jupiter Bands
    if (name === 'Jupiter') {
        ctx.fillStyle = color.darken(0.3, new Cesium.Color()).withAlpha(0.3).toCssColorString();
        ctx.fillRect(0, centerY - 12, 128, 6);
        ctx.fillRect(0, centerY + 4, 128, 8);
        ctx.fillRect(0, centerY + 20, 128, 3);
    }

    // Mars Patches
    if (name === 'Mars') {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.arc(centerX - 12, centerY + 10, 12, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(centerX + 18, centerY - 12, 9, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(centerX, centerY - 25, 6, 0, Math.PI * 2); ctx.fill(); // Polar cap hint? No just dark patch
    }

    // Moon Craters
    if (name === 'Moon') {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        const craters = [[-15, -10, 6], [10, 15, 8], [20, -5, 4], [-5, 20, 5]];
        craters.forEach(([x, y, r]) => {
            ctx.beginPath(); ctx.arc(centerX + x, centerY + y, r, 0, Math.PI * 2); ctx.fill();
        });
    }

    // Earth-like features for others? 
    // Just simple shading is fine.

    ctx.restore();

    return canvas.toDataURL();
}

export default CesiumSkyViewer;
