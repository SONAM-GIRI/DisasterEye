import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { Mic, X, Activity, MapPin, ExternalLink, Waves, Flame, CloudLightning, Sliders } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { chatWithAssistant } from '../services/geminiService';
import { api } from '../services/storage';
import { DisasterType } from '../types';

// --- Types ---
interface Message {
  text: string;
  sender: 'user' | 'ai';
  groundingMetadata?: any;
}

type ReactionType = 'idle' | 'listening' | 'thinking' | 'alert' | 'guiding';
type SimulationType = 'NONE' | 'FLOOD' | 'FIRE' | 'STORM';

declare global {
  interface Window {
    webkitSpeechRecognition: any;
  }
}

// --- Cybernetic Skin Shader (Body/Face) ---
const skinVertexShader = `
  uniform float time;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    vPosition = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skinFragmentShader = `
  uniform vec3 color;
  uniform float time;
  uniform float intensity;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vec3 viewDir = vec3(0.0, 0.0, 1.0); // Approximate view direction
    float fresnel = pow(1.0 - dot(viewDir, vNormal), 2.5);
    
    // Wavy "Circuit" pattern
    float circuitPattern = sin(vPosition.y * 15.0 + sin(vPosition.x * 20.0 + time) * 2.0);
    float lines = smoothstep(0.95, 1.0, circuitPattern);
    float nodes = step(0.98, sin(vPosition.x * 30.0) * sin(vPosition.y * 30.0));

    vec3 baseGlow = color * (0.2 + fresnel * 0.8);
    vec3 lineGlow = vec3(0.8, 1.0, 1.0) * (lines + nodes) * intensity;
    vec3 finalColor = baseGlow + lineGlow;
    float alpha = 0.5 + fresnel * 0.5 + lines * 0.5;
    alpha = clamp(alpha * intensity, 0.0, 0.95);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

// --- Hair Shader ---
const hairVertexShader = `
  uniform float time;
  varying vec3 vNormal;
  
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position;
    pos += normal * sin(time * 2.0 + position.y * 5.0) * 0.03;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const hairFragmentShader = `
  uniform vec3 color;
  varying vec3 vNormal;

  void main() {
    float fresnel = pow(1.0 - dot(vec3(0.0, 0.0, 1.0), vNormal), 2.0);
    vec3 hairColor = mix(color, vec3(1.0), fresnel);
    gl_FragColor = vec4(hairColor, 0.7 + fresnel * 0.3);
  }
`;

// --- Simulation Shaders ---

// Water/Flood Shader - Cylindrical Volume
const floodVertexShader = `
  uniform float time;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    // Wavy surface displacement
    if (pos.y > 0.0) {
        pos.y += sin(pos.x * 3.0 + time * 2.0) * 0.05;
        pos.y += cos(pos.z * 3.0 + time * 2.0) * 0.05;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const floodFragmentShader = `
  uniform float time;
  uniform float opacity;
  varying vec2 vUv;
  void main() {
    // Water caustic pattern
    float grid = step(0.9, fract(vUv.x * 10.0 + time * 0.2)) + step(0.9, fract(vUv.y * 10.0 + time * 0.3));
    vec3 color = mix(vec3(0.0, 0.3, 0.8), vec3(0.0, 0.8, 1.0), vUv.y);
    float alpha = opacity * (0.4 + grid * 0.3);
    // Scanline
    float scan = sin(vUv.y * 50.0 - time * 5.0) * 0.1;
    gl_FragColor = vec4(color + scan, alpha);
  }
`;

// Fire Particle Shader
const fireVertexShader = `
  uniform float time;
  uniform float height;
  attribute float size;
  attribute float offset;
  varying float vLife;
  
  void main() {
    float life = mod(time + offset, 1.0);
    vLife = life;
    
    vec3 pos = position;
    // Rise up and taper
    pos.y += life * height * 3.0;
    float taper = 1.0 - life * 0.5;
    pos.x *= taper;
    pos.z *= taper;
    
    // Wiggle
    pos.x += sin(time * 5.0 + offset * 10.0 + pos.y) * 0.1;
    pos.z += cos(time * 3.0 + offset * 10.0 + pos.y) * 0.1;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (1.0 - life * 0.5) * (10.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fireFragmentShader = `
  varying float vLife;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    
    vec3 color = mix(vec3(1.0, 0.8, 0.0), vec3(1.0, 0.0, 0.0), vLife); // Yellow to Red
    float alpha = (1.0 - vLife) * 0.8 * (1.0 - smoothstep(0.0, 0.5, dist));
    gl_FragColor = vec4(color, alpha);
  }
