// Seed the Fuse5 master message-template library (multi-channel: display/email/sms)
// into a provider's templates table.  SUPABASE_URL=… SERVICE_ROLE_KEY=… ORG_ID=… node scripts/seed-master-templates.mjs
import { readFile } from "node:fs/promises";
const URL=process.env.SUPABASE_URL,KEY=process.env.SERVICE_ROLE_KEY,ORG=process.env.ORG_ID;
if(!URL||!KEY||!ORG){console.error("Set SUPABASE_URL, SERVICE_ROLE_KEY, ORG_ID");process.exit(1);}
const rows=JSON.parse(await readFile(new URL("./master-templates.json",import.meta.url)));
const body=rows.map(r=>({org_id:ORG,name:r.name,category:r.category,channels:r.channels,mandatory:r.mandatory,version:"1.0",body:r.body}));
const res=await fetch(`${URL}/rest/v1/templates`,{method:"POST",headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,"Content-Type":"application/json",Prefer:"return=minimal"},body:JSON.stringify(body)});
console.log(res.ok?`✓ seeded ${body.length} templates`:`✗ ${res.status} ${await res.text()}`);process.exit(res.ok?0:1);
