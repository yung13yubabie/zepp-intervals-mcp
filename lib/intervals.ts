/** Owner-private, on-demand adapter. No logs, database, cache, writes or arbitrary URLs. */
export interface IntervalsEnv {
  OWNER_EMAIL_SHA256?: string;
  INTERVALS_API_KEY?: string;
  INTERVALS_READ_ENABLED?: string;
  INTERVALS_API_TERMS_ACCEPTED?: string;
  WELLNESS_ZEPP_ONLY_CONFIRMED?: string;
  WELLNESS_ZEPP_ONLY_FROM?: string;
  WELLNESS_ZEPP_ONLY_THROUGH?: string;
  WELLNESS_ATTESTED_AT?: string;
}
export const METRICS = {
  steps: ['steps', 'count'], resting_hr: ['restingHR', 'bpm'], hrv_rmssd: ['hrv', 'ms'],
  sleep_duration: ['sleepSecs', 'seconds'], sleep_score: ['sleepScore', 'provider_score_scale_unknown'],
  sleep_quality: ['sleepQuality', 'ordinal_1_best_4_worst'],
} as const;
type Metric = keyof typeof METRICS;
type Row = Record<string, unknown>;
type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>;
const DAY = 86400000;
const ACTIVITY_FIELDS = 'id,source,start_date,start_date_local,type,distance,moving_time,elapsed_time,average_heartrate,max_heartrate';
const WELLNESS_FIELDS = 'id,updated,steps,sleepSecs,sleepScore,sleepQuality,restingHR,hrv,tempRestingHR';
const MAX_BYTES = 2 * 1024 * 1024;
export class SafeError extends Error {
  code: string; retryAfter: number | null;
  constructor(code: string, retryAfter: number | null = null) { super(code); this.code=code;this.retryAfter=retryAfter; }
}
export function day(value: unknown): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new SafeError('invalid_date');
  const time = Date.parse(value+'T00:00:00Z');
  if (!Number.isFinite(time) || new Date(time).toISOString().slice(0,10) !== value) throw new SafeError('invalid_date');
  return value;
}
export function windowDates(args: Row) {
  const from=day(args.start_date), through=day(args.end_date);
  const count=(Date.parse(through)-Date.parse(from))/DAY+1;
  if (count<1 || count>31) throw new SafeError('date_window_must_be_1_to_31_days');
  return {from,through,count};
}
export async function ownerAuthorized(request: Request, env: IntervalsEnv) {
  const email=request.headers.get('oai-authenticated-user-email')?.trim().toLowerCase();
  if (!request.headers.get('oai-authenticated-user-id')?.trim() || !email || !/^[a-f0-9]{64}$/.test(env.OWNER_EMAIL_SHA256 || '')) return false;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email));
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return hash===env.OWNER_EMAIL_SHA256;
}
export function attestation(env: IntervalsEnv) {
  try {
    if (env.WELLNESS_ZEPP_ONLY_CONFIRMED !== 'true') return null;
    const from=day(env.WELLNESS_ZEPP_ONLY_FROM),through=day(env.WELLNESS_ZEPP_ONLY_THROUGH);
    const at=awareTime(env.WELLNESS_ATTESTED_AT);
    if (from>through || !at || through>at.slice(0,10) || Date.parse(at)>Date.now()+300000) return null;
    return {from,through,at};
  } catch { return null; }
}
function key(env: IntervalsEnv) {
  if (env.INTERVALS_READ_ENABLED !== 'true') throw new SafeError('read_disabled');
  if (env.INTERVALS_API_TERMS_ACCEPTED !== 'true') throw new SafeError('api_terms_acceptance_required');
  const value=env.INTERVALS_API_KEY;
  if (typeof value!=='string' || !/^[\x21-\x7E]{1,4096}$/.test(value)) throw new SafeError('credential_not_configured');
  return value;
}
function numeric(v: unknown) { return typeof v==='number' && Number.isFinite(v) && v>=0 ? v : null; }
function awareTime(v: unknown): string | null {
  if (typeof v!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:?\d{2})$/.test(v) || !Number.isFinite(Date.parse(v))) return null;
  return v;
}
function localTime(v: unknown): string | null {
  if (typeof v!=='string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?$/.test(v)) return null;
  if (!Number.isFinite(Date.parse(v+'Z'))) return null;
  try {day(v.slice(0,10));}catch{return null;}
  return v;
}
function retryDelay(value: string | null) {
  if (!value) return null;
  const secs=/^\d+$/.test(value) ? Number(value) : (Date.parse(value)-Date.now())/1000;
  return Number.isFinite(secs) ? Math.max(0,Math.min(604800,Math.ceil(secs))) : null;
}
async function readJson(response: Response) {
  if (Number(response.headers.get('content-length'))>MAX_BYTES) {await response.body?.cancel();throw new SafeError('response_too_large');}
  if (!response.headers.get('content-type')?.toLowerCase().includes('json')) {await response.body?.cancel();throw new SafeError('invalid_provider_response');}
  if (!response.body) throw new SafeError('invalid_provider_response');
  const reader=response.body.getReader(), chunks:Uint8Array[]=[]; let total=0;
  for (;;) { const r=await reader.read();if(r.done)break;total+=r.value.byteLength;if(total>MAX_BYTES){await reader.cancel();throw new SafeError('response_too_large');}chunks.push(r.value); }
  const bytes=new Uint8Array(total);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try {const rows:unknown=JSON.parse(new TextDecoder().decode(bytes));if(!Array.isArray(rows)||rows.some(r=>!r||typeof r!=='object'||Array.isArray(r)))throw new Error();return rows as Row[];}catch{throw new SafeError('invalid_provider_response');}
}
function makeClient(env:IntervalsEnv, fetcher:Fetcher, signal:AbortSignal) {
  const apiKey=key(env);let requests=0;
  return async (kind:'activities'|'wellness',from:string,through:string) => {
    if(++requests>8) throw new SafeError('request_budget_exceeded_no_partial_result');
    const url=new URL('https://intervals.icu/api/v1/athlete/0/'+kind);
    url.searchParams.set('oldest',from);url.searchParams.set('newest',through);
    url.searchParams.set('fields',kind==='activities'?ACTIVITY_FIELDS:WELLNESS_FIELDS);
    if(kind==='activities')url.searchParams.set('limit','1000');
    let response:Response;
    try { response=await fetcher(url,{method:'GET',headers:{Authorization:'Basic '+btoa('API_KEY:'+apiKey),Accept:'application/json'},redirect:'manual',cache:'no-store',credentials:'omit',signal}); }
    catch {throw new SafeError(signal.aborted?'provider_timeout':'provider_network_error');}
    if(response.status!==200){await response.body?.cancel();if(response.status===401||response.status===403)throw new SafeError('provider_credential_rejected');if(response.status===429)throw new SafeError('provider_rate_limited',retryDelay(response.headers.get('retry-after')));if(response.status>=300&&response.status<400)throw new SafeError('provider_redirect_rejected');throw new SafeError(response.status>=500?'provider_unavailable':'provider_http_error');}
    try{return await readJson(response);}catch(e){if(e instanceof SafeError)throw e;throw new SafeError(signal.aborted?'provider_timeout':'invalid_provider_response');}
  };
}
function metadata(from:string,through:string,fetchedAt:string|null) {
  return {data_mode:'live_on_demand',source:'Intervals.icu selected fields',fetched_at:fetchedAt,last_zepp_sync_at:null,timezone:'athlete_local_unspecified',requested_window:{oldest:from,newest:through},window_complete_for_requested_api_window:true,completeness_scope:'requested_intervals_api_window_not_all_zepp_history',cached:false,automatic_wellness_refresh:false,warnings:['INTERVALS_FETCH_IS_NOT_PROOF_OF_LATEST_ZEPP_SYNC','UNKNOWN_VALUES_ARE_NOT_ZERO','WELLNESS_API_HAS_NO_SOURCE_FIELD']};
}
function provenance(fetched:string|null, activity:boolean, updated:string|null=null,reason:string|null=null,attested=false) {
  return {source:'Intervals.icu',original_source:activity?'ZEPP':attested?'ZEPP_OWNER_ATTESTED':'UNVERIFIED',source_verified:activity,source_basis:activity?'api_source_enum':attested?'owner_date_scoped_declaration':'no_provider_source_field',fetched_at:fetched,provider_updated_at:updated,timezone:'athlete_local_unspecified',missing_reason:reason};
}
const ACTIVITY_TYPES=new Set(['Run','Ride','Walk','Hike','Swim','VirtualRide','VirtualRun','Workout','WeightTraining','Yoga','Rowing','Elliptical','AlpineSki','NordicSki','Snowboard','TrailRun','MountainBikeRide','GravelRide','EBikeRide','E-MountainBikeRide','IndoorCycling','IndoorRun','Other']);
function activity(raw:Row,fetched:string) {
  const id=typeof raw.id==='string' && /^[A-Za-z0-9_-]{1,96}$/.test(raw.id)?raw.id:null;
  const local=localTime(raw.start_date_local);
  if(raw.source!=='ZEPP')return null;
  if(!id||!local)throw new SafeError('invalid_activity_identity_or_date');
  return {workoutId:id,type:typeof raw.type==='string'&&ACTIVITY_TYPES.has(raw.type)?raw.type:'Other',startTime:awareTime(raw.start_date),startTimeLocal:local,distanceMeters:numeric(raw.distance),movingSeconds:numeric(raw.moving_time),elapsedSeconds:numeric(raw.elapsed_time),avgHr:numeric(raw.average_heartrate),maxHr:numeric(raw.max_heartrate),time_basis:'provider_utc_and_local_no_inferred_offset',distance_unit:'meters',duration_unit:'seconds',heart_rate_unit:'bpm',provenance:provenance(fetched,true)};
}
async function activities(client:ReturnType<typeof makeClient>,from:string,through:string,fetched:string) {
  const map=new Map<string,ReturnType<typeof activity>>();
  const windowEnd=Date.parse(through+'T00:00:00Z')+DAY;
  async function part(a:number,b:number):Promise<void>{
    const iso=(t:number)=>new Date(t).toISOString().slice(0,19);
    const inclusiveEnd=b===windowEnd?iso(b-1000)+'.999999':iso(b);
    const rows=await client('activities',iso(a),inclusiveEnd);
    if(rows.length>=1000){if(b-a<=1000)throw new SafeError('saturated_window_no_partial_result');const mid=Math.floor((a+b)/2000)*1000;await part(a,mid);await part(mid,b);return;}
    for(const raw of rows){const row=activity(raw,fetched);if(!row)continue;const date=row.startTimeLocal.slice(0,10);if(date<from||date>through)throw new SafeError('provider_out_of_window');const old=map.get(row.workoutId);if(old&&JSON.stringify(old)!==JSON.stringify(row))throw new SafeError('conflicting_activity_id');map.set(row.workoutId,row);}
  }
  await part(Date.parse(from+'T00:00:00Z'),windowEnd);
  return [...map.values()].filter((x):x is NonNullable<typeof x>=>x!==null).sort((a,b)=>b.startTimeLocal.localeCompare(a.startTimeLocal));
}
function wellnessPoint(metric:Metric,date:string,raw:Row|undefined,env:IntervalsEnv,fetched:string|null) {
  const declaration=attestation(env),verified=!!declaration&&date>=declaration.from&&date<=declaration.through;
  const [field]=METRICS[metric];let value=numeric(raw?.[field]),reason:string|null=null;
  if(!verified){value=null;reason='source_unverified';}
  else if(!raw){value=null;reason='no_provider_record';}
  else if(metric==='resting_hr'&&raw.tempRestingHR===true){value=null;reason='carried_forward_not_measured';}
  else if(metric==='sleep_quality'&&(value===null||!Number.isInteger(value)||value<1||value>4)){value=null;reason='missing_or_invalid';}
  else if(value===null)reason='missing_or_invalid';
  else if(metric==='steps'&&!Number.isInteger(value)){value=null;reason='missing_or_invalid';}
  const p={...provenance(verified?fetched:null,false,verified?awareTime(raw?.updated):null,reason,verified),measurement_context:metric==='resting_hr'&&raw?.tempRestingHR!==false?'measurement_status_unknown':metric==='hrv_rmssd'?'rmssd_night_average_only_if_declared_zepp_source':'provider_daily_value'};
  return {date,value,provenance:p};
}
export function configStatus(env:IntervalsEnv) {
  const a=attestation(env);
  return {source:'intervals_icu',status:env.INTERVALS_READ_ENABLED!=='true'?'read_disabled':env.INTERVALS_API_TERMS_ACCEPTED!=='true'?'terms_pending':!env.INTERVALS_API_KEY?'credential_not_configured':'configured_not_connection_verified',key_configured:!!env.INTERVALS_API_KEY,owner_lock_configured:/^[a-f0-9]{64}$/.test(env.OWNER_EMAIL_SHA256||''),wellness_source_policy:a?'date_scoped_owner_attestation':'blocked_pending_owner_attestation',wellness_source_verified_by_api:false,last_successful_fetch_at:null,last_zepp_sync_at:null,cached:false,automatic_wellness_refresh:false,read_only_adapter:true};
}
export async function dataTool(name:string,args:Row,env:IntervalsEnv,fetcher:Fetcher=fetch) {
  if(name==='get_data_health'){if(Object.keys(args).length)throw new SafeError('invalid_arguments');return configStatus(env);}
  const allowed=name==='get_metric_series'?['start_date','end_date','metrics']:name==='get_workout_detail'?['start_date','end_date','workoutId']:name==='get_sleep_detail'?['date']:['start_date','end_date','limit','offset'];
  if(Object.keys(args).some(k=>!allowed.includes(k)))throw new SafeError('invalid_arguments');
  if(name==='get_sleep_detail')args={start_date:day(args.date),end_date:day(args.date)};
  const {from,through,count}=windowDates(args);
  if(name==='get_metric_series'&&(!Array.isArray(args.metrics)||args.metrics.length<1||args.metrics.length>6||new Set(args.metrics).size!==args.metrics.length||args.metrics.some(m=>typeof m!=='string'||!Object.hasOwn(METRICS,m))))throw new SafeError('invalid_metrics');
  if(name==='get_workout_detail'&&(typeof args.workoutId!=='string'||!/^[A-Za-z0-9_-]{1,96}$/.test(args.workoutId)))throw new SafeError('invalid_workout_id');
  const fetched=new Date().toISOString();
  if(name==='list_workouts'||name==='get_workout_detail') {
    const limit=args.limit??20,offset=args.offset??0;
    if(typeof limit!=='number'||!Number.isInteger(limit)||limit<1||limit>100||typeof offset!=='number'||!Number.isInteger(offset)||offset<0||offset>10000)throw new SafeError('invalid_pagination');
    const rows=await activities(makeClient(env,fetcher,AbortSignal.timeout(20000)),from,through,fetched);
    const completed=new Date().toISOString();for(const row of rows)row.provenance.fetched_at=completed;
    return name==='list_workouts'?{workouts:rows.slice(offset,offset+limit),limit,offset,total:rows.length,hasMore:offset+limit<rows.length,metadata:metadata(from,through,completed)}:{workout:rows.find(r=>r.workoutId===args.workoutId)??null,metadata:metadata(from,through,completed)};
  }
  if(name!=='get_metric_series'&&name!=='get_sleep_detail')throw new SafeError('unknown_tool');
  key(env); // Consent/key guard remains required even when values are withheld.
  const declaration=attestation(env);let fetchedAt:string|null=null;let queriedWindow:{oldest:string;newest:string}|null=null;const rows=new Map<string,Row>();
  // No upstream wellness request until an owner-declared window overlaps this request.
  if(declaration&&declaration.from<=through&&declaration.through>=from){
    const a=declaration.from>from?declaration.from:from,b=declaration.through<through?declaration.through:through;
    const raw=await makeClient(env,fetcher,AbortSignal.timeout(20000))('wellness',a,b);fetchedAt=new Date().toISOString();queriedWindow={oldest:a,newest:b};
    for(const row of raw){const date=day(row.id);if(date<a||date>b)throw new SafeError('provider_out_of_window');if(rows.has(date))throw new SafeError('conflicting_wellness_date');rows.set(date,row);}
  }
  const dates=Array.from({length:count},(_,i)=>new Date(Date.parse(from)+i*DAY).toISOString().slice(0,10));
  const metrics=name==='get_sleep_detail'?['sleep_duration','sleep_score','sleep_quality'] as Metric[]:args.metrics as Metric[];
  const series=metrics.map(metric=>{const points=dates.map(date=>wellnessPoint(metric,date,rows.get(date),env,fetchedAt));return {metric,unit:METRICS[metric][1],points,window_days:count,days_with_data:points.filter(p=>p.value!==null).length};});
  const meta={...metadata(from,through,fetchedAt),window_complete_for_requested_api_window:!!queriedWindow&&queriedWindow.oldest===from&&queriedWindow.newest===through,queried_window:queriedWindow,wellness_source_verified_by_api:false,wellness_source_policy:declaration?'date_scoped_owner_attestation':'blocked_pending_owner_attestation'};
  if(name==='get_sleep_detail')return {sleep:{sleep_id:from,date:from,duration_seconds:series[0].points[0].value,score:series[1].points[0].value,quality:series[2].points[0].value,duration_unit:'seconds',score_unit:METRICS.sleep_score[1],quality_unit:METRICS.sleep_quality[1],start_time:null,end_time:null,stages_available:false,provenance:series[0].points[0].provenance,field_provenance:{duration:series[0].points[0].provenance,score:series[1].points[0].provenance,quality:series[2].points[0].provenance}},metadata:meta};
  return {series,metadata:meta};
}
