import { createAdminSupabaseClient, createServerSupabaseClient, isSupabaseServerConfigured } from '@/lib/supabase/server';
import { SectionCommentItem } from '@/lib/share/comments';

interface CommentRow {
  id: string;
  rider_id: string;
  section_id: string;
  author_name: string;
  body: string;
  created_at: string;
}

const memoryComments: CommentRow[] = [];
let warnedMissingTable = false;

function toItem(row: CommentRow): SectionCommentItem {
  return {
    id: row.id,
    sectionId: row.section_id,
    authorName: row.author_name,
    body: row.body,
    createdAt: row.created_at,
  };
}

function remember(row: CommentRow) {
  if (!warnedMissingTable) {
    warnedMissingTable = true;
    console.warn('[comments] La tabla rider_section_comments no está disponible. Ejecuta supabase/migrations/20261009_rider_section_comments.sql');
  }
  memoryComments.push(row);
}

async function commentClient() {
  if (!isSupabaseServerConfigured()) return null;
  const admin = createAdminSupabaseClient();
  if (admin) return admin;
  return createServerSupabaseClient();
}

export async function listSectionComments(riderId: string): Promise<SectionCommentItem[]> {
  const supabase = await commentClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('rider_section_comments')
      .select('id, rider_id, section_id, author_name, body, created_at')
      .eq('rider_id', riderId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const fromDatabase = data.map((row) => toItem(row as CommentRow));
      const savedIds = new Set(fromDatabase.map((comment) => comment.id));
      const pending = memoryComments
        .filter((row) => row.rider_id === riderId && !savedIds.has(row.id))
        .map(toItem);
      return [...fromDatabase, ...pending].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    }
    if (error) console.warn('[comments] list', error.message);
  }

  return memoryComments
    .filter((row) => row.rider_id === riderId)
    .map(toItem);
}

export async function createSectionComment(input: {
  riderId: string;
  sectionId: string;
  authorName: string;
  body: string;
}): Promise<SectionCommentItem> {
  const supabase = await commentClient();
  if (supabase) {
    const { data, error } = await supabase
      .from('rider_section_comments')
      .insert({
        rider_id: input.riderId,
        section_id: input.sectionId,
        author_name: input.authorName,
        body: input.body,
      })
      .select('id, rider_id, section_id, author_name, body, created_at')
      .single();

    if (!error && data) return toItem(data as CommentRow);
    if (error) console.warn('[comments] create', error.message);
  }

  const row: CommentRow = {
    id: crypto.randomUUID(),
    rider_id: input.riderId,
    section_id: input.sectionId,
    author_name: input.authorName,
    body: input.body,
    created_at: new Date().toISOString(),
  };
  remember(row);
  return toItem(row);
}
