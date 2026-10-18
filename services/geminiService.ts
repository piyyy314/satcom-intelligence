
import { GoogleGenAI, Type, FunctionDeclaration, Content, Modality, GenerateContentResponse } from "@google/genai";

// Tool Definition
const terminalSensorTool: FunctionDeclaration = {
  name: "read_terminal_sensors",
  description: "Reads live sensor telemetry from the local VSAT terminal hardware. Returns SNR, power levels, temperature, and packet stats.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      status: { type: Type.STRING, description: "Current hardware status" }
    },
  },
};

const getAiInstance = () => new GoogleGenAI({ 
  apiKey: process.env.API_KEY,
  httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
});

export const getTroubleshootingAdvice = async (
  issue: string, 
  context?: any, 
  telemetry?: any, 
  options: { thinking?: boolean, useSearch?: boolean, useMaps?: boolean, mediaData?: { data: string, mimeType: string }[] } = {}
) => {
  const ai = getAiInstance();
  const modelId = options.thinking ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash';
  
  const systemInstruction = `
    You are the 'SatExpert Tactical Intelligence Agent' (STIA).
    MISSION: Provide high-level technical SatCom intelligence and cyber defense maneuvers.
    
    ENVIRONMENT:
    - LAT: ${context?.lat ?? 'N/A'}, LNG: ${context?.lng ?? 'N/A'}
    - TARGET_ASSET: ${context?.satName ?? 'N/A'}
    - DEFCON: ${context?.defcon ?? 5}
    - EW_JAMMING: ${context?.isJamming ? 'YES' : 'NO'}
    - STEALTH_PROTOCOL: ${context?.isStealthMode ? 'ACTIVE' : 'INACTIVE'}
    
    INSTRUCTIONS:
    - If thinking mode is active, provide deep technical reasoning for VSAT infrastructure.
    - If search is enabled, ground your response in the latest satellite launches and security CVEs.
    - ALWAYS return helpful metadata if grounding chunks are present.
    
    TONE: Clinical, authoritative, military-grade. Use tactical jargon (e.g., 'EIRP saturation', 'FEC degradation').
  `;

  try {
    const tools: any[] = [];
    if (options.useSearch) tools.push({ googleSearch: {} });
    if (options.useMaps) tools.push({ googleMaps: {} });
    tools.push({ functionDeclarations: [terminalSensorTool] });

    const parts: any[] = [{ text: "STIA_COMMAND: " + issue }];
    if (options.mediaData) {
      options.mediaData.forEach(m => {
        parts.push({ inlineData: m });
      });
    }

    const contents: Content[] = [{ role: 'user', parts }];
    const config: any = {
      systemInstruction,
      tools: tools.length > 0 ? tools : undefined,
    };

    if (options.thinking) {
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    if (options.useMaps && context?.lat) {
      config.toolConfig = {
        includeServerSideToolInvocations: true,
        retrievalConfig: {
          latLng: { latitude: context.lat, longitude: context.lng }
        }
      };
    } else if (options.useSearch) {
      config.toolConfig = {
        includeServerSideToolInvocations: true
      };
    }

    let response = await ai.models.generateContent({
      model: modelId,
      contents,
      config,
    });

    const functionCalls = response.functionCalls;
    if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];
        if (call.name === 'read_terminal_sensors') {
            contents.push(response.candidates![0].content);
            contents.push({
                role: 'tool',
                parts: [{
                    functionResponse: {
                        name: 'read_terminal_sensors',
                        response: { result: telemetry }
                    }
                }]
            });
            
            response = await ai.models.generateContent({
                model: modelId,
                contents,
                config
            });
        }
    }

    let output = response.text || "";
    return {
      text: output,
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error: any) {
    console.error("STIA_CRITICAL_ERROR", error);
    if (error.message?.includes("Requested entity was not found")) {
      return { error: "KEY_AUTH_FAILURE", text: "STIA_HALT: Advanced API Key required for this operation." };
    }
    return { text: "SYSTEM_HALT: INTEL_UPLINK_FAILURE. CHECK_ENCRYPTION_LAYER." };
  }
};