`;

// Storm Vortex Shader
const stormVertexShader = `
  uniform float time;
  uniform float intensity; 
  attribute float angleOffset;
  attribute float speed;
  attribute float radiusOffset;
  varying float vAlpha;
  
  void main() {
    // Spiral math
    float t = time * speed * (1.0 + intensity);
    float currentRadius = 0.5 + radiusOffset + (position.y + 1.0) * 0.5 * intensity; // Wider at top
    float angle = t + angleOffset + (position.y * 1.5); // Twist
    
    vec3 pos = position;
    pos.x = cos(angle) * currentRadius;
    pos.z = sin(angle) * currentRadius;
    
    vAlpha = 1.0 - smoothstep(0.8, 1.5, abs(pos.y)); // Fade edges vertically
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = 3.0 * (10.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const stormFragmentShader = `
  uniform vec3 color;
  varying float vAlpha;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    gl_FragColor = vec4(color, vAlpha * 0.6);
  }
`;

// --- Ambient Particles Shader ---
const particleVertexShader = `
  uniform float time;
  attribute float size;
  void main() {
    vec3 pos = position;
    pos.y += sin(time * 0.2 + position.x) * 0.2;
    pos.x += cos(time * 0.1 + position.z) * 0.2;
    
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = size * (20.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  uniform vec3 color;
  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float dist = length(uv);
    if (dist > 0.5) discard;
    float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
    gl_FragColor = vec4(color, alpha * 0.8);
  }
`;

const Aiden: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  
  const [messages, setMessages] = useState<Message[]>([
    { text: "Identity Verified. Interface initialized. Ready for command.", sender: 'ai' }
  ]);
  const messagesRef = useRef<Message[]>(messages);
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [alertMode, setAlertMode] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationRequest, setLocationRequest] = useState(false);
  const [userCoords, setUserCoords] = useState<{lat: number, lng: number} | undefined>(undefined);
  
  const [reaction, setReaction] = useState<ReactionType>('idle');
  const [isGuiding, setIsGuiding] = useState(false);

  // Simulation State
  const [simMode, setSimMode] = useState<SimulationType>('NONE');
  const [simIntensity, setSimIntensity] = useState(50); // 0-100
  const simModeRef = useRef<SimulationType>('NONE');
  const simIntensityRef = useRef(50);

  // Refs
  const isSpeakingRef = useRef(false);
  const alertModeRef = useRef(false);
  const reactionRef = useRef<ReactionType>('idle');
  
  // Colors
  const cyanColor = new THREE.Color(0x00f3ff);
  const redColor = new THREE.Color(0xff0000);
  const purpleColor = new THREE.Color(0xa855f7);
  const hairColor = new THREE.Color(0xe0f7fa);
  const speakingColor = new THREE.Color(0xdbeafe); // Bright blue-white for speaking
  
  const targetColorRef = useRef(cyanColor.clone());

  const mountRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const handleSendRef = useRef<(text?: string) => void>(() => {});

  // 3D Refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const avatarGroupRef = useRef<THREE.Group | null>(null);
  const simGroupRef = useRef<THREE.Group | null>(null); // New group for simulation elements
  const projectorGroupRef = useRef<THREE.Group | null>(null); // Hologram base
  
  const skinUniformsRef = useRef<any>(null);
  const hairUniformsRef = useRef<any>(null);
  const particlesUniformsRef = useRef<any>(null);
  
  // Sim Uniforms
  const floodUniformsRef = useRef<any>(null);
  const fireUniformsRef = useRef<any>(null);
  const stormUniformsRef = useRef<any>(null);
  
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { isSpeakingRef.current = isSpeaking; }, [isSpeaking]);
  
  useEffect(() => {
    let currentReaction: ReactionType = 'idle';
    if (isGuiding) currentReaction = 'guiding';
    else if (alertMode) currentReaction = 'alert';
    else if (isProcessing) currentReaction = 'thinking';
    else if (isListening) currentReaction = 'listening';
    
    setReaction(currentReaction);
    reactionRef.current = currentReaction;
  }, [alertMode, isProcessing, isListening, isGuiding]);

  useEffect(() => { 
      alertModeRef.current = alertMode; 
      if (alertMode) {
          targetColorRef.current.copy(redColor); 
      } else if (isSpeaking) {
          targetColorRef.current.copy(speakingColor);
      } else if (isLocating) {
          targetColorRef.current.setHex(0x10b981); 
      } else {
          if (reaction === 'thinking') targetColorRef.current.setHex(0xa855f7);
          else targetColorRef.current.copy(cyanColor); 
      }
  }, [alertMode, isLocating, reaction, isSpeaking]);

  // Sync state refs for animation loop
  useEffect(() => {
      simModeRef.current = simMode;
      simIntensityRef.current = simIntensity;
      
      // Update visibility based on mode immediately
      if (simGroupRef.current) {
          simGroupRef.current.children.forEach(child => {
              child.visible = false;
              if (child.name === simMode) child.visible = true;
          });
      }
      // Update Projector Ring Color
      if (projectorGroupRef.current) {
          projectorGroupRef.current.visible = simMode !== 'NONE';
      }
  }, [simMode, simIntensity]);

  // --- Speech & Chat Logic ---
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      if (!text) return; 
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.1; 
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.name.includes("Female")) || voices[0];
      if (preferredVoice) utterance.voice = preferredVoice;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const triggerGuiding = () => {
      setIsGuiding(true);
      setTimeout(() => setIsGuiding(false), 2500);
  };

  const handleSend = async (text: string = inputText) => {
    if (!text.trim()) return;
    const userMsg = text;
    setMessages(prev => [...prev, { text: userMsg, sender: 'user' }]);
    setIsProcessing(true);

    // Simple keyword detection for simulations to bypass AI latency for visual changes
    const lowerMsg = userMsg.toLowerCase();
    if (lowerMsg.includes("flood")) setSimMode('FLOOD');
    if (lowerMsg.includes("fire") || lowerMsg.includes("wildfire")) setSimMode('FIRE');
    if (lowerMsg.includes("storm") || lowerMsg.includes("hurricane")) setSimMode('STORM');
    if (lowerMsg.includes("stop") || lowerMsg.includes("clear simulation")) setSimMode('NONE');

    const history = messagesRef.current
        .filter((m, i) => !(i === 0 && m.sender === 'ai'))
        .map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));
    
    let response = await chatWithAssistant(history, userMsg, userCoords);
    
    if (response.text) {
        setMessages(prev => [...prev, { text: response.text, sender: 'ai', groundingMetadata: response.groundingMetadata }]);
        speak(response.text);
    }

    if (response.functionCall) {
        const { name, args } = response.functionCall;
        
        // Handle App Control
        if (name === 'controlApp') {
            let feedbackText = response.text; 
            
            // 1. Navigation
            if (args.action === 'NAVIGATE' && args.route) {
                const validRoutes = ['/', '/map', '/prediction', '/simulation', '/emergency-plan', '/ar-view', '/settings', '/contacts'];
                const targetRoute = args.route.trim();
                if (validRoutes.includes(targetRoute)) {
                    triggerGuiding();
                    navigate(targetRoute);
                    if (!feedbackText) feedbackText = `Routing to ${targetRoute.replace('/', '') || 'Dashboard'}.`;
                }
            }
            
            // 2. Alert Mode
            if (args.action === 'SET_ALERT_MODE') {
                const isActive = args.alertActive === true;
                setAlertMode(isActive);
                if (!feedbackText) feedbackText = isActive ? "Red Alert activated." : "Alerts cancelled.";
            }

            // 3. Simulation Control
            if (args.action === 'SIMULATION_CONTROL') {
                // If AI starts simulation, auto-navigate to simulation page first
                if (args.simulationCommand === 'START' && window.location.hash !== '#/simulation') {
                    navigate('/simulation');
                    await new Promise(r => setTimeout(r, 500)); // Wait for route
                }
                
                // Dispatch global event for Simulation page to pick up
                window.dispatchEvent(new CustomEvent('aiden-sim', { 
                    detail: { 
                        command: args.simulationCommand, 
                        intensity: args.intensityValue 
                    } 
                }));
                
                if (!feedbackText) feedbackText = `Simulation protocol ${args.simulationCommand} executed.`;
            }

            // 4. Map Control
            if (args.action === 'MAP_CONTROL') {
                 // Auto-navigate if not on map
                 if (window.location.hash !== '#/map') {
                    navigate('/map');
                    await new Promise(r => setTimeout(r, 500));
                 }
                 
                 // Dispatch global event for Map page
                 window.dispatchEvent(new CustomEvent('aiden-map', {
                     detail: { command: args.mapCommand }
                 }));

                 if (!feedbackText) feedbackText = `Map view updating: ${args.mapCommand}.`;
            }

            // 5. Report Control (New)
            if (args.action === 'OPEN_REPORT') {
                // Auto-navigate if not on map
                 if (window.location.hash !== '#/map') {
                    navigate('/map');
                    await new Promise(r => setTimeout(r, 500));
                 }

                 // Dispatch global event for Map page to open modal
                 window.dispatchEvent(new CustomEvent('aiden-report-ui'));
                 if (!feedbackText) feedbackText = "Opening report interface.";
            }

            if (!response.text && feedbackText) {
                setMessages(prev => [...prev, { text: feedbackText, sender: 'ai' }]);
                speak(feedbackText);
            }
        }
        
        // Handle Location Request
        if (name === 'getUserLocation') {
             const requestMsg = response.text || "I need to access your GPS coordinates to find accurate local information.";
             setMessages(prev => [...prev, { text: requestMsg, sender: 'ai' }]);
             speak(requestMsg);
             setLocationRequest(true);
             setIsProcessing(false);
             return; 
        }

        // Handle Report Filing
        if (name === 'reportIncident') {
             const report = {
                 type: args.type as DisasterType,
                 description: args.description,
                 coordinates: userCoords || { lat: 34.0522, lng: -118.2437 }
             };
             await api.createReport(report);
             const feedback = response.text || `Report filed: ${args.type} - ${args.description}. Broadcasted to local network.`;
             setMessages(prev => [...prev, { text: feedback, sender: 'ai' }]);
             speak(feedback);
             
             setTimeout(() => {
                 navigate('/map');
             }, 3000);
        }
    }
    setIsProcessing(false);
  };

  const handleLocationResponse = async (granted: boolean) => {
    setLocationRequest(false);
    const history = messagesRef.current.filter((m, i) => !(i === 0 && m.sender === 'ai')).map(m => ({ role: m.sender === 'user' ? 'user' : 'model', parts: [{ text: m.text }] }));

    if (!granted) {
        const msg = "User denied location access. Proceed without location data.";
        setIsProcessing(true);
        const response = await chatWithAssistant(history, msg);
        if (response.text) {
             setMessages(prev => [...prev, { text: response.text, sender: 'ai' }]);
             speak(response.text);
        }
        setIsProcessing(false);
        return;
    }

    setIsLocating(true);
    speak("Acquiring satellite lock...");

    if (!navigator.geolocation) {
        setIsLocating(false);
        const errResponse = "System Update: Geolocation is not supported by this browser.";
        const response = await chatWithAssistant(history, errResponse);
        if (response.text) {
            setMessages(prev => [...prev, { text: response.text, sender: 'ai' }]);
            speak(response.text);
        }
        return;
    }
    
    try {
         const position = await new Promise<GeolocationPosition>((resolve, reject) => {
             navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
         });
         const { latitude, longitude } = position.coords;
         const coords = { lat: latitude, lng: longitude };
         setUserCoords(coords);
         
         const locationMsg = `System Update: User's confirmed location is Latitude ${latitude}, Longitude ${longitude}. Please proceed with the user's previous request using this location context (e.g. check for nearby resources or risks).`;
         
         setIsProcessing(true);
         const response = await chatWithAssistant(history, locationMsg, coords);
         if (response.text) {
             setMessages(prev => [...prev, { text: response.text, sender: 'ai', groundingMetadata: response.groundingMetadata }]);
             speak(response.text);
         }
    } catch (error) {
         console.error(error);
         const errResponse = "System Update: GPS signal lookup failed.";
         const response = await chatWithAssistant(history, errResponse);
         if (response.text) {
             setMessages(prev => [...prev, { text: response.text, sender: 'ai' }]);
             speak(response.text);
         }
    } finally {
        setIsLocating(false);
        setIsProcessing(false);
    }
  };

  useEffect(() => { handleSendRef.current = handleSend; }, [handleSend]);

  useEffect(() => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false; 
      recognition.interimResults = true; 
      recognition.lang = 'en-US';
      recognition.onstart = () => { setIsListening(true); window.speechSynthesis.cancel(); };
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
        }
        if (finalTranscript) {
            setInputText(finalTranscript);
            handleSendRef.current(finalTranscript);
        }
      };
      recognitionRef.current = recognition;
    }
  }, []); 

  const toggleListening = useCallback(() => {
    if (isListening) recognitionRef.current?.stop();
    else {
      setInputText("");
      try { recognitionRef.current?.start(); } catch (e) {}
    }
  }, [isListening]);

  // --- Three.js Scene Construction ---
  useEffect(() => {
    if (!mountRef.current) return;
    const { w, h } = isOpen ? { w: window.innerWidth, h: window.innerHeight } : { w: 112, h: 112 };
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    camera.position.set(0, isOpen ? 0.2 : 0.5, isOpen ? 4.5 : 4); 
    
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Materials
    const skinUniforms = { color: { value: cyanColor }, time: { value: 0 }, intensity: { value: 1.0 } };
    skinUniformsRef.current = skinUniforms;
    const skinMaterial = new THREE.ShaderMaterial({ 
        uniforms: skinUniforms, vertexShader: skinVertexShader, fragmentShader: skinFragmentShader, transparent: true, side: THREE.FrontSide, blending: THREE.AdditiveBlending 
    });

    const hairUniforms = { color: { value: hairColor }, time: { value: 0 } };
    hairUniformsRef.current = hairUniforms;
    const hairMaterial = new THREE.ShaderMaterial({
        uniforms: hairUniforms, vertexShader: hairVertexShader, fragmentShader: hairFragmentShader, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
    });

    const lipsMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333, transparent: true, opacity: 0.8 });
    
    // Avatar Group
    const avatarGroup = new THREE.Group();
    avatarGroupRef.current = avatarGroup;
    scene.add(avatarGroup);

    // Avatar Geometry
    const headGeo = new THREE.SphereGeometry(0.7, 64, 64);
    headGeo.scale(0.9, 1.1, 1.0);
    const head = new THREE.Mesh(headGeo, skinMaterial);
    head.position.y = 0.9;
    avatarGroup.add(head);

    const hairGeo = new THREE.SphereGeometry(0.78, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const hair = new THREE.Mesh(hairGeo, hairMaterial);
    hair.rotation.x = Math.PI; 
    hair.position.y = 1.0; 
    hair.scale.set(1.05, 1.2, 1.1);
    avatarGroup.add(hair);

    const bangGeo = new THREE.CylinderGeometry(0.75, 0.8, 0.5, 32, 1, true);
    const hairSides = new THREE.Mesh(bangGeo, hairMaterial);
    hairSides.position.y = 0.9;
    avatarGroup.add(hairSides);

    const lipsGeo = new THREE.TorusGeometry(0.12, 0.04, 8, 16);
    const lips = new THREE.Mesh(lipsGeo, lipsMaterial);
    lips.position.set(0, 0.65, 0.65); 
    lips.rotation.x = 0.2;
    lips.scale.set(1, 0.6, 1);
    avatarGroup.add(lips);

    const neckGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 32);
    const neck = new THREE.Mesh(neckGeo, skinMaterial);
    neck.position.y = 0.2;
    avatarGroup.add(neck);

    const chestGeo = new THREE.SphereGeometry(1.2, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.35);
    const chest = new THREE.Mesh(chestGeo, skinMaterial);
    chest.position.y = -0.5;
    avatarGroup.add(chest);

    // --- Hologram Projector Base ---
    const projectorGroup = new THREE.Group();
    projectorGroupRef.current = projectorGroup;
    projectorGroup.position.y = -2.2;
    projectorGroup.visible = false;
    scene.add(projectorGroup);

    const ringGeo = new THREE.RingGeometry(2.0, 2.1, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2;
    projectorGroup.add(ringMesh);

    const innerRingGeo = new THREE.RingGeometry(1.5, 1.55, 64);
    const innerRingMesh = new THREE.Mesh(innerRingGeo, ringMat);
    innerRingMesh.rotation.x = Math.PI / 2;
    projectorGroup.add(innerRingMesh);

    // --- Simulation Elements ---
    const simGroup = new THREE.Group();
    simGroupRef.current = simGroup;
    scene.add(simGroup);

    // 1. Flood (Water Cylinder Volume)
    const floodGeo = new THREE.CylinderGeometry(2, 2, 3, 32, 8, true);
    const floodUniforms = { time: { value: 0 }, opacity: { value: 0 } };
    floodUniformsRef.current = floodUniforms;
    const floodMat = new THREE.ShaderMaterial({
        uniforms: floodUniforms, vertexShader: floodVertexShader, fragmentShader: floodFragmentShader, transparent: true, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false
    });
    const floodMesh = new THREE.Mesh(floodGeo, floodMat);
    floodMesh.position.y = -2.0; 
    floodMesh.name = 'FLOOD';
    floodMesh.visible = false;
    simGroup.add(floodMesh);

    // 2. Fire (Particle System)
    const fireCount = 300;
    const fireGeo = new THREE.BufferGeometry();
    const firePos = new Float32Array(fireCount * 3);
    const fireSize = new Float32Array(fireCount);
    const fireOffset = new Float32Array(fireCount);
    for(let i=0; i<fireCount; i++) {
        const theta = Math.random() * Math.PI * 2;
        const r = Math.random() * 0.8; // Tighter radius
        firePos[i*3] = r * Math.cos(theta);
        firePos[i*3+1] = -1.5; // Y start
        firePos[i*3+2] = r * Math.sin(theta);
        fireSize[i] = Math.random() * 20.0 + 10.0;
        fireOffset[i] = Math.random();
    }
    fireGeo.setAttribute('position', new THREE.BufferAttribute(firePos, 3));
    fireGeo.setAttribute('size', new THREE.BufferAttribute(fireSize, 1));
    fireGeo.setAttribute('offset', new THREE.BufferAttribute(fireOffset, 1));
    
    const fireUniforms = { time: { value: 0 }, height: { value: 1.0 } };
    fireUniformsRef.current = fireUniforms;
    const fireMat = new THREE.ShaderMaterial({
        uniforms: fireUniforms, vertexShader: fireVertexShader, fragmentShader: fireFragmentShader, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const fireMesh = new THREE.Points(fireGeo, fireMat);
    fireMesh.name = 'FIRE';
    fireMesh.visible = false;
    simGroup.add(fireMesh);

    // 3. Storm (Particle Vortex)
    const stormCount = 500;
    const stormGeo = new THREE.BufferGeometry();
    const stormPos = new Float32Array(stormCount * 3);
    const stormAngle = new Float32Array(stormCount);
    const stormSpeed = new Float32Array(stormCount);
    const stormRadiusOffset = new Float32Array(stormCount);

    for(let i=0; i<stormCount; i++) {
        stormPos[i*3] = 0;
        stormPos[i*3+1] = (Math.random() - 0.5) * 3.0; // Height spread -1.5 to 1.5
        stormPos[i*3+2] = 0;
        stormAngle[i] = Math.random() * Math.PI * 2;
        stormSpeed[i] = 1.0 + Math.random();
        stormRadiusOffset[i] = (Math.random() - 0.5) * 0.5;
    }
    stormGeo.setAttribute('position', new THREE.BufferAttribute(stormPos, 3));
    stormGeo.setAttribute('angleOffset', new THREE.BufferAttribute(stormAngle, 1));
    stormGeo.setAttribute('speed', new THREE.BufferAttribute(stormSpeed, 1));
    stormGeo.setAttribute('radiusOffset', new THREE.BufferAttribute(stormRadiusOffset, 1));

    const stormUniforms = { time: { value: 0 }, intensity: { value: 0.5 }, color: { value: purpleColor } };
    stormUniformsRef.current = stormUniforms;
    const stormMat = new THREE.ShaderMaterial({
        uniforms: stormUniforms, vertexShader: stormVertexShader, fragmentShader: stormFragmentShader, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false
    });
    const stormMesh = new THREE.Points(stormGeo, stormMat);
    stormMesh.name = 'STORM';
    stormMesh.visible = false;
    simGroup.add(stormMesh);

    // Ambient Particles
    const particlesCount = isOpen ? 300 : 100;
    const posArray = new Float32Array(particlesCount * 3);
    const sizeArray = new Float32Array(particlesCount);
    for(let i=0; i<particlesCount; i++) {
        const r = 1.5 + Math.random() * 2.5;
        const theta = Math.random() * Math.PI * 2;
        posArray[i*3] = r * Math.cos(theta);
        posArray[i*3+1] = (Math.random() - 0.5) * 5.0; 
        posArray[i*3+2] = r * Math.sin(theta);
        sizeArray[i] = Math.random() * 1.5;
    }
    const particlesGeo = new THREE.BufferGeometry();
    particlesGeo.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    particlesGeo.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1));
    const particlesUniforms = { time: { value: 0 }, color: { value: cyanColor } };
    particlesUniformsRef.current = particlesUniforms;
    const particlesMat = new THREE.ShaderMaterial({ uniforms: particlesUniforms, vertexShader: particleVertexShader, fragmentShader: particleFragmentShader, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    scene.add(new THREE.Points(particlesGeo, particlesMat));

    let frameId: number;
    let particleTime = 0;
    let lastTime = performance.now() * 0.001;

    const animate = () => {
      const time = performance.now() * 0.001;
      const delta = time - lastTime;
      lastTime = time;

      const particleSpeed = alertModeRef.current ? 4.0 : isSpeakingRef.current ? 2.5 : 0.5;
      particleTime += delta * particleSpeed;

      // Projector Animation
      if (projectorGroupRef.current && projectorGroupRef.current.visible) {
          projectorGroupRef.current.rotation.y += delta * 0.2;
      }

      // Update basic uniforms
      if (skinUniformsRef.current) skinUniformsRef.current.time.value = time;
      if (hairUniformsRef.current) hairUniformsRef.current.time.value = time;
      if (particlesUniformsRef.current) {
          particlesUniformsRef.current.time.value = particleTime;
          particlesUniformsRef.current.color.value.lerp(targetColorRef.current, 0.05);
      }
      if (skinUniformsRef.current) skinUniformsRef.current.color.value.lerp(targetColorRef.current, 0.05);
      
      // Update Simulation Uniforms
      const intensityFactor = simIntensityRef.current / 100.0;
      
      // Flood
      if (floodUniformsRef.current) {
          floodUniformsRef.current.time.value = time;
          floodUniformsRef.current.opacity.value = intensityFactor; 
      }
      const floodObj = simGroupRef.current?.getObjectByName('FLOOD');
      if (floodObj && floodObj.visible) {
          // Rise from bottom
          floodObj.position.y = THREE.MathUtils.lerp(floodObj.position.y, -2.5 + (intensityFactor * 3.5), 0.05);
          floodObj.scale.setScalar(1.0 + intensityFactor * 0.2);
      }

      // Fire
      if (fireUniformsRef.current) {
          fireUniformsRef.current.time.value = time;
          fireUniformsRef.current.height.value = intensityFactor; 
      }
      
      // Storm
      if (stormUniformsRef.current) {
          stormUniformsRef.current.time.value = time;
          stormUniformsRef.current.intensity.value = intensityFactor;
      }


      if (avatarGroupRef.current) {
        const currentReaction = reactionRef.current;
        const targetRot = { x: 0, y: Math.sin(time * 0.3) * 0.08, z: 0 };
        const targetPos = { x: 0, y: Math.sin(time * 1.2) * 0.03, z: 0 };
        
        // Gentle breathing animation
        let targetIntensity = 1.3;

        switch (currentReaction) {
            case 'thinking':
                targetRot.z = 0.1; targetRot.x = -0.05;
                break;
            case 'listening':
                targetRot.x = 0.1; targetPos.z = 0.3;
                break;
            case 'alert':
                targetRot.z = Math.sin(time * 30) * 0.02; 
                targetIntensity = 1.8 + Math.sin(time * 20) * 0.5;
                break;
        }

        avatarGroupRef.current.rotation.x = THREE.MathUtils.lerp(avatarGroupRef.current.rotation.x, targetRot.x, 0.05);
        avatarGroupRef.current.rotation.y = THREE.MathUtils.lerp(avatarGroupRef.current.rotation.y, targetRot.y, 0.05);
        avatarGroupRef.current.rotation.z = THREE.MathUtils.lerp(avatarGroupRef.current.rotation.z, targetRot.z, 0.05);
        avatarGroupRef.current.position.y = THREE.MathUtils.lerp(avatarGroupRef.current.position.y, targetPos.y, 0.05);

        if (isSpeakingRef.current) {
             targetIntensity = 1.6 + Math.sin(time * 15) * 0.3;
             avatarGroupRef.current.rotation.x += Math.sin(time * 25) * 0.015; 
        }
        if (alertModeRef.current) targetIntensity = 2.0;

        if (skinUniformsRef.current) {
            skinUniformsRef.current.intensity.value = THREE.MathUtils.lerp(skinUniformsRef.current.intensity.value, targetIntensity, 0.1);
        }
      }
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => { if (!isOpen) return; renderer.setSize(window.innerWidth, window.innerHeight); camera.aspect = window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); };
    window.addEventListener('resize', handleResize);
    return () => { window.removeEventListener('resize', handleResize); mountRef.current?.removeChild(renderer.domElement); cancelAnimationFrame(frameId); renderer.dispose(); };
  }, [isOpen]); 

  const lastAiMsg = messages.filter(m => m.sender === 'ai').pop();
  const groundingChunks = lastAiMsg?.groundingMetadata?.groundingChunks || [];

  const containerClasses = isOpen 
    ? 'fixed inset-0 z-[2000] flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-xl transition-all duration-500'
    : 'fixed bottom-6 right-6 w-28 h-28 z-[1000] transition-all duration-500';

  return (
    <div className={containerClasses}>
      <div 
        ref={mountRef} 
        className={`${isOpen ? 'absolute inset-0 z-0' : 'w-full h-full cursor-pointer z-10'}`}
        onClick={() => !isOpen && setIsOpen(true)}
      >
        {!isOpen && (
            <div className={`absolute inset-0 rounded-full border border-blue-500/30 shadow-[0_0_30px_rgba(0,243,255,0.2)] hover:shadow-[0_0_50px_rgba(0,243,255,0.5)] bg-slate-900/50 backdrop-blur-sm pointer-events-none ${alertMode ? 'animate-ping' : 'animate-pulse-fast'}`}></div>
        )}
      </div>

      {isOpen && (
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-6 md:p-12 pointer-events-none">
            {/* Header */}
            <div className="flex justify-between items-start pointer-events-auto w-full">
                <div>
                    <h2 className={`text-2xl font-black tracking-[0.2em] ${alertMode ? 'text-red-500' : isLocating ? 'text-emerald-400' : 'text-blue-400'}`}>AIDEN</h2>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${alertMode ? 'bg-red-500 animate-ping' : isLocating ? 'bg-emerald-500 animate-pulse' : 'bg-green-500 animate-pulse'}`}></span>
                        <p className={`text-xs font-mono uppercase ${alertMode ? 'text-red-400' : isLocating ? 'text-emerald-400' : 'text-blue-300/70'}`}>
                            {alertMode ? 'HAZARD DETECTED' : isLocating ? 'TRIANGULATING' : reaction === 'thinking' ? 'PROCESSING' : reaction === 'listening' ? 'LISTENING' : 'ONLINE'}
                        </p>
                    </div>
                </div>
                
                {/* Simulation Controls (Top Right) */}
                <div className="flex gap-2">
                    {simMode !== 'NONE' && (
                         <div className="flex flex-col items-end mr-4 animate-in fade-in slide-in-from-right-4">
                             <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-700 backdrop-blur-md">
                                 <Sliders size={16} className="text-slate-400" />
                                 <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={simIntensity} 
                                    onChange={(e) => setSimIntensity(Number(e.target.value))}
                                    className="w-32 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                                 />
                                 <span className="text-xs font-mono text-blue-400 w-8 text-right">{simIntensity}%</span>
                             </div>
                             <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-wide">Simulation Intensity</p>
                         </div>
                    )}
                    <button onClick={() => setIsOpen(false)} className="p-2 rounded-full border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white transition">
                        <X size={24} />
                    </button>
                </div>
            </div>
            
            {/* Simulation Selection Quick Toggles (Left Side) */}
            <div className="absolute left-6 top-1/3 flex flex-col gap-3 pointer-events-auto">
                <button 
                    onClick={() => setSimMode(simMode === 'FLOOD' ? 'NONE' : 'FLOOD')}
                    className={`p-3 rounded-full border transition-all ${simMode === 'FLOOD' ? 'bg-blue-600 border-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.5)]' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-blue-400 hover:border-blue-400'}`}
                    title="Simulate Flood"
                >
                    <Waves size={20} />
                </button>
                <button 
                    onClick={() => setSimMode(simMode === 'FIRE' ? 'NONE' : 'FIRE')}
                    className={`p-3 rounded-full border transition-all ${simMode === 'FIRE' ? 'bg-red-600 border-red-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-400'}`}
                    title="Simulate Fire"
                >
                    <Flame size={20} />
                </button>
                <button 
                    onClick={() => setSimMode(simMode === 'STORM' ? 'NONE' : 'STORM')}
                    className={`p-3 rounded-full border transition-all ${simMode === 'STORM' ? 'bg-purple-600 border-purple-400 text-white shadow-[0_0_20px_rgba(147,51,234,0.5)]' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:text-purple-400 hover:border-purple-400'}`}
                    title="Simulate Storm"
                >
                    <CloudLightning size={20} />
                </button>
            </div>

            {locationRequest && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 border border-blue-500/50 p-6 rounded-xl backdrop-blur-md shadow-[0_0_50px_rgba(59,130,246,0.4)] text-center max-w-xs z-50 animate-in fade-in zoom-in duration-300 pointer-events-auto">
                    <MapPin className="w-12 h-12 text-blue-400 mx-auto mb-4 animate-bounce" />
                    <h3 className="text-lg font-bold text-white mb-2 tracking-wide">LOCATION REQUIRED</h3>
                    <p className="text-sm text-slate-300 mb-6 leading-relaxed">Aiden needs your GPS coordinates to analyze local risks and find nearby resources.</p>
                    <div className="flex gap-3 justify-center">
                        <button onClick={() => handleLocationResponse(false)} className="px-4 py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition hover:bg-slate-700 font-mono text-sm">DENY</button>
                        <button onClick={() => handleLocationResponse(true)} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg shadow-blue-900/50 transition font-mono text-sm">ALLOW ACCESS</button>
                    </div>
                </div>
            )}

            <div className="flex-1 flex flex-col items-center justify-end pb-12 pointer-events-auto">
                <div className="mb-8 text-center max-w-4xl flex flex-col items-center">
                     <p className={`text-xl md:text-3xl font-light leading-relaxed transition-colors duration-500 ${alertMode ? 'text-red-100 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]' : isLocating ? 'text-emerald-50 drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'text-blue-50 drop-shadow-[0_0_10px_rgba(59,130,246,0.3)]'}`}>
                        "{lastAiMsg?.text}"
                     </p>
                     
                     {/* Updated Grounding Chunks with Maps Support */}
                     {groundingChunks && groundingChunks.length > 0 && (
                        <div className="flex flex-wrap justify-center gap-2 mt-4 animate-in fade-in slide-in-from-bottom-2">
                             {groundingChunks.map((chunk: any, i: number) => {
                                 // Web Search Grounding
                                 if (chunk.web?.uri) {
                                     return (
                                         <a key={i} href={chunk.web.uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-600 text-xs text-blue-300 hover:bg-slate-700 transition">
                                            <ExternalLink size={12} /> {chunk.web.title || "Source"}
                                         </a>
                                     );
                                 }
                                 
                                 // Google Maps Grounding (handling typical structure for GenAI SDK)
                                 const mapData = (chunk as any).maps || (chunk as any).googleMapsMetadata;
                                 if (mapData?.uri || (chunk as any).web?.uri?.includes('google.com/maps')) {
                                     // Fallback: sometimes maps links might appear in web if not strictly typed, 
                                     // but here we check for explicit map data or URI patterns.
                                     const uri = mapData?.uri || (chunk as any).web?.uri;
                                     const title = mapData?.title || (chunk as any).web?.title || "View Location";
                                     
                                     return (
                                         <a key={i} href={uri} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-emerald-500/30 text-xs text-emerald-400 hover:bg-slate-700 transition">
                                            <MapPin size={12} /> {title}
                                         </a>
                                     );
                                 }
                                 return null;
                             })}
                        </div>
                     )}

                     {isProcessing && (
                        <div className="flex justify-center gap-2 mt-4">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-100"></span>
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce delay-200"></span>
                        </div>
                     )}
                </div>

                <div className={`h-8 text-sm font-mono text-slate-400 transition-opacity ${inputText ? 'opacity-100' : 'opacity-0'}`}>
                    &gt; {inputText}_
                </div>

                <div className="flex flex-col items-center gap-4 mt-8">
                     <button
                        onClick={toggleListening}
                        className={`
                            relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
                            ${isListening 
                                ? 'bg-red-500 text-white shadow-[0_0_60px_rgba(239,68,68,0.6)] scale-110' 
                                : 'bg-slate-800/50 border border-slate-600 text-blue-400 hover:border-blue-400 hover:shadow-[0_0_30px_rgba(59,130,246,0.4)]'
                            }
                        `}
                     >
                        {isListening && (
                            <>
                                <span className="absolute inset-0 rounded-full border-2 border-red-500 opacity-50 animate-ping"></span>
                                <span className="absolute -inset-4 rounded-full border border-red-500 opacity-30 animate-pulse"></span>
                            </>
                        )}
                        {isListening ? <Activity size={40} /> : <Mic size={32} />}
                     </button>
                     <p className="text-[10px] tracking-[0.3em] font-bold text-slate-500 uppercase">
                        {isListening ? 'LISTENING...' : 'TAP TO SPEAK'}
                     </p>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default Aiden;