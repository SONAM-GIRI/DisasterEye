import { GoogleGenAI, Type, FunctionDeclaration } from "@google/genai";
import { DisasterType, RiskLevel, PredictionResult, NewsItem } from "../types";

const initializeGemini = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API_KEY is missing from environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// --- Definitions for App Control Tools ---

const appControlTool: FunctionDeclaration = {
  name: "controlApp",
  description: "You have FULL SYSTEM CONTROL (J.A.R.V.I.S. protocol). You can manipulate the interface, run simulations, and control map views directly. Use this tool proactively.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      action: {
        type: Type.STRING,
        description: "The system command to execute.",
        enum: ["NAVIGATE", "SET_ALERT_MODE", "SIMULATION_CONTROL", "MAP_CONTROL", "OPEN_REPORT"]
      },
      route: {
        type: Type.STRING,
        description: "Target route for NAVIGATE.",
        enum: ["/", "/map", "/prediction", "/simulation", "/emergency-plan", "/ar-view", "/settings", "/contacts"]
      },
      alertActive: {
        type: Type.BOOLEAN,
        description: "Target state for SET_ALERT_MODE."
      },
      simulationCommand: {
        type: Type.STRING,
        description: "Command for the Digital Twin simulation.",
        enum: ["START", "STOP", "RESET", "SET_INTENSITY"]
      },
      intensityValue: {
        type: Type.NUMBER,
        description: "Intensity value (0-100) for SET_INTENSITY simulation command."
      },
      mapCommand: {
        type: Type.STRING,
        description: "Command for the Live Map.",
        enum: ["ZOOM_IN", "ZOOM_OUT", "RECENTER"]
      }
    },
    required: ["action"]
  }
};

const getUserLocationTool: FunctionDeclaration = {
  name: "getUserLocation",
  description: "Request the user's current physical geolocation. Use this PROACTIVELY when the user mentions 'local', 'nearby', 'where am I', or reports an emergency, to provide location-specific advice. The system will prompt the user for permission.",
};

const reportIncidentTool: FunctionDeclaration = {
  name: "reportIncident",
  description: "File an official disaster report to the system database. Use this when the user explicitly states they see a hazard or emergency (e.g. 'I see a fire', 'There is flooding here').",
  parameters: {
    type: Type.OBJECT,
    properties: {
      type: {
        type: Type.STRING,
        enum: [DisasterType.FLOOD, DisasterType.FIRE, DisasterType.EARTHQUAKE, DisasterType.LANDSLIDE, DisasterType.STORM],
        description: "The type of disaster being reported."
      },
      description: {
        type: Type.STRING,
        description: "A brief description of the incident based on user input."
      }
    },
    required: ["type", "description"]
  }
};

export const analyzeDisasterImage = async (base64Image: string): Promise<PredictionResult | null> => {
  const ai = initializeGemini();
  if (!ai) return null;

  try {
    const prompt = `
      Analyze this image for disaster risks. 
      Identify if there is a flood, fire, earthquake damage, landslide, or storm.
      Assess the severity and provide immediate actions.
      Return the result in strict JSON format.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            disasterType: { 
              type: Type.STRING, 
              enum: [
                DisasterType.FLOOD, 
                DisasterType.FIRE, 
                DisasterType.EARTHQUAKE, 
                DisasterType.LANDSLIDE, 
                DisasterType.STORM, 
                DisasterType.NONE
              ] 
            },
            confidence: { type: Type.NUMBER },
            riskLevel: { 
              type: Type.STRING,
              enum: [RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH, RiskLevel.CRITICAL]
            },
            summary: { type: Type.STRING },
            immediateActions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            estimatedImpact: {
              type: Type.OBJECT,
              properties: {
                radiusKm: { type: Type.NUMBER },
                peopleAffected: { type: Type.NUMBER },
                infrastructureDamage: { type: Type.STRING }
              }
            }
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as PredictionResult;
    }
    return null;

  } catch (error) {
    console.error("Error analyzing image with Gemini:", error);
    return null;
  }
};

export const generateEmergencyPlanText = async (context: string): Promise<string> => {
  const ai = initializeGemini();
  if (!ai) return "AI Service Unavailable";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a concise, step-by-step emergency evacuation and resource plan for the following situation: ${context}. Include specific resource allocation advice.`,
    });
    return response.text || "Could not generate plan.";
  } catch (error) {
    console.error(error);
    return "Error generating plan.";
  }
};

