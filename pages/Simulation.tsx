import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { 
  Play, Pause, Rewind, FastForward, Info, MapPin, Wind, CloudRain, 
  Droplets, Loader2, Layers, Flame, Waves, CloudLightning, Thermometer, 
  MousePointer2, AlertTriangle, ShieldAlert, Activity
} from 'lucide-react';
import { DisasterType } from '../types';

// --- Advanced Shaders ---

const buildingVertexShader = `
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying float vHeight;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    vPosition = position;
    vec4 worldPosition = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vHeight = worldPosition.y;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const buildingFragmentShader = `
  uniform vec3 baseColor;
  uniform vec3 topColor;
  uniform vec3 highlightColor;
  uniform float scanHeight;
  uniform float floodLevel;
  uniform float heatmapIntensity;
  uniform float time;
  
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  varying float vHeight;
  varying vec2 vUv;
  
  void main() {
    // 1. Vertical Gradient (Base aesthetics)
    float heightFactor = smoothstep(0.0, 60.0, vHeight);
    vec3 color = mix(baseColor, topColor, heightFactor);
    
    // 2. LIDAR Scanline effect
    float scanline = sin(vHeight * 0.5 - scanHeight * 3.0) * 0.5 + 0.5;
    scanline = pow(scanline, 40.0) * 0.8; 
    color += highlightColor * scanline;

    // 3. Structural Grid pattern
    float grid = step(0.96, fract(vPosition.x * 0.2)) + step(0.96, fract(vPosition.y * 0.5));
    color += vec3(grid * 0.15);

    // 4. Windows (Procedural)
    if (vWorldPosition.y > floodLevel) {
        float winX = step(0.4, fract(vPosition.x * 0.5));
        float winY = step(0.4, fract(vPosition.y * 0.5));
        float window = winX * winY;
        
        // Random lights flickering
        float flicker = fract(sin(dot(vWorldPosition.xz, vec2(12.9898, 78.233))) * 43758.5453 + time * 0.5);
        float lightsOn = step(0.4, flicker);
        
        vec3 winColor = mix(vec3(0.05), vec3(1.0, 0.9, 0.5), lightsOn);
        color = mix(color, winColor, window * 0.6 * (1.0 - heatmapIntensity));
    }

    // 5. Flood / Damage Reaction
    if (vWorldPosition.y < floodLevel) {
       float glitch = step(0.5, sin(vWorldPosition.y * 20.0 + time * 10.0));
       vec3 damageColor = vec3(0.0, 0.5, 1.0); // Underwater blue
       color = mix(color, damageColor, 0.7);
       color += vec3(glitch * 0.1); // Digital glitch effect underwater
    }

    // 6. Heatmap Overlay (Structural Stress / Risk)
    if (heatmapIntensity > 0.0) {
       // Mock stress based on height and noise
       float noise = fract(sin(dot(vWorldPosition.xz, vec2(12.9898, 78.233))) * 43758.5453);
       float stress = smoothstep(0.3, 0.8, noise);
       
       vec3 cold = vec3(0.0, 1.0, 0.5);
       vec3 hot = vec3(1.0, 0.0, 0.2);
       vec3 heatColor = mix(cold, hot, stress);
       
       color = mix(color, heatColor, heatmapIntensity * 0.8);
       
       // Pulse high stress areas
       if (stress > 0.7) {
           color += vec3(1.0, 0.0, 0.0) * sin(time * 5.0) * 0.2;
       }
    }

    gl_FragColor = vec4(color, 0.95);
  }
