import { dataTool, ownerAuthorized, SafeError, type IntervalsEnv } from "./intervals.ts";
/** Stateless MCP. Sites dispatch owns OAuth and the owner-private access policy.
 * Never trust these identity headers outside the Sites dispatch boundary.
 * No identity is returned, logged, persisted, or passed to another service. */
const protocols = ["2025-06-18", "2025-03-26", "2024-11-05"];
const jsonHeaders = { "Content-Type": "application/json", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
const tool = {
  name: "check_connection",
  title: "檢查連線",
  description: "檢查此私人測試插件能否回應。只回傳固定測試狀態，不存取健康資料、金鑰、帳戶或外部服務。",
  inputSchema: { type: "object", properties: {}, additionalProperties: false },
  outputSchema: { type: "object", properties: { status: { type: "string", enum: ["ok"] }, message: { type: "string" }, mode: { type: "string", enum: ["connection_test_only"] } }, required: ["status", "message", "mode"], additionalProperties: false },
  annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
};
const dates = {start_date:{type:"string",pattern:"^\\d{4}-\\d{2}-\\d{2}$",description:"Athlete-local first day, inclusive."},end_date:{type:"string",pattern:"^\\d{4}-\\d{2}-\\d{2}$",description:"Athlete-local final day, inclusive; at most 31 days."}};
const annotations={readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:true};
const schema=(properties:Record<string,unknown>,required:string[]=[])=>({type:"object",properties,required,additionalProperties:false});
const dataTools=[
 {name:"list_workouts",title:"查詢 Zepp 活動摘要",description:"Read owner activities from Intervals. Only exact API source ZEPP is returned. No GPS, names, segments, files, or writes. Explicit local date window up to 31 days. Fails without partial data if pagination cannot establish completeness.",inputSchema:schema({...dates,limit:{type:"integer",minimum:1,maximum:100,default:20},offset:{type:"integer",minimum:0,maximum:10000,default:0}},["start_date","end_date"]),annotations},
 {name:"get_workout_detail",title:"查詢單筆 Zepp 活動",description:"Read an allowed activity summary by ID within an explicit local date window up to 31 days. Same ZEPP source and field restrictions as list_workouts; no GPS or stream details.",inputSchema:schema({...dates,workoutId:{type:"string",pattern:"^[A-Za-z0-9_-]{1,96}$"}},["start_date","end_date","workoutId"]),annotations},
 {name:"get_metric_series",title:"查詢日指標",description:"Read steps, resting HR, RMSSD HRV and sleep summary metrics. Requires configured owner declaration that the date window is Zepp-only and not manually edited. Without it values are null with source_unverified; never infer consent or origin. API has no wellness source field; owner-attested values remain source_verified=false. No automatic provider refresh.",inputSchema:schema({...dates,metrics:{type:"array",items:{type:"string",enum:["steps","resting_hr","hrv_rmssd","sleep_duration","sleep_score","sleep_quality"]},minItems:1,maxItems:6,uniqueItems:true}},["start_date","end_date","metrics"]),annotations},
 {name:"get_sleep_detail",title:"查詢睡眠摘要",description:"Read date-scoped owner-attested sleep duration, score and quality. No sleep stages, bedtime or wake time are available. Origin remains unverified by API. No automatic refresh.",inputSchema:schema({date:{type:"string",pattern:"^\\d{4}-\\d{2}-\\d{2}$"}},["date"]),annotations},
 {name:"get_data_health",title:"檢查資料連接設定",description:"Check owner-only configuration gates without calling Intervals, revealing a key or returning health records. Configured does not prove connection or freshness.",inputSchema:schema({}),annotations:{...annotations,openWorldHint:false}},
];
function json(value: unknown, status = 200) { return new Response(JSON.stringify(value), { status, headers: jsonHeaders }); }
function rpcError(id: unknown, code: number, message: string, status = 200) { return json({ jsonrpc: "2.0", id, error: { code, message } }, status); }
export async function handleMcp(request: Request, env: IntervalsEnv = {}): Promise<Response> {
  if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST", "Cache-Control": "no-store" } });
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return rpcError(null, -32000, "Origin not allowed", 403);
  if (!(request.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) return rpcError(null, -32600, "Expected application/json", 415);
  const declaredLength = Number(request.headers.get("content-length") || "0");
  if (declaredLength > 16384) return rpcError(null, -32600, "Request too large", 413);
  let body: unknown;
  try {
    if (!request.body) return rpcError(null,-32700,"Parse error",400);
    const reader=request.body.getReader();const chunks:Uint8Array[]=[];let total=0;
    for(;;){const part=await reader.read();if(part.done)break;total+=part.value.byteLength;if(total>16384){await reader.cancel();return rpcError(null,-32600,"Request too large",413);}chunks.push(part.value);}
    const bytes=new Uint8Array(total);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const source=new TextDecoder().decode(bytes);
    body = JSON.parse(source);
  } catch { return rpcError(null, -32700, "Parse error", 400); }
  if (!body || typeof body !== "object" || Array.isArray(body)) return rpcError(null, -32600, "Invalid request", 400);
  const rpc = body as Record<string, unknown>;
  const id = rpc.id;
  if (rpc.jsonrpc !== "2.0" || typeof rpc.method !== "string" || (id !== undefined && typeof id !== "number" && typeof id !== "string")) return rpcError(null, -32600, "Invalid request", 400);
  if (id === undefined) {
    if (rpc.method === "notifications/initialized" || rpc.method === "notifications/cancelled") return new Response(null, { status: 202, headers: { "Cache-Control": "no-store" } });
    return rpcError(null, -32600, "A request ID is required", 400);
  }
  const params = rpc.params && typeof rpc.params === "object" && !Array.isArray(rpc.params) ? rpc.params as Record<string, unknown> : {};
  const ok = (result: unknown) => json({ jsonrpc: "2.0", id, result });
  if (rpc.method === "initialize") return ok({ protocolVersion: typeof params.protocolVersion === "string" && protocols.includes(params.protocolVersion) ? params.protocolVersion : protocols[0], capabilities: { tools: { listChanged: false } }, serverInfo: { name: "zepp-intervals-mcp", version: "2.0.0" }, instructions: "Owner-private read-only Intervals adapter. Never request or accept credentials in tool arguments. Request explicit athlete-local dates, maximum 31 days. Activity source must be ZEPP. Wellness is withheld without configured date-scoped owner declaration; owner-attested values are not source-verified by the API. No GPS, caching, provider writes, or automatic wellness refresh. Respect retry_after_seconds; never retry automatically. Fetch time does not establish latest Zepp sync." });
  if (rpc.method === "ping") return ok({});
  if (rpc.method === "tools/list") return ok({ tools: [tool, ...dataTools] });
  if (rpc.method === "tools/call") {
    // Fail closed without user identity, including platform service access.
    if (!request.headers.get("oai-authenticated-user-id")?.trim() || !request.headers.get("oai-authenticated-user-email")?.trim()) return rpcError(id, -32001, "Authenticated Site user required", 401);
    if (typeof params.name !== "string" || ![tool.name,...dataTools.map(t=>t.name)].includes(params.name)) return rpcError(id, -32602, "Unknown tool");
    if (params.arguments !== undefined && (!params.arguments || typeof params.arguments !== "object" || Array.isArray(params.arguments))) return rpcError(id,-32602,"Invalid arguments");
    const args=(params.arguments??{}) as Record<string,unknown>;
    if(params.name===tool.name){
      if(Object.keys(args).length) return rpcError(id,-32602,"This tool accepts no arguments");
      const result={status:"ok",message:"連線測試成功",mode:"connection_test_only"};
      return ok({content:[{type:"text",text:JSON.stringify(result)}],structuredContent:result,isError:false});
    }
    if(!await ownerAuthorized(request,env)) return rpcError(id,-32003,"Site owner authorization required",403);
    try {
      const result=await dataTool(params.name,args,env);
      return ok({content:[{type:"text",text:JSON.stringify(result)}],structuredContent:result,isError:false});
    } catch(error) {
      const code=error instanceof SafeError?error.code:"adapter_internal_error";
      const result={error:code,retry_after_seconds:error instanceof SafeError?error.retryAfter:null,partial_data_returned:false};
      return ok({content:[{type:"text",text:JSON.stringify(result)}],structuredContent:result,isError:true});
    }
  }
  return rpcError(id, -32601, "Method not found");
}
