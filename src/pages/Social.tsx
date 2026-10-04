import React, { useState, useEffect } from 'react';
import { Users, MessageSquare, ArrowBigUp, ArrowBigDown, Share2, Plus, Search, Hash, TrendingUp, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';

const subreddits = [
  { id: '1', nom: 'comptabilite-generale', description: 'Discussions sur le PCG et les écritures courantes.', members: '12.4k' },
  { id: '2', nom: 'fiscalite-france', description: 'TVA, IS, CFE et autres joyeusetés fiscales.', members: '8.2k' },
  { id: '3', nom: 'audit-risques', description: 'Préparation à l\'audit et détection de fraudes.', members: '5.1k' },
  { id: '4', nom: 'automatisation-finance', description: 'IA, RPA et outils de dématérialisation.', members: '15.7k' },
];

export default function Social() {
  const [activeSubreddit, setActiveSubreddit] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPost, setNewPost] = useState({ titre: '', contenu: '', subreddit: subreddits[0].nom });
  const [submitting, setSubmitting] = useState(false);

  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  useEffect(() => {
    if (!expandedPost) {
      setComments([]);
      return;
    }

    setLoadingComments(true);
    const q = query(
      collection(db, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsList = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter((c: any) => c.postId === expandedPost);
      setComments(commentsList);
      setLoadingComments(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'comments');
      setLoadingComments(false);
    });

    return () => unsubscribe();
  }, [expandedPost]);

  const handleCreateComment = async (postId: string) => {
    if (!auth.currentUser || !newComment.trim()) return;
    
    try {
      await addDoc(collection(db, 'comments'), {
        postId,
        auteur: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Utilisateur',
        auteurId: auth.currentUser.uid,
        contenu: newComment,
        createdAt: serverTimestamp()
      });
      
      await updateDoc(doc(db, 'posts', postId), {
        comments: increment(1)
      });
      
      setNewComment('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'comments');
    }
  };

  useEffect(() => {
    const q = query(
      collection(db, 'posts'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const postsList = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPosts(postsList);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'posts');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !newPost.titre || !newPost.contenu) return;
    
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'posts'), {
        ...newPost,
        auteur: auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Utilisateur',
        auteurId: auth.currentUser.uid,
        votes: 0,
        comments: 0,
        createdAt: serverTimestamp()
      });
      setIsModalOpen(false);
      setNewPost({ titre: '', contenu: '', subreddit: subreddits[0].nom });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'posts');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (postId: string, value: number) => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'posts', postId), {
        votes: increment(value)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `posts/${postId}`);
    }
  };

  const filteredPosts = activeSubreddit 
    ? posts.filter(p => p.subreddit === activeSubreddit)
    : posts;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'À l\'instant';
    const date = timestamp.toDate();
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);

    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    return `Il y a ${diffDays}j`;
  };

  return (
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Réseau Social Experts</h1>
          <p className="text-neutral-500">Échangez avec la communauté des experts-comptables et financiers.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Nouveau Post
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <Hash className="w-4 h-4 text-emerald-600" />
              Subreddits
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => setActiveSubreddit(null)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  activeSubreddit === null ? "bg-emerald-50 text-emerald-700" : "text-neutral-600 hover:bg-neutral-50"
                )}
              >
                Tous les posts
              </button>
              {subreddits.map((sub) => (
                <button
                  key={sub.id}
                  onClick={() => setActiveSubreddit(sub.nom)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeSubreddit === sub.nom ? "bg-emerald-50 text-emerald-700" : "text-neutral-600 hover:bg-neutral-50"
                  )}
                >
                  r/{sub.nom}
                  <p className="text-[10px] text-neutral-400 font-normal">{sub.members} membres</p>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Tendances
            </h3>
            <div className="space-y-3">
              {['#TVA2026', '#FacturX', '#AuditIA', '#PCG_Update'].map((tag) => (
                <div key={tag} className="text-xs font-medium text-emerald-600 hover:underline cursor-pointer">
                  {tag}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-6">
          <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-neutral-200 shadow-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
              <input 
                type="text" 
                placeholder="Rechercher dans la communauté..." 
                className="w-full pl-10 pr-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-1.5 text-xs font-bold bg-neutral-100 text-neutral-600 rounded-lg">Populaire</button>
              <button className="px-3 py-1.5 text-xs font-bold text-neutral-400">Nouveau</button>
            </div>
          </div>

          <div className="space-y-6">
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : filteredPosts.length > 0 ? (
              filteredPosts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl border border-neutral-200 shadow-sm overflow-hidden flex"
                >
                  <div className="w-12 bg-neutral-50 flex flex-col items-center py-4 gap-1">
                    <button onClick={() => handleVote(post.id, 1)} className="p-1 hover:bg-neutral-200 rounded transition-colors">
                      <ArrowBigUp className="w-6 h-6 text-neutral-400 hover:text-emerald-600" />
                    </button>
                    <span className="text-xs font-bold">{post.votes || 0}</span>
                    <button onClick={() => handleVote(post.id, -1)} className="p-1 hover:bg-neutral-200 rounded transition-colors">
                      <ArrowBigDown className="w-6 h-6 text-neutral-400 hover:text-red-600" />
                    </button>
                  </div>
                  <div className="flex-1 p-5">
                    <div className="flex items-center gap-2 text-[10px] text-neutral-400 mb-2">
                      <span className="font-bold text-neutral-900">r/{post.subreddit}</span>
                      <span>•</span>
                      <span>Posté par u/{post.auteur}</span>
                      <span>•</span>
                      <span>{formatDate(post.createdAt)}</span>
                    </div>
                    <h3 className="text-lg font-bold mb-3">{post.titre}</h3>
                    <p className="text-sm text-neutral-600 line-clamp-3 mb-4 leading-relaxed whitespace-pre-wrap">
                      {post.contenu}
                    </p>
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
                        className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-neutral-900 transition-colors"
                      >
                        <MessageSquare className="w-4 h-4" />
                        {post.comments || 0} Commentaires
                      </button>
                      <button className="flex items-center gap-2 text-xs font-bold text-neutral-400 hover:text-neutral-900 transition-colors">
                        <Share2 className="w-4 h-4" />
                        Partager
                      </button>
                    </div>

                    {/* Comments Section */}
                    <AnimatePresence>
                      {expandedPost === post.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-6 pt-6 border-t border-neutral-100"
                        >
                          <div className="space-y-4 mb-6">
                            {loadingComments ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
                              </div>
                            ) : comments.length > 0 ? (
                              comments.map(comment => (
                                <div key={comment.id} className="bg-neutral-50 p-4 rounded-xl">
                                  <div className="flex items-center gap-2 text-[10px] text-neutral-400 mb-2">
                                    <span className="font-bold text-neutral-900">u/{comment.auteur}</span>
                                    <span>•</span>
                                    <span>{formatDate(comment.createdAt)}</span>
                                  </div>
                                  <p className="text-sm text-neutral-700 whitespace-pre-wrap">{comment.contenu}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-neutral-500 text-center py-4">Aucun commentaire pour le moment.</p>
                            )}
                          </div>

                          <div className="flex gap-3">
                            <input
                              type="text"
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Ajouter un commentaire..."
                              className="flex-1 px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleCreateComment(post.id);
                                }
                              }}
                            />
                            <button
                              onClick={() => handleCreateComment(post.id)}
                              disabled={!newComment.trim()}
                              className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                            >
                              Envoyer
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="bg-white p-12 rounded-2xl border border-neutral-200 shadow-sm flex flex-col items-center justify-center text-center">
                <MessageSquare className="w-12 h-12 text-neutral-200 mb-4" />
                <h4 className="text-lg font-bold text-neutral-900 mb-2">Aucun post trouvé</h4>
                <p className="text-sm text-neutral-500 max-w-md">
                  Soyez le premier à lancer une discussion dans cette catégorie !
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-neutral-100">
                <h2 className="text-xl font-bold">Créer un nouveau post</h2>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-neutral-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-neutral-500" />
                </button>
              </div>
              <form onSubmit={handleCreatePost} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Subreddit</label>
                  <select 
                    value={newPost.subreddit}
                    onChange={(e) => setNewPost({...newPost, subreddit: e.target.value})}
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    {subreddits.map(s => (
                      <option key={s.id} value={s.nom}>r/{s.nom}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Titre</label>
                  <input 
                    type="text" 
                    required
                    value={newPost.titre}
                    onChange={(e) => setNewPost({...newPost, titre: e.target.value})}
                    placeholder="Un titre clair et concis..."
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-neutral-700 mb-1">Contenu</label>
                  <textarea 
                    required
                    rows={6}
                    value={newPost.contenu}
                    onChange={(e) => setNewPost({...newPost, contenu: e.target.value})}
                    placeholder="Détaillez votre question ou votre partage d'expérience..."
                    className="w-full p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-6 py-2 text-sm font-bold text-neutral-600 hover:bg-neutral-100 rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting || !newPost.titre || !newPost.contenu}
                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
                    Publier
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
