import React, { useState, useEffect } from 'react';
import { X, Save, FileText, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface MarkdownEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  documentId: string;
  field: string;
  defaultContent: string;
}

export default function MarkdownEditorModal({ isOpen, onClose, title, documentId, field, defaultContent }: MarkdownEditorModalProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !auth.currentUser) return;

    const fetchContent = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'settings', `${auth.currentUser?.uid}_${documentId}`);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists() && docSnap.data()[field] !== undefined) {
          setContent(docSnap.data()[field]);
        } else {
          setContent(defaultContent);
        }
      } catch (err) {
        console.error("Error fetching markdown:", err);
        try { handleFirestoreError(err, OperationType.GET, 'settings'); } catch(e) {}
        setContent(defaultContent);
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [isOpen, documentId, field, defaultContent]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    
    try {
      const docRef = doc(db, 'settings', `${auth.currentUser.uid}_${documentId}`);
      await setDoc(docRef, {
        [field]: content,
        updatedAt: new Date()
      }, { merge: true });
      
      onClose();
    } catch (err) {
      console.error("Error saving markdown:", err);
      try { handleFirestoreError(err, OperationType.WRITE, 'settings'); } catch(e) {}
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex items-center justify-between p-4 border-b border-neutral-100 bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-600" />
              <h2 className="font-bold">{title}</h2>
            </div>
            <button onClick={onClose} className="p-2 text-neutral-400 hover:text-neutral-900 rounded-lg hover:bg-neutral-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="p-4 flex-1 overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : (
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="flex-1 w-full p-4 border border-neutral-200 rounded-xl font-mono text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none"
                placeholder="Écrivez vos règles en Markdown ici..."
              />
            )}
          </div>
          
          <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-200 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
