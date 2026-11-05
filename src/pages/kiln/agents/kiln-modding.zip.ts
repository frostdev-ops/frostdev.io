import type { APIRoute } from 'astro';
import { skillZip } from '../../../lib/kilnSkill';

// /kiln/agents/kiln-modding.zip: the skill folder, ready for ~/.claude/skills/ or a Claude app's skill upload.
export const GET: APIRoute = () => new Response(skillZip(), { headers: { 'Content-Type': 'application/zip' } });
