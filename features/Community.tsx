import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Heart,
  MessageCircle,
  Trash2,
  Flag,
  Send,
  HelpCircle,
  Lightbulb,
  TriangleAlert,
  MessagesSquare,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { Card, PageHeader, StateBox, Avatar, useL, useRelativeTime } from '../components/ui';
import {
  CommunityPost,
  Topic,
  TOPICS,
  fetchPosts,
  createPost,
  createComment,
  toggleLike,
  deletePost,
  reportPost,
  deleteComment,
} from '../services/communityApi';
import { ApiError } from '../services/apiClient';
import { refreshFromServer } from '../services/persistenceService';

interface CommunityProps {
  onBack?: () => void;
}

const TOPIC_META: Record<Topic, { icon: LucideIcon; badge: string }> = {
  general: {
    icon: MessagesSquare,
    badge: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
  },
  question: {
    icon: HelpCircle,
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  },
  astuce: {
    icon: Lightbulb,
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
  },
  alerte: {
    icon: TriangleAlert,
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  },
};

const MAX_POST = 1000;
const MAX_COMMENT = 500;

const errorMessage = (e: unknown, fallback: string) =>
  e instanceof ApiError && e.message ? e.message : fallback;

export const Community: React.FC<CommunityProps> = () => {
  const L = useL();
  const timeAgo = useRelativeTime();
  const topicLabel = (t: Topic | 'all') =>
    ({
      all: L('Tout', 'All', 'Todo'),
      general: L('Discussion', 'Discussion', 'Debate'),
      question: L('Question', 'Question', 'Pregunta'),
      astuce: L('Astuce', 'Tip', 'Consejo'),
      alerte: L('Alerte', 'Alert', 'Alerta'),
    })[t];

  const [filter, setFilter] = useState<Topic | 'all'>('all');
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [canModerate, setCanModerate] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [state, setState] = useState<'loading' | 'error' | 'ready'>('loading');
  const [draft, setDraft] = useState('');
  const [draftTopic, setDraftTopic] = useState<Topic>('general');
  const [publishing, setPublishing] = useState(false);
  const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});

  const load = useCallback(async (topic: Topic | 'all') => {
    setState('loading');
    try {
      const res = await fetchPosts(topic);
      setPosts(res.posts);
      setCanModerate(res.canModerate);
      setHasMore(res.posts.length >= 20);
      setState('ready');
    } catch {
      setState('error');
    }
  }, []);

  useEffect(() => {
    void load(filter);
  }, [filter, load]);

  const loadMore = async () => {
    const last = posts[posts.length - 1];
    if (!last) return;
    try {
      const res = await fetchPosts(filter, last.id);
      setPosts((prev) => [...prev, ...res.posts]);
      setHasMore(res.posts.length >= 20);
    } catch (e) {
      setNotice({
        type: 'error',
        text: errorMessage(
          e,
          L('Chargement impossible.', 'Could not load more.', 'No se pudo cargar más.'),
        ),
      });
    }
  };

  const publish = async (e: React.FormEvent) => {
    e.preventDefault();
    setNotice(null);
    setPublishing(true);
    try {
      await createPost(draft, draftTopic);
      setDraft('');
      setNotice({
        type: 'success',
        text: L('Message publié.', 'Message published.', 'Mensaje publicado.'),
      });
      // Met à jour les badges : « Défenseur Communautaire » se débloque dès le premier message
      void refreshFromServer().catch(() => {
        /* le compteur se mettra à jour à la prochaine synchronisation */
      });
      await load(filter);
    } catch (err) {
      setNotice({
        type: 'error',
        text: errorMessage(
          err,
          L('Publication impossible.', 'Could not publish.', 'No se pudo publicar.'),
        ),
      });
    } finally {
      setPublishing(false);
    }
  };

  const like = async (post: CommunityPost) => {
    // Mise à jour immédiate, puis alignement sur la réponse du serveur
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id ? { ...p, liked: !p.liked, likes: p.likes + (p.liked ? -1 : 1) } : p,
      ),
    );
    try {
      const res = await toggleLike(post.id);
      setPosts((prev) =>
        prev.map((p) => (p.id === post.id ? { ...p, liked: res.liked, likes: res.likes } : p)),
      );
    } catch {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? post : p)));
    }
  };

  const report = async (post: CommunityPost) => {
    if (
      !window.confirm(
        L(
          'Signaler ce message aux modérateurs ?',
          'Report this message to the moderators?',
          '¿Denunciar este mensaje a los moderadores?',
        ),
      )
    )
      return;
    try {
      await reportPost(post.id);
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, reportedByMe: true } : p)));
      setNotice({
        type: 'success',
        text: L(
          'Merci, votre signalement a été transmis aux modérateurs.',
          'Thank you, your report has been sent to the moderators.',
          'Gracias, su denuncia se ha enviado a los moderadores.',
        ),
      });
    } catch (e) {
      setNotice({
        type: 'error',
        text: errorMessage(
          e,
          L('Signalement impossible.', 'Could not report.', 'No se pudo denunciar.'),
        ),
      });
    }
  };

  const remove = async (post: CommunityPost) => {
    if (
      !window.confirm(
        L('Supprimer ce message ?', 'Delete this message?', '¿Eliminar este mensaje?'),
      )
    )
      return;
    try {
      await deletePost(post.id);
      setPosts((prev) => prev.filter((p) => p.id !== post.id));
    } catch (e) {
      setNotice({
        type: 'error',
        text: errorMessage(
          e,
          L('Suppression impossible.', 'Could not delete.', 'No se pudo eliminar.'),
        ),
      });
    }
  };

  const comment = async (post: CommunityPost) => {
    const text = (commentDrafts[post.id] || '').trim();
    if (!text) return;
    try {
      await createComment(post.id, text);
      setCommentDrafts((d) => ({ ...d, [post.id]: '' }));
      await load(filter);
    } catch (e) {
      setNotice({
        type: 'error',
        text: errorMessage(
          e,
          L('Commentaire impossible.', 'Could not comment.', 'No se pudo comentar.'),
        ),
      });
    }
  };

  const removeComment = async (id: number) => {
    try {
      await deleteComment(id);
      setPosts((prev) =>
        prev.map((p) => ({ ...p, comments: p.comments.filter((c) => c.id !== id) })),
      );
    } catch (e) {
      setNotice({
        type: 'error',
        text: errorMessage(
          e,
          L('Suppression impossible.', 'Could not delete.', 'No se pudo eliminar.'),
        ),
      });
    }
  };

  const toggleComments = (id: number) =>
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="mx-auto max-w-3xl space-y-5 px-1">
      <PageHeader
        icon={<Users className="h-5 w-5" aria-hidden="true" />}
        title={L('Communauté', 'Community', 'Comunidad')}
        subtitle={L(
          'Posez vos questions, partagez des astuces et alertez les autres membres.',
          'Ask questions, share tips and warn other members.',
          'Haz preguntas, comparte consejos y alerta a otros miembros.',
        )}
      />

      <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-xs text-sky-900 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
        <p>
          {L(
            'Restez bienveillant. Ne partagez jamais de mot de passe, de code reçu par SMS ni de données personnelles. Seuls votre prénom et l’initiale de votre nom sont affichés.',
            'Be kind. Never share passwords, SMS codes or personal data. Only your first name and last initial are shown.',
            'Sé amable. Nunca compartas contraseñas, códigos SMS ni datos personales. Solo se muestran tu nombre y la inicial de tu apellido.',
          )}
        </p>
      </div>

      {/* Composer */}
      <Card className="p-4">
        <form onSubmit={publish} className="space-y-3">
          <div
            className="flex flex-wrap gap-2"
            role="radiogroup"
            aria-label={L('Sujet du message', 'Message topic', 'Tema del mensaje')}
          >
            {TOPICS.map((t) => {
              const Icon = TOPIC_META[t].icon;
              const active = draftTopic === t;
              return (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setDraftTopic(t)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                    active
                      ? 'bg-brand text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {topicLabel(t)}
                </button>
              );
            })}
          </div>
          <label className="sr-only" htmlFor="community-draft">
            {L('Votre message', 'Your message', 'Tu mensaje')}
          </label>
          <textarea
            id="community-draft"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={MAX_POST}
            rows={3}
            placeholder={L(
              'Partagez quelque chose avec la communauté…',
              'Share something with the community…',
              'Comparte algo con la comunidad…',
            )}
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-white/10 dark:bg-ink-900 dark:text-white"
          />
          <div className="flex items-center justify-between gap-3">
            <span
              className={`text-[11px] tabular-nums ${draft.length > MAX_POST - 50 ? 'text-amber-700' : 'text-slate-500 dark:text-slate-400'}`}
            >
              {draft.length}/{MAX_POST}
            </span>
            <button
              type="submit"
              disabled={publishing || draft.trim().length < 3}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
              {publishing
                ? L('Publication…', 'Publishing…', 'Publicando…')
                : L('Publier', 'Post', 'Publicar')}
            </button>
          </div>
        </form>
        {notice && (
          <p
            role={notice.type === 'error' ? 'alert' : 'status'}
            className={`mt-3 rounded-lg px-3 py-2 text-xs font-semibold ${
              notice.type === 'error'
                ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
            }`}
          >
            {notice.text}
          </p>
        )}
      </Card>

      {/* Filtres */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide"
        role="tablist"
        aria-label={L('Filtrer par sujet', 'Filter by topic', 'Filtrar por tema')}
      >
        {(['all', ...TOPICS] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={filter === t}
            onClick={() => setFilter(t)}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
              filter === t
                ? 'bg-brand text-white shadow-glow'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-ink-800 dark:text-slate-300 dark:hover:bg-ink-700'
            }`}
          >
            {topicLabel(t)}
          </button>
        ))}
      </div>

      {/* Fil */}
      {state === 'loading' && posts.length === 0 && (
        <StateBox
          kind="loading"
          title={L('Chargement des messages…', 'Loading messages…', 'Cargando mensajes…')}
        />
      )}
      {state === 'error' && (
        <StateBox
          kind="error"
          title={L(
            'Impossible de charger la communauté',
            'Could not load the community',
            'No se pudo cargar la comunidad',
          )}
          hint={L(
            'Vérifiez votre connexion et votre session.',
            'Check your connection and session.',
            'Comprueba tu conexión y tu sesión.',
          )}
          action={{
            label: L('Réessayer', 'Retry', 'Reintentar'),
            onClick: () => void load(filter),
          }}
        />
      )}
      {state === 'ready' && posts.length === 0 && (
        <StateBox
          kind="empty"
          title={L('Aucun message pour le moment', 'No messages yet', 'Aún no hay mensajes')}
          hint={L(
            'Soyez le premier à lancer la discussion.',
            'Be the first to start the conversation.',
            'Sé el primero en iniciar la conversación.',
          )}
        />
      )}

      <div className="space-y-4">
        {posts.map((post) => {
          const meta = TOPIC_META[post.topic];
          const Icon = meta.icon;
          const isOpen = openComments.has(post.id);
          return (
            <Card key={post.id} className="p-4">
              <article aria-label={`${post.author}, ${timeAgo(post.createdAt)}`}>
                <header className="flex items-start gap-3">
                  <Avatar name={post.author} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-sm font-black">{post.author}</span>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-black text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                        {L('Niv.', 'Lv.', 'Niv.')} {post.authorLevel}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.badge}`}
                      >
                        <Icon className="h-3 w-3" aria-hidden="true" />
                        {topicLabel(post.topic)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      {post.authorTitle && `${post.authorTitle} · `}
                      {timeAgo(post.createdAt)}
                    </p>
                  </div>
                  {(post.mine || canModerate) && (
                    <button
                      onClick={() => void remove(post)}
                      title={L('Supprimer', 'Delete', 'Eliminar')}
                      aria-label={L(
                        'Supprimer ce message',
                        'Delete this message',
                        'Eliminar este mensaje',
                      )}
                      className="rounded-lg p-2 text-slate-500 dark:text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}
                </header>

                {/* Texte brut : React l'échappe, aucun HTML n'est interprété */}
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                  {post.body}
                </p>

                <footer className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                  <button
                    onClick={() => void like(post)}
                    aria-pressed={post.liked}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand ${
                      post.liked
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300'
                        : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10'
                    }`}
                  >
                    <Heart
                      className={`h-4 w-4 ${post.liked ? 'fill-current' : ''}`}
                      aria-hidden="true"
                    />
                    {post.likes}
                    <span className="sr-only">{L('j’aime', 'likes', 'me gusta')}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    aria-expanded={isOpen}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:text-slate-400 dark:hover:bg-white/10"
                  >
                    <MessageCircle className="h-4 w-4" aria-hidden="true" />
                    {post.comments.length}
                    <span className="sr-only">{L('commentaires', 'comments', 'comentarios')}</span>
                  </button>
                  {canModerate && (post.reports ?? 0) > 0 && (
                    <span
                      className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-black text-amber-800 dark:bg-amber-500/20 dark:text-amber-200"
                      role="status"
                    >
                      <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                      {post.reports} {L('signalement(s)', 'report(s)', 'denuncia(s)')}
                    </span>
                  )}
                  {!post.mine && (
                    <button
                      onClick={() => void report(post)}
                      disabled={post.reportedByMe}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand disabled:cursor-default ${
                        canModerate && (post.reports ?? 0) > 0 ? '' : 'ml-auto'
                      } ${
                        post.reportedByMe
                          ? 'text-slate-500 dark:text-slate-400'
                          : 'text-slate-500 hover:bg-slate-100 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-rose-300'
                      }`}
                    >
                      <Flag className="h-4 w-4" aria-hidden="true" />
                      {post.reportedByMe
                        ? L('Signalé', 'Reported', 'Denunciado')
                        : L('Signaler', 'Report', 'Denunciar')}
                    </button>
                  )}
                </footer>

                {isOpen && (
                  <div className="mt-3 space-y-3">
                    {post.comments.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-3 dark:bg-ink-900/70"
                      >
                        <Avatar name={c.author} className="h-7 w-7 text-[10px]" />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-black">
                            {c.author}
                            <span className="ml-2 font-medium text-slate-500 dark:text-slate-400">
                              {timeAgo(c.createdAt)}
                            </span>
                          </p>
                          <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                            {c.body}
                          </p>
                        </div>
                        {(c.mine || canModerate) && (
                          <button
                            onClick={() => void removeComment(c.id)}
                            aria-label={L(
                              'Supprimer ce commentaire',
                              'Delete this comment',
                              'Eliminar este comentario',
                            )}
                            className="rounded-md p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    ))}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        void comment(post);
                      }}
                      className="flex gap-2"
                    >
                      <label className="sr-only" htmlFor={`comment-${post.id}`}>
                        {L('Votre commentaire', 'Your comment', 'Tu comentario')}
                      </label>
                      <input
                        id={`comment-${post.id}`}
                        value={commentDrafts[post.id] || ''}
                        onChange={(e) =>
                          setCommentDrafts((d) => ({ ...d, [post.id]: e.target.value }))
                        }
                        maxLength={MAX_COMMENT}
                        placeholder={L(
                          'Écrire un commentaire…',
                          'Write a comment…',
                          'Escribe un comentario…',
                        )}
                        className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/30 dark:border-white/10 dark:bg-ink-900 dark:text-white"
                      />
                      <button
                        type="submit"
                        disabled={!(commentDrafts[post.id] || '').trim()}
                        aria-label={L(
                          'Envoyer le commentaire',
                          'Send comment',
                          'Enviar comentario',
                        )}
                        className="rounded-xl bg-brand px-3 text-white transition-colors hover:bg-brand-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-light disabled:opacity-50"
                      >
                        <Send className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </form>
                  </div>
                )}
              </article>
            </Card>
          );
        })}
      </div>

      {hasMore && state === 'ready' && (
        <button
          onClick={() => void loadMore()}
          className="mx-auto block rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand dark:border-white/10 dark:bg-ink-800 dark:text-slate-200 dark:hover:bg-ink-700"
        >
          {L('Voir plus de messages', 'Load more messages', 'Ver más mensajes')}
        </button>
      )}
    </div>
  );
};

export default Community;