export interface ChatResponse {
    text: string;
    functionCall?: {
        name: string;
        args: any;
    };
    groundingMetadata?: any;
}

export const chatWithAssistant = async (
    history: {role: string, parts: {text: string}[]}[], 
    newMessage: string,
    userLocation?: { lat: number, lng: number }
): Promise<ChatResponse> => {
    const ai = initializeGemini();
    if (!ai) return { text: "System offline." };

    try {
        const tools = [
            { functionDeclarations: [appControlTool, getUserLocationTool, reportIncidentTool] },
            { googleMaps: {} }
        ];

        const modelConfig: any = {
            systemInstruction: "You are 'Aiden', a hyper-advanced AI system (similar to J.A.R.V.I.S.) integrated into the DisasterEye platform. \n\nCORE PROTOCOLS:\n1. **Take Control**: Don't just answer questions. If a user wants to see a simulation, navigate them there AND start it. If they want to see the map, take them there AND zoom in. Use the `controlApp` tool aggressively to manipulate the UI.\n2. **Be Concise & Authoritative**: Speak like a high-tech OS. Short, crisp, data-driven responses. E.g., 'Routing to sector 4.', 'Simulation initialized.', 'Scanning satellite feed.'\n3. **Safety First**: Prioritize human safety in all advice.\n4. **Hands-Free Reporting**: If a user says 'Report Hazard' or similar:\n   - If location is unknown, call `getUserLocation` FIRST.\n   - If type/description are missing, ASK the user (e.g., 'What kind of hazard?').\n   - Only call `reportIncident` when you have type, description, and location context.\n   - If user explicitly asks to see the form, use `controlApp(action='OPEN_REPORT')`.\n\nTOOL USAGE:\n- To change screens: `controlApp(action='NAVIGATE', route='...')`\n- To start/stop digital twin: `controlApp(action='SIMULATION_CONTROL', simulationCommand='START')`\n- To zoom map: `controlApp(action='MAP_CONTROL', mapCommand='ZOOM_IN')`\n- To open report form: `controlApp(action='OPEN_REPORT')`\n- To toggle Red Alert: `controlApp(action='SET_ALERT_MODE', alertActive=true)`\n\nAlways acknowledge the command verbally while executing the tool.",
            tools: tools
        };

        if (userLocation) {
            modelConfig.toolConfig = {
                retrievalConfig: {
                    latLng: {
                        latitude: userLocation.lat,
                        longitude: userLocation.lng
                    }
                }
            };
        }

        const chat = ai.chats.create({
            model: 'gemini-2.5-flash',
            history: history,
            config: modelConfig
        });
        
        const result = await chat.sendMessage({ message: newMessage });
        
        // Check for function calls
        const functionCalls = result.functionCalls;
        let funcCallData = undefined;

        if (functionCalls && functionCalls.length > 0) {
            const call = functionCalls[0];
            funcCallData = {
                name: call.name,
                args: call.args
            };
        }

        return { 
            text: result.text || "", 
            functionCall: funcCallData,
            groundingMetadata: result.candidates?.[0]?.groundingMetadata
        };

    } catch (e) {
        console.error(e);
        return { text: "Communication error." };
    }
}

export const fetchRealTimeNews = async (): Promise<NewsItem[]> => {
    const ai = initializeGemini();
    if (!ai) return [];

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: "Find the latest breaking news about natural disasters (earthquakes, floods, wildfires, storms) from trusted global sources in the last 24 hours.",
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (!chunks) return [];

        const items: NewsItem[] = chunks
            .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
            .map((chunk: any, index: number) => ({
                id: `live-${index}-${Date.now()}`,
                title: chunk.web.title,
                summary: "Live report retrieved from global monitoring network.",
                source: new URL(chunk.web.uri).hostname.replace('www.', ''),
                timestamp: new Date(),
                url: chunk.web.uri
            }));

        // Deduplicate
        const unique = items.filter((item, index, self) =>
            index === self.findIndex((t) => (
                t.url === item.url
            ))
        );

        return unique.slice(0, 10);
    } catch (error) {
        console.error("News fetch error:", error);
        return [];
    }
};