`;

const fireVertexShader = `
  uniform float time;
  attribute float size;
  attribute float offset;
  attribute vec3 randomDir;
  varying float vAlpha;
  
  void main() {
    float t = time + offset;
    float loopT = mod(t * 15.0, 40.0); // Lifecycle 0 -> 40
    float normLife = loopT / 40.0;
    
    vec3 pos = position;
    // Rise up
    pos.y += loopT;
    // Drift with wind/random
    pos.x += sin(t * 2.0 + offset) * 2.0 + randomDir.x * loopT * 0.2;
    pos.z += cos(t * 1.5 + offset) * 2.0 + randomDir.z * loopT * 0.2;
    
    vAlpha = 1.0 - normLife; // Fade out

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (200.0 / -mvPosition.z) * vAlpha;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fireFragmentShader = `
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    
    // Fire gradient: White center -> Yellow -> Red -> Smoke
    vec3 color = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 1.0, 0.5), vAlpha * vAlpha);
    gl_FragColor = vec4(color, vAlpha * 0.8);
  }
`;

const Simulation: React.FC = () => {
  // State
  const [intensity, setIntensity] = useState(0); // 0 to 100
  const [isPlaying, setIsPlaying] = useState(false);
  const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
  const [loadingStep, setLoadingStep] = useState<string>("Initializing...");
  
  // Modes
  const [activeDisaster, setActiveDisaster] = useState<DisasterType>(DisasterType.FLOOD);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  // Interaction
  const [hoveredBuilding, setHoveredBuilding] = useState<{id: number, height: number, occupants: number, integrity: number} | null>(null);

  // Refs
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // Objects Refs
  const buildingMeshRef = useRef<THREE.InstancedMesh | null>(null);
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  const fireSystemRef = useRef<THREE.Points | null>(null);
  const rainSystemRef = useRef<THREE.Points | null>(null);
  
  // Shader Uniforms Refs
  const buildingUniformsRef = useRef<any>(null);
  const fireUniformsRef = useRef<any>(null);

  // Interaction Refs
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  const cameraAngle = useRef({ theta: Math.PI / 4, phi: Math.PI / 6, radius: 180 });
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  // --- Listen for AI Control Events ---
  useEffect(() => {
    const handleAIControl = (event: CustomEvent) => {
        const { command, intensity: aiIntensity } = event.detail;
        console.log("Sim Control Received:", command, aiIntensity);
        
        if (command === 'START') setIsPlaying(true);
        if (command === 'STOP') setIsPlaying(false);
        if (command === 'RESET') setIntensity(0);
        if (command === 'SET_INTENSITY' && aiIntensity !== undefined) {
            setIntensity(aiIntensity);
        }
    };
    window.addEventListener('aiden-sim', handleAIControl as EventListener);
    return () => window.removeEventListener('aiden-sim', handleAIControl as EventListener);
  }, []);

  // --- 1. Get Location ---
  useEffect(() => {
    setLoadingStep("Acquiring GPS Signal...");
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setLoadingStep("Processing LIDAR Data...");
        },
        (err) => {
          setLocation({ lat: 34.0522, lng: -118.2437 }); // Default
          setLoadingStep("Using Cached Topology...");
        }
      );
    } else {
        setLocation({ lat: 34.0522, lng: -118.2437 });
    }
  }, []);

  // --- 2. Simulation Loop (Timer) ---
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isPlaying) {
      interval = setInterval(() => {
        setIntensity(prev => (prev >= 100 ? 0 : prev + 0.5));
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  // --- 3. Three.js Scene Setup ---
  useEffect(() => {
    if (!mountRef.current || !location) return;

    // --- Scene Init ---
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020617); // Darker slate
    scene.fog = new THREE.FogExp2(0x020617, 0.003);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);
    cameraRef.current = camera;
    updateCameraPosition();

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0x404040, 3);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0x3b82f6, 1.5);
    dirLight.position.set(100, 200, 50);
    scene.add(dirLight);
    // Add red light for fire mode
    const hazardLight = new THREE.PointLight(0xff0000, 0, 200);
    hazardLight.position.set(0, 50, 0);
    scene.add(hazardLight);

    // --- City Generation ---
    const blockSize = 8;
    const citySize = 24; // 24x24 blocks
    const totalBuildings = citySize * citySize;
    
    const geometry = new THREE.BoxGeometry(blockSize * 0.85, 1, blockSize * 0.85);
    geometry.translate(0, 0.5, 0); // Pivot at bottom

    const material = new THREE.ShaderMaterial({
        uniforms: {
            baseColor: { value: new THREE.Color(0x1e293b) },
            topColor: { value: new THREE.Color(0x3b82f6) },
            highlightColor: { value: new THREE.Color(0x00f3ff) },
            scanHeight: { value: 0 },
            floodLevel: { value: 0 },
            heatmapIntensity: { value: 0 },
            time: { value: 0 }
        },
        vertexShader: buildingVertexShader,
        fragmentShader: buildingFragmentShader,
        transparent: false // Opaque for depth testing
    });
    buildingUniformsRef.current = material.uniforms;

    const instancedMesh = new THREE.InstancedMesh(geometry, material, totalBuildings);
    const matrix = new THREE.Matrix4();
    const dummy = new THREE.Object3D();
    
    // Seeded random for consistent city
    const seed = Math.abs(location.lat * 1000 + location.lng);
    const random = (offset: number) => {
        const x = Math.sin(seed + offset) * 10000;
        return x - Math.floor(x);
    };

    let idx = 0;
    const buildingHeights: number[] = [];

    for (let x = -citySize/2; x < citySize/2; x++) {
        for (let z = -citySize/2; z < citySize/2; z++) {
            const r = random(idx);
            // City layout: taller in middle
            const dist = Math.sqrt(x*x + z*z);
            let h = Math.max(0, 15 - dist) * 4 + r * 30 + 5;
            if (h < 5) h = 2; // Flat areas
            
            buildingHeights.push(h);

            dummy.position.set(x * blockSize, 0, z * blockSize);
            dummy.scale.set(1, h, 1);
            dummy.updateMatrix();
            instancedMesh.setMatrixAt(idx, dummy.matrix);
            idx++;
        }
    }
    // Store height data in userData for raycasting lookup
    instancedMesh.userData = { heights: buildingHeights };
    scene.add(instancedMesh);
    buildingMeshRef.current = instancedMesh;

    // --- Ground ---
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({ 
        color: 0x0f172a, 
        roughness: 0.9, 
        metalness: 0.1 
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    scene.add(ground);

    const gridHelper = new THREE.GridHelper(600, 60, 0x1e293b, 0x0f172a);
    scene.add(gridHelper);

    // --- Water Plane (Flood Mode) ---
    const waterGeo = new THREE.PlaneGeometry(600, 600);
    const waterMat = new THREE.MeshPhysicalMaterial({
        color: 0x0ea5e9, // Sky blue
        transparent: true,
        opacity: 0.7,
        roughness: 0.05,
        metalness: 0.9,
        transmission: 0.4,
    });
    const water = new THREE.Mesh(waterGeo, waterMat);
    water.rotation.x = -Math.PI / 2;
    water.position.y = -5; // Start hidden
    scene.add(water);
    waterMeshRef.current = water;

    // --- Fire Particles (Fire Mode) ---
    const fireCount = 1500;
    const fireGeo = new THREE.BufferGeometry();
    const firePos = new Float32Array(fireCount * 3);
    const fireSizes = new Float32Array(fireCount);
    const fireOffsets = new Float32Array(fireCount);
    const fireDirs = new Float32Array(fireCount * 3);

    for(let i=0; i<fireCount; i++) {
        // Pick a random building to burn
        const bIdx = Math.floor(Math.random() * totalBuildings);
        const matrix = new THREE.Matrix4();
        instancedMesh.getMatrixAt(bIdx, matrix);
        const pos = new THREE.Vector3();
        pos.setFromMatrixPosition(matrix);
        const scale = new THREE.Vector3();
        scale.setFromMatrixScale(matrix);

        // Emit from top of building
        firePos[i*3] = pos.x + (Math.random()-0.5)*5;
        firePos[i*3+1] = scale.y; // Height of building
        firePos[i*3+2] = pos.z + (Math.random()-0.5)*5;
        
        fireSizes[i] = Math.random() * 8 + 4;
        fireOffsets[i] = Math.random() * 100;
        fireDirs[i*3] = (Math.random()-0.5);
        fireDirs[i*3+1] = 1;
        fireDirs[i*3+2] = (Math.random()-0.5);
    }
    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
    fireGeo.setAttribute('size', new THREE.BufferAttribute(fireSizes, 1));
    fireGeo.setAttribute('offset', new THREE.BufferAttribute(fireOffsets, 1));
    fireGeo.setAttribute('randomDir', new THREE.BufferAttribute(fireDirs, 3));

    const fireShaderMat = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: fireVertexShader,
        fragmentShader: fireFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    fireUniformsRef.current = fireShaderMat.uniforms;
    const fireSystem = new THREE.Points(fireGeo, fireShaderMat);
    fireSystem.visible = false;
    scene.add(fireSystem);
    fireSystemRef.current = fireSystem;

    // --- Rain (Storm Mode) ---
    const rainGeo = new THREE.BufferGeometry();
    const rainCount = 5000;
    const rainArr = new Float32Array(rainCount * 3);
    for(let i=0; i<rainCount*3; i++) {
        rainArr[i] = (Math.random() - 0.5) * 600;
        if(i % 3 === 1) rainArr[i] = Math.random() * 300; // Y
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainArr, 3));
    const rainMat = new THREE.PointsMaterial({ color: 0xa5b4fc, size: 0.6, transparent: true, opacity: 0.6 });
    const rainSystem = new THREE.Points(rainGeo, rainMat);
    rainSystem.visible = false;
    scene.add(rainSystem);
    rainSystemRef.current = rainSystem;

    setLoadingStep("");

    // --- Animation Loop ---
    let frameId: number;
    const animate = () => {
        const time = performance.now() * 0.001;
        
        // Update Building Uniforms
        if (buildingUniformsRef.current) {
            buildingUniformsRef.current.time.value = time;
            buildingUniformsRef.current.scanHeight.value = time;
        }

        // Fire Animation
        if (fireUniformsRef.current) {
            fireUniformsRef.current.time.value = time;
        }

        // Rain Animation
        if (rainSystemRef.current && rainSystemRef.current.visible) {
            const positions = rainSystemRef.current.geometry.attributes.position.array as Float32Array;
            for(let i=1; i<positions.length; i+=3) {
                positions[i] -= 3.0; // Fast rain
                if (positions[i] < 0) positions[i] = 300;
            }
            rainSystemRef.current.geometry.attributes.position.needsUpdate = true;
        }

        // Dynamic Light for Fire
        if (activeDisaster === DisasterType.FIRE && intensity > 20) {
            hazardLight.intensity = (Math.sin(time * 10) * 0.5 + 0.5) * 2 + 1; // Flicker
        } else {
            hazardLight.intensity = 0;
        }

        renderer.render(scene, camera);
        frameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
        cancelAnimationFrame(frameId);
        mountRef.current?.removeChild(renderer.domElement);
        renderer.dispose();
    };
  }, [location]); 

  // --- 4. Handle State Updates (Disaster Modes) ---
  useEffect(() => {
    if (!waterMeshRef.current || !fireSystemRef.current || !rainSystemRef.current || !buildingUniformsRef.current) return;

    const normalizedIntensity = intensity / 100;

    // Reset visibility
    waterMeshRef.current.visible = false;
    fireSystemRef.current.visible = false;
    rainSystemRef.current.visible = false;
    buildingUniformsRef.current.floodLevel.value = -10; // Reset flood

    // Flood Mode
    if (activeDisaster === DisasterType.FLOOD) {
        waterMeshRef.current.visible = true;
        const targetHeight = normalizedIntensity * 60; // Max height 60
        waterMeshRef.current.position.y = targetHeight;
        buildingUniformsRef.current.floodLevel.value = targetHeight;
        // Color tweak
        sceneRef.current!.background = new THREE.Color(0x020617);
        sceneRef.current!.fog = new THREE.FogExp2(0x020617, 0.003);
    } 
    
    // Fire Mode
    else if (activeDisaster === DisasterType.FIRE) {
        if (intensity > 10) fireSystemRef.current.visible = true;
        // Fire intensity roughly maps to density/brightness (handled in shader via time/scale logic conceptually, but here we simplify)
        sceneRef.current!.background = new THREE.Color(0x1a0500); // Reddish sky
        sceneRef.current!.fog = new THREE.FogExp2(0x1a0500, 0.005); // Smoky fog
    }

    // Storm Mode
    else if (activeDisaster === DisasterType.STORM) {
        if (intensity > 10) rainSystemRef.current.visible = true;
        // Flood rises slightly in storm
        if (intensity > 50) {
            waterMeshRef.current.visible = true;
            waterMeshRef.current.position.y = (intensity - 50) * 0.2; 
        }
        sceneRef.current!.background = new THREE.Color(0x0f172a); 
        sceneRef.current!.fog = new THREE.FogExp2(0x0f172a, 0.008 + (normalizedIntensity * 0.01)); // Dense fog
    }

    // Heatmap
    buildingUniformsRef.current.heatmapIntensity.value = showHeatmap ? 1.0 : 0.0;

  }, [intensity, activeDisaster, showHeatmap]);


  // --- 5. Interaction (Camera & Raycast) ---
  function updateCameraPosition() {
      if (!cameraRef.current) return;
      const { theta, phi, radius } = cameraAngle.current;
      cameraRef.current.position.x = radius * Math.sin(phi) * Math.cos(theta);
      cameraRef.current.position.y = radius * Math.cos(phi);
      cameraRef.current.position.z = radius * Math.sin(phi) * Math.sin(theta);
      cameraRef.current.lookAt(0, 10, 0);
  }

  const handleMouseMove = (e: React.MouseEvent) => {
      // 1. Camera Drag
      if (isDragging.current) {
          const deltaX = e.clientX - previousMousePosition.current.x;
          const deltaY = e.clientY - previousMousePosition.current.y;
          previousMousePosition.current = { x: e.clientX, y: e.clientY };
          cameraAngle.current.theta -= deltaX * 0.01;
          cameraAngle.current.phi -= deltaY * 0.01;
          cameraAngle.current.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.1, cameraAngle.current.phi));
          updateCameraPosition();
          return;
      }

      // 2. Raycasting for Hover
      if (!mountRef.current || !cameraRef.current || !buildingMeshRef.current) return;
      
      const rect = mountRef.current.getBoundingClientRect();
      mouse.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.current.setFromCamera(mouse.current, cameraRef.current);
      const intersects = raycaster.current.intersectObject(buildingMeshRef.current);

      if (intersects.length > 0) {
          const instanceId = intersects[0].instanceId;
          if (instanceId !== undefined && buildingMeshRef.current.userData.heights) {
              // Simulate data
              const h = buildingMeshRef.current.userData.heights[instanceId];
              // Random but deterministic based on ID
              const occupants = Math.floor((instanceId * 9301 + 123) % 50) * Math.floor(h);
              const structuralIntegrity = Math.max(0, 100 - (activeDisaster === DisasterType.FLOOD ? Math.max(0, intensity - 20) : intensity * 0.8));
              
              setHoveredBuilding({
                  id: instanceId,
                  height: Math.floor(h * 3), // meters
                  occupants,
                  integrity: Math.floor(structuralIntegrity)
              });
          }
      } else {
          setHoveredBuilding(null);
      }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
      isDragging.current = true;
      previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => { isDragging.current = false; };


  if (!location) {
      return (
          <div className="h-[calc(100vh-8rem)] w-full rounded-xl bg-slate-900 border border-slate-700 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
              <p className="font-mono animate-pulse">{loadingStep}</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-2 font-display tracking-wide">
            <Layers className="text-cyan-500" /> DIGITAL TWIN
          </h1>
          <p className="text-slate-400 flex items-center gap-2 mt-1">
            <MapPin size={14} className="text-red-500" />
            <span className="font-mono text-sm tracking-wider">
                LAT: {location.lat.toFixed(5)} | LNG: {location.lng.toFixed(5)}
            </span>
          </p>
        </div>
        
        {/* Scenario Toggles */}
        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-slate-700 backdrop-blur-md">
            <button 
                onClick={() => setActiveDisaster(DisasterType.FLOOD)}
                className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${activeDisaster === DisasterType.FLOOD ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <Waves size={16} /> Flood
            </button>
            <button 
                onClick={() => setActiveDisaster(DisasterType.FIRE)}
                className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${activeDisaster === DisasterType.FIRE ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <Flame size={16} /> Fire
            </button>
            <button 
                onClick={() => setActiveDisaster(DisasterType.STORM)}
                className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm font-bold transition-all ${activeDisaster === DisasterType.STORM ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
            >
                <CloudLightning size={16} /> Storm
            </button>
        </div>
      </header>

      <div className="relative h-[650px] w-full rounded-xl border border-slate-700 bg-slate-950 overflow-hidden shadow-2xl group">
        
        {/* 3D Canvas */}
        <div 
            ref={mountRef} 
            className="w-full h-full cursor-move"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
        />

        {/* --- UI OVERLAYS --- */}

        {/* 1. Environment Status (Top Left) */}
        <div className="absolute top-4 left-4 flex flex-col gap-2 pointer-events-none">
            <div className="bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-lg flex items-center gap-3">
                 <div className={`p-2 rounded-full ${activeDisaster === DisasterType.FIRE ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                     <Thermometer size={18} />
                 </div>
                 <div>
                     <p className="text-[10px] text-slate-500 uppercase font-bold">Temperature</p>
                     <p className="text-lg font-mono font-bold text-white">
                         {activeDisaster === DisasterType.FIRE ? (25 + intensity * 0.8).toFixed(1) : (20 - intensity * 0.1).toFixed(1)}°C
                     </p>
                 </div>
            </div>
            <div className="bg-slate-900/90 backdrop-blur border border-slate-700 p-3 rounded-lg shadow-lg flex items-center gap-3">
                 <div className="p-2 rounded-full bg-slate-700/50 text-slate-300">
                     <Wind size={18} />
                 </div>
                 <div>
                     <p className="text-[10px] text-slate-500 uppercase font-bold">Wind Speed</p>
                     <p className="text-lg font-mono font-bold text-white">
                         {(10 + intensity * (activeDisaster === DisasterType.STORM ? 1.5 : 0.2)).toFixed(1)} km/h
                     </p>
                 </div>
            </div>
        </div>

        {/* 2. Simulation Metrics (Top Right) */}
        <div className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur border border-slate-700 p-4 rounded-lg shadow-lg w-64 pointer-events-none">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex justify-between">
                <span>Simulation Data</span>
                <Activity size={12} className="text-emerald-500 animate-pulse" />
            </h3>
            
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-300">
                            {activeDisaster === DisasterType.FLOOD ? 'Water Level' : activeDisaster === DisasterType.FIRE ? 'Fire Spread' : 'Storm Severity'}
                        </span>
                        <span className={`text-xs font-mono font-bold ${intensity > 80 ? 'text-red-500' : 'text-cyan-400'}`}>
                            {intensity.toFixed(1)}%
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-300 ${activeDisaster === DisasterType.FIRE ? 'bg-gradient-to-r from-yellow-500 to-red-600' : 'bg-gradient-to-r from-cyan-500 to-blue-600'}`} 
                            style={{ width: `${intensity}%` }}
                        ></div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                     <div>
                         <p className="text-[10px] text-slate-500">Structural Integrity</p>
                         <p className={`text-sm font-bold ${intensity > 60 ? 'text-red-400' : 'text-emerald-400'}`}>
                             {Math.max(0, 100 - intensity * 0.7).toFixed(0)}%
                         </p>
                     </div>
                     <div>
                         <p className="text-[10px] text-slate-500">Est. Damage</p>
                         <p className="text-sm font-bold text-slate-200">
                             ${(intensity * 1.5).toFixed(1)}M
                         </p>
                     </div>
                </div>
            </div>
        </div>

        {/* 3. Building Tooltip (Hover) */}
        {hoveredBuilding && (
            <div 
                className="absolute pointer-events-none bg-slate-900/95 backdrop-blur-xl border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.2)] w-56 transition-opacity duration-200"
                style={{ 
                    left: `${(mouse.current.x + 1) / 2 * 100}%`, 
                    top: `${(-mouse.current.y + 1) / 2 * 100}%`,
                    transform: 'translate(20px, 20px)'
                }}
            >
                <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                    <ShieldAlert size={14} className="text-cyan-400" />
                    Block #{hoveredBuilding.id}
                </h4>
                <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                        <span className="text-slate-400">Height:</span>
                        <span className="text-slate-200 font-mono">{hoveredBuilding.height}m</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Occupants:</span>
                        <span className="text-slate-200 font-mono">{hoveredBuilding.occupants}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-slate-400">Integrity:</span>
                        <span className={`font-bold font-mono ${hoveredBuilding.integrity < 40 ? 'text-red-500' : 'text-emerald-500'}`}>
                            {hoveredBuilding.integrity}%
                        </span>
                    </div>
                </div>
            </div>
        )}

        {/* 4. Controls Bar (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur border-t border-slate-700 p-4 md:p-6 flex flex-col md:flex-row items-center gap-6 z-10">
          
          <div className="flex items-center gap-4">
            <button onClick={() => setIntensity(0)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-full transition"><Rewind size={20} /></button>
            <button 
              onClick={() => setIsPlaying(!isPlaying)} 
              className={`p-3 md:p-4 rounded-full shadow-lg transition transform hover:scale-105 active:scale-95 ${isPlaying ? 'bg-red-500 text-white shadow-red-900/50' : 'bg-cyan-600 text-white shadow-cyan-900/50'}`}
            >
              {isPlaying ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1" />}
            </button>
            <button onClick={() => setIntensity(100)} className="text-slate-400 hover:text-white p-2 hover:bg-slate-700 rounded-full transition"><FastForward size={20} /></button>
          </div>

          <div className="flex-1 w-full flex flex-col justify-center">
             <div className="flex justify-between text-xs font-mono text-slate-500 mb-2 uppercase tracking-wide">
                <span>Phase 1</span>
                <span>Phase 2</span>
                <span>Critical Mass</span>
                <span>Fallout</span>
             </div>
             <input 
                type="range" 
                min="0" 
                max="100" 
                step="0.1"
                value={intensity} 
                onChange={(e) => setIntensity(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500 hover:accent-cyan-400"
              />
          </div>

          <div className="flex items-center gap-3 border-l border-slate-700 pl-6">
              <button 
                onClick={() => setShowHeatmap(!showHeatmap)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${showHeatmap ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'text-slate-500 hover:text-slate-300'}`}
              >
                  <AlertTriangle size={20} />
                  <span className="text-[10px] font-bold uppercase">Stress Map</span>
              </button>
              
              <div className="hidden md:block text-right ml-2">
                  <p className="text-[10px] text-slate-500 font-mono">SIMULATION ID</p>
                  <p className="text-xs text-slate-300 font-mono">#DT-{Math.floor(location.lat * 100)}-{Math.floor(location.lng * 100)}</p>
              </div>
          </div>

        </div>
      </div>
      
      {/* Footer Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center md:text-left">
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
              <MousePointer2 className="text-slate-500" />
              <div>
                  <h4 className="text-sm font-bold text-slate-300">Interactive Model</h4>
                  <p className="text-xs text-slate-500">Drag to rotate camera. Hover buildings to inspect data.</p>
              </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
              <Layers className="text-slate-500" />
              <div>
                  <h4 className="text-sm font-bold text-slate-300">Multi-Layer Simulation</h4>
                  <p className="text-xs text-slate-500">Switch scenarios to test infrastructure resilience.</p>
              </div>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
              <Thermometer className="text-slate-500" />
              <div>
                  <h4 className="text-sm font-bold text-slate-300">Structural Analysis</h4>
                  <p className="text-xs text-slate-500">Enable 'Stress Map' to identify vulnerable zones.</p>
              </div>
          </div>
      </div>
    </div>
  );
};

export default Simulation;