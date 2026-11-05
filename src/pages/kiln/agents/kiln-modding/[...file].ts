import type { APIRoute, GetStaticPaths } from 'astro';
import { skillFiles } from '../../../../lib/kilnSkill';

// /kiln/agents/kiln-modding/SKILL.md and /kiln/agents/kiln-modding/references/*.md: each skill file as plain text.
export const getStaticPaths: GetStaticPaths = () => skillFiles.map((file) => ({ params: { file: file.path }, props: { text: file.text } }));
export const GET: APIRoute = ({ props }) => new Response(props.text as string, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