export const generateTacticalImage = async (prompt: string, aspectRatio: string = "16:9", size: string = "1K") => {
  const ai = getAiInstance();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image',
      contents: { parts: [{ text: `High-fidelity tactical satellite visualization: ${prompt}. Professional technical military style.` }] },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
          imageSize: size as any
        }
      }
    });

    for (const part of response.candidates![0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (err: any) {
    console.error("IMAGE_GEN_ERROR", err);
    if (err.message?.includes("Requested entity was not found")) throw new Error("KEY_AUTH_FAILURE");
    return null;
  }
};

export const editTacticalImage = async (base64Image: string, prompt: string) => {
  const ai = getAiInstance();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Image.split(',')[1], mimeType: 'image/png' } },
          { text: `Apply tactical overlay: ${prompt}. Maintain technical accuracy.` }
        ]
      }
    });

    for (const part of response.candidates![0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (err) {
    console.error("IMAGE_EDIT_ERROR", err);
    return null;
  }
};

export const generateTacticalVideo = async (prompt: string, orientation: '16:9' | '9:16' = '16:9', startImage?: string) => {
  const ai = getAiInstance();
  try {
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: `Cinematic tactical satellite mission sequence: ${prompt}`,
      image: startImage ? {
        imageBytes: startImage.split(',')[1],
        mimeType: 'image/png'
      } : undefined,
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: orientation
      }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (err: any) {
    console.error("VIDEO_GEN_ERROR", err);
    if (err.message?.includes("Requested entity was not found")) throw new Error("KEY_AUTH_FAILURE");
    return null;
  }
};

export const transcribeAudio = async (base64Audio: string) => {
  const ai = getAiInstance();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: {
        parts: [
          { inlineData: { data: base64Audio, mimeType: 'audio/pcm;rate=16000' } },
          { text: "Transcribe the tactical comms precisely." }
        ]
      }
    });
    return response.text;
  } catch (err) {
    console.error("TRANSCRIPTION_ERROR", err);
    return "[COMM_INTERFERENCE]";
  }
};

export const getWarGamesTurn = async (history: any[], objective: string) => {
  const ai = getAiInstance();
  const systemInstruction = `
    You are a 'War Games Cyber-Orchestrator'. Simulate turns in a conflict for a SatCom link.
    - RED: Targeted Strike Team.
    - BLUE: Network Hardening Team.
    Respond strictly in the provided JSON schema.
  `;
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ role: 'user', parts: [{ text: `SIM_HISTORY: ${JSON.stringify(history)}. OBJECTIVE: ${objective}` }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            redTeamAction: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, rationale: { type: Type.STRING } }, required: ['action', 'rationale'] },
            blueTeamAction: { type: Type.OBJECT, properties: { action: { type: Type.STRING }, rationale: { type: Type.STRING } }, required: ['action', 'rationale'] },
            systemStateChange: { type: Type.OBJECT, properties: { narrative: { type: Type.STRING }, link_integrity_delta: { type: Type.NUMBER }, threat_level: { type: Type.STRING } }, required: ['narrative', 'link_integrity_delta', 'threat_level'] },
            isObjectiveMet: { type: Type.BOOLEAN }
          },
          required: ['redTeamAction', 'blueTeamAction', 'systemStateChange', 'isObjectiveMet']
        },
      },
    });
    return JSON.parse(response.text.trim());
  } catch (error) { return null; }
};

export const generateWarGamesReport = async (history: any[], objective: string) => {
  const ai = getAiInstance();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: [{ role: 'user', parts: [{ text: `Final Combat Log: ${JSON.stringify(history)}` }] }],
      config: {
        systemInstruction: "Generate a professional Post-Action Report (AAR) for this SatCom cyber engagement simulation.",
      },
    });
    return response.text;
  } catch (error) { return "ERROR: REPORT_COMPILATION_FAILED."; }
};

export const analyzeInterceptedSignal = async (params: any) => {
  const ai = getAiInstance();
  try {
    const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [{ role: 'user', parts: [{ text: "Analyze Intercept: " + JSON.stringify(params) }] }],
        config: {
            systemInstruction: "You are a SIGINT analyst. Provide a tactical assessment of the radio signal provided.",
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                probableOrigin: { type: Type.STRING },
                suspectedPurpose: { type: Type.STRING },
                threatLevel: { type: Type.STRING },
                encryptionType: { type: Type.STRING },
                suggestedKeyFragment: { type: Type.STRING },
              },
              required: ['probableOrigin', 'suspectedPurpose', 'threatLevel', 'encryptionType', 'suggestedKeyFragment']
            },
        },
    });
    return JSON.parse(response.text.trim());
  } catch(error) { return null; }
};

export const generateDecryptedMessage = async (analysis: any) => {
    const ai = getAiInstance();
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: [{ role: 'user', parts: [{ text: "Decrypt payload based on analysis." }] }],
            config: { systemInstruction: "Generate a tactical decrypted text message based on the SIGINT analysis. Military tone." },
        });
        return response.text;
    } catch(error) { return " // ...PACKET_LOSS_CRITICAL... //"; }
};
