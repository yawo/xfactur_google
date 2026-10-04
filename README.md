# Xfactur 🧾🇫🇷

> **Solution française de traitement intelligent de facturation : extraction IA multimodale, conformité fiscale, imputation PCG, réconciliation bancaire et analytics financiers.**

[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6.2-purple.svg)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8.svg)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore%20%26%20Auth-ffca28.svg)](https://firebase.google.com/)
[![Gemini](https://img.shields.io/badge/Google%20GenAI-Gemini%203.1-orange.svg)](https://ai.google.dev/)

---

## 📑 Table des Matières / Table of Contents

1. [Vue d'ensemble / Overview](#-vue-densemble--overview)
2. [Fonctionnalités Clés / Key Features](#-fonctionnalités-clés--key-features)
3. [Architecture Technique / Architecture](#-architecture-technique--architecture)
4. [Pipeline d'Intelligence Artificielle](#-pipeline-dintelligence-artificielle)
5. [Structure du Projet / Project Structure](#-structure-du-projet--project-structure)
6. [Modèle de Données Firestore / Data Model](#-modèle-de-données-firestore--data-model)
7. [Endpoints de l'API Backend / API Endpoints](#-endpoints-de-lapi-backend--api-endpoints)
8. [Installation & Démarrage / Getting Started](#-installation--démarrage--getting-started)
9. [Variables d'Environnement / Environment Variables](#-variables-denvironnement--environment-variables)
10. [Règles de Sécurité & Droits d'Accès](#-règles-de-sécurité--droits-daccès)
11. [Guide de Dépannage / Troubleshooting & FAQ](#-guide-de-dépannage--troubleshooting--faq)
12. [Licence](#-licence)

---

## 🌟 Vue d'ensemble / Overview

**Xfactur** est une application web full-stack conçue pour automatiser et sécuriser l'ensemble de la chaîne de traitement comptable des entreprises françaises :

- 📷 **Numérisation et extraction multimodale** de factures papier et numériques (PDF, PNG, JPEG).
- ⚖️ **Contrôle de conformité légale** selon la réglementation française (mentions obligatoires, SIRET, validité de la TVA intracommunautaire).
- 🧮 **Allocation automatique PCG** (Plan Comptable Général) respectant l'équilibre strict débit/crédit (fournisseurs `401000`, charges `6xxxxx`, TVA déductible `445660`).
- 🏦 **Réconciliation bancaire intelligente** associant les écritures comptables aux mouvements des relevés bancaires avec score de confiance probabiliste.
- 📊 **Audit interne & Piste d'audit fiable (PAF)** avec détection des doublons, anomalies de montants et risques fiscaux.
- 💬 **Assistant comptable IA** capable d'analyser le contexte financier en temps réel et de répondre aux questions de gestion.
- 👥 **Réseau social d'entraide comptable** structuré en salons thématiques (PCG, fiscalité française, automatisation financière).

---

## ⚡ Fonctionnalités Clés / Key Features

### 1. Tableau de Bord Financier (Dashboard)
- Visualisation instantanée des KPI essentiels : chiffre d'affaires, total des charges, factures en attente, taux de rapprochement.
- Courbes d'évolution du flux de trésorerie (Cash-flow mensuel) basées sur les données réelles en base.
- Générateur intégré de données de démonstration (« Générer données de test ») pour initialiser un environnement prêt à l'emploi.

### 2. Ingestion Multimodale de Factures (`/ingestion`)
- Téléversement par glisser-déposer de factures (PDF, images) ou capture directe par caméra.
- Analyse OCR haute fidélité via l'API Vision avec pipeline de repli automatique (*fallback*) vers les modèles multimodaux Google Gemini (`gemini-3.1-pro-preview` / `gemini-3-flash-preview`).
- Normalisation automatique des données extraites en format canonique (numéro de facture, date d'émission, émetteur, lignes d'articles, taux et montants de TVA).

### 3. Gestion et Cycle de Vie des Factures (`/factures`)
- Tableau de bord complet des pièces justificatives avec filtrage par statut :
  - `cree` : Facture importée, en attente de révision
  - `valide` : Facture validée légalement
  - `alloue` : Écritures comptables générées au journal
  - `rapproche` : Rapprochement bancaire effectué
  - `bloque` : Facture signalée pour anomalie
  - `archive` : Archivée
- Éditeur modal dynamique permettant la modification unitaire des montants, numéros et fournisseurs.
- Synchronisation bidirectionnelle et mécanismes d'intégrité référentielle pour éviter les états orphelins.

### 4. Contrôle de Conformité Fiscale (`/conformite`)
- Analyse automatisée de la conformité aux exigences françaises (Code Général des Impôts) :
  - Présence et cohérence du numéro SIRET/SIREN.
  - Numéro de TVA intracommunautaire valide.
  - Cohérence mathématique : `Montant HT + Somme(TVA) == Montant TTC`.
  - Mentions obligatoires (pénalités de retard, indemnité forfaitaire de recouvrement de 40 €).
- Score de qualité sur 100 et liste d'alertes préventives.

### 5. Feuille de Calcul et Audit TVA (`/tva`)
- Tableur interactif (intégrant JSpreadsheet CE) pour l'examen des taux de TVA (20 %, 10 %, 5.5 %, 2.1 %).
- Calcul dynamique du taux effectif et détection des écarts de calcul ou d'arrondi.
- Sauvegarde instantanée des corrections dans Firestore.

### 6. Imputation Comptable PCG (`/allocation`)
- Moteur d'imputation expert préconisant les comptes PCG adaptés (ex. `625300` frais de réception, `626000` télécoms, `613600` abonnements logiciels, `606400` fournitures).
- Génération automatique des écritures équilibrées au centime près :
  - **Débit** : Compte de charges (`6xxxxx`)
  - **Débit** : TVA déductible (`445660`)
  - **Crédit** : Compte Fournisseur (`401000`)
- Validation et insertion directe dans le grand livre comptable.

### 7. Rapprochement Bancaire IA (`/reconciliation`)
- Import de relevés bancaires (formats CSV, texte brut délimité).
- Parsing et normalisation IA des opérations (dates, libellés nettoyés, montants signés).
- Algorithme de scoring de correspondance (0 à 100 %) associant chaque débit bancaire à son écriture comptable correspondante.
- Validation individuelle ou par lot des rapprochements.

### 8. Journal Comptable Général (`/journal`)
- Grand livre en partie double avec totaux temps réel Débit / Crédit et vérification de la balance.
- Recherche multi-critères par compte, pièce ou libellé.
- Export FEC (Fichier des Écritures Comptables) et CSV pour transmission à votre cabinet d'expertise comptable.

### 9. Piste d'Audit Fiable & Contrôle des Risques (`/audit`)
- Détection proactive des risques :
  - Détection automatique des doublons de facturation (même fournisseur, même montant).
  - Détection des montants inhabituels ou supérieurs aux seuils de vigilance.
  - Suivi des factures non conformes ou bloquées.
- Checklist d'audit interne interactive (mentions, rapprochement mensuel, TVA).

### 10. Réseau Social d'Entraide Comptable (`/social`)
- Forums thématiques dédiés :
  - `#comptabilite-generale`
  - `#fiscalite-france`
  - `#audit-risques`
  - `#automatisation-finance`
- Publication de messages, système de votes (Upvote / Downvote) et fils de commentaires imbriqués en temps réel via Firestore.

### 11. Assistant Virtuel & Copilot IA (`ChatAssistant`)
- Widget conversationnel disponible sur l'ensemble de l'application.
- Contextualisation automatique avec les factures et données en cours pour répondre avec précision en langage naturel.

---

## 🏗 Architecture Technique / Architecture

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FRONTEND (SPA)                                 │
│      React 19  •  Vite 6  •  Tailwind CSS v4  •  Lucide Icons  •  Recharts   │
│      JSpreadsheet CE  •  Framer Motion  •  React Router v7                  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTP / REST & WebSockets (Dev)
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                           BACKEND (Node / Express)                          │
│      server.ts (Express 4 + Vite middleware en Dev)                         │
│      Multer (Upload mémoire) • Axios • @google/genai SDK                    │
└───────────────────┬──────────────────────────────────────┬──────────────────┘
                    │                                      │
                    ▼                                      ▼
┌──────────────────────────────────────┐  ┌───────────────────────────────────┐
│           PIPELINE IA                │  │         PERSISTENCE & AUTH        │
│ • Custom LLM (OpenAI-compatible)     │  │ • Firebase Firestore (NoSQL)     │
│ • Google Gemini (Vision & Pro)       │  │ • Firebase Authentication         │
│ • Extraction / Imputation / Matching │  │ • Règles de sécurité granulaires │
└──────────────────────────────────────┘  └───────────────────────────────────┘
```

---

## 🤖 Pipeline d'Intelligence Artificielle

Le backend propose une architecture robuste à double étage :

1. **Fournisseur Principal** : Appels configurables vers des endpoints d'inférence compatibles OpenAI (LM Studio, vLLM, Ollama, OpenAI, Groq, Mistral, etc.) spécifiés par variables d'environnement (`VISION_AI_*`, `EXTRACTOR_AI_*`, etc.).
2. **Fallback Résilient (Google GenAI)** : En cas d'indisponibilité ou d'erreur du fournisseur principal, les requêtes basculent automatiquement et de façon transparente vers l'API Google Gemini (`gemini-3.1-pro-preview` et `gemini-3-flash-preview`).

---

## 📂 Structure du Projet / Project Structure

```text
.
├── .env.example                # Modèle des variables d'environnement (LLMs, API Keys)
├── firebase-applet-config.json # Configuration client Firebase
├── firebase-blueprint.json     # Schémas des collections et contraintes
├── firestore.rules             # Règles de sécurité Firestore sécurisées par rôle
├── index.html                  # Point d'entrée HTML
├── metadata.json               # Métadonnées et permissions AI Studio
├── package.json                # Dépendances et scripts npm
├── server.ts                   # Serveur Express full-stack avec Vite middleware
├── tsconfig.json               # Configuration TypeScript
├── vite.config.ts              # Configuration du bundler Vite
│
└── src/
    ├── App.tsx                 # Routage principal & gestionnaire d'authentification
    ├── AuthContext.tsx         # Contexte d'authentification Firebase (Google OAuth)
    ├── firebase.ts             # Initialisation du SDK Firebase Client
    ├── index.css               # Styles globaux avec Tailwind CSS v4
    ├── main.tsx                # Montée du composant racine React
    ├── seed.ts                 # Générateur de données de test (factures & relevés)
    ├── types.ts                # Définitions TypeScript (Facture, Journal, Releve...)
    │
    ├── components/
    │   ├── ChatAssistant.tsx       # Assistant conversationnel flottant
    │   ├── InvoiceEditorModal.tsx  # Modale d'édition manuelle de facture
    │   ├── Layout.tsx              # Barre latérale de navigation et en-tête
    │   ├── MarkdownEditorModal.tsx # Éditeur de documentation / notes
    │   └── Spreadsheet.tsx         # Wrapper React pour tableur JSpreadsheet
    │
    ├── lib/
    │   └── utils.ts                # Utilitaires de classes conditionnelles (clsx/twMerge)
    │
    ├── pages/
    │   ├── Admin.tsx               # Configuration organisation & règles personnalisées
    │   ├── Allocation.tsx          # Imputation comptable aux comptes PCG
    │   ├── Analytics.tsx           # Graphiques et métriques financières
    │   ├── Audit.tsx               # Contrôle interne et détection d'anomalies
    │   ├── Conformite.tsx          # Validation juridique et mentions légales
    │   ├── Dashboard.tsx           # Tableau de bord principal
    │   ├── Factures.tsx            # Gestionnaire de factures et statuts
    │   ├── Ingestion.tsx           # Téléversement OCR & extraction IA
    │   ├── Journal.tsx             # Grand livre comptable & export FEC
    │   ├── Reconciliation.tsx      # Rapprochement bancaire assisté par IA
    │   ├── Social.tsx              # Communauté d'échange et forums
    │   └── TVA.tsx                 # Audit des taux de TVA et recalcul tableur
    │
    └── services/
        ├── aiService.ts            # Client HTTP pour les routes IA du backend
        └── pcgService.ts           # Dictionnaire et logique des comptes du PCG
```

---

## 🗄 Modèle de Données Firestore / Data Model

| Collection | Description | Champs Principaux |
| :--- | :--- | :--- |
| `organisations` | Entreprise utilisatrice | `nom`, `siret`, `email_admin`, `regime_tva`, `statut` |
| `entreprises` | Tiers (clients / fournisseurs) | `nom`, `siret`, `tva_intracom`, `pays`, `adresse` |
| `factures` | Factures d'achats / ventes | `numero_facture`, `date_emission`, `montant_ht_eur`, `montant_ttc_eur`, `statut`, `score_qualite`, `est_conforme`, `author_uid` |
| `journal` | Écritures en partie double | `organisation_id`, `facture_id`, `date_ecriture`, `compte_id`, `debit`, `credit`, `piece`, `statut` |
| `lignes_releve`| Mouvements bancaires | `organisation_id`, `date_operation`, `libelle`, `montant`, `statut`, `piece_comptable` |
| `subreddits` | Canaux du forum social | `nom`, `description`, `createur_id` |
| `posts` | Publications communautaires | `subreddit`, `titre`, `contenu`, `votes`, `comments`, `auteurId` |
| `comments` | Commentaires de discussion | `postId`, `contenu`, `auteur`, `auteurId`, `createdAt` |

---

## 🔌 Endpoints de l'API Backend / API Endpoints

Tous les endpoints préfixés par `/api/` sont hébergés par le serveur Express (`server.ts`) :

### 1. Extraction Multimodale
- **Route** : `POST /api/ai/extract`
- **Payload** : `multipart/form-data` avec champ `files` (images ou documents scannés).
- **Réponse** : Données normalisées en JSON (numéro de facture, date, montants HT/TTC, lignes détaillées).

### 2. Contrôle de Conformité
- **Route** : `POST /api/ai/conformity`
- **Payload** : `{ invoiceData: object, rules?: string }`
- **Réponse** : `{ est_conforme: boolean, score_qualite: number, alertes: string[] }`

### 3. Allocation Comptable PCG
- **Route** : `POST /api/ai/allocate`
- **Payload** : `{ invoiceData: object, rules?: string }`
- **Réponse** : `{ entries: [{ compte_id: string, libelle_compte: string, debit: number, credit: number, piece: string }] }`

### 4. Parsing de Relevé Bancaire
- **Route** : `POST /api/ai/extract-bank`
- **Payload** : `{ csvText: string }`
- **Réponse** : `{ transactions: [{ date: string, libelle: string, montant: number }] }`

### 5. Rapprochement Bancaire
- **Route** : `POST /api/ai/reconcile`
- **Payload** : `{ journalEntries: object[], bankStatements: object[], rules?: string }`
- **Réponse** : `{ matches: [{ journal_id: string, releve_id: string, piece_comptable: string, score: number }] }`

### 6. Assistant Conversationnel
- **Route** : `POST /api/ai/chat`
- **Payload** : `{ message: string, context: object }`
- **Réponse** : `{ reply: string }`

---

## 🚀 Installation & Démarrage / Getting Started

### Prérequis
- **Node.js** version 20 ou supérieure.
- **npm** ou **bun** installé.
- Clé d'API Gemini (fournie automatiquement dans AI Studio via `CUSTOM_GEMINI_API_KEY` ou `API_KEY`).

### 1. Clonage et installation des dépendances
```bash
git clone <url-du-depot>
cd xfactur
npm install
```

### 2. Configuration des variables d'environnement
Copiez le fichier `.env.example` vers `.env` et adaptez les variables selon vos besoins :
```bash
cp .env.example .env
```

### 3. Lancement en mode développement
Le serveur Express démarre et encapsule Vite pour servir l'application avec rechargement à chaud :
```bash
npm run dev
```
L'application est accessible à l'adresse : **`http://localhost:3000`**

### 4. Compilation pour la production
```bash
npm run build
npm run start
```

### 5. Vérification du typage TypeScript
```bash
npm run lint
```

---

## 🔑 Variables d'Environnement / Environment Variables

Consultez `.env.example` pour la liste complète. Les variables principales sont :

```env
# Clé Gemini pour le pipeline par défaut et de repli
API_KEY=votre_cle_gemini
CUSTOM_GEMINI_API_KEY=votre_cle_gemini_optionnelle

# Endpoints personnalisés optionnels (OpenAI-compatible)
VISION_AI_BASE_URL=https://api.openai.com/v1
VISION_AI_API_KEY=sk-...
VISION_AI_MODEL=gpt-4o

EXTRACTOR_AI_BASE_URL=
EXTRACTOR_AI_API_KEY=
EXTRACTOR_AI_MODEL=

CONFORMITY_AI_BASE_URL=
CONFORMITY_AI_API_KEY=
CONFORMITY_AI_MODEL=

ALLOCATION_AI_BASE_URL=
ALLOCATION_AI_API_KEY=
ALLOCATION_AI_MODEL=

RECONCILIATION_AI_BASE_URL=
RECONCILIATION_AI_API_KEY=
RECONCILIATION_AI_MODEL=
```

---

## 🔒 Règles de Sécurité & Droits d'Accès

Le fichier `firestore.rules` applique des restrictions strictes :
- **Authentification requise** pour toutes les opérations de lecture et d'écriture de données comptables.
- **Validation structurelle** des factures (format de date ISO, bornes de scores de 0 à 100, montants positifs obligatoires).
- **Rôles Administrateurs** prédéfinis pour la suppression et l'administration globale.
- **Règles sociales isolées** : validation des votes (incréments unitaires autorisés) et protection contre l'usurpation d'identité d'auteur.

---

## ❓ Guide de Dépannage / Troubleshooting & FAQ

### Q : « Je vois 0 partout au premier lancement » (Tableau de bord vide)
> **Cause** : Votre base de données Firestore est neuve et ne contient encore aucune facture.  
> **Solution** : 
> 1. Cliquez sur le bouton bleu **« Générer données de test »** directement sur le Dashboard pour créer instantanément des factures et des lignes bancaires de démonstration.
> 2. Ou rendez-vous dans l'onglet **Ingestion** pour importer vos propres fichiers factures.

### Q : L'extraction Vision échoue avec une erreur 500
> **Cause** : Si aucun serveur Vision externe n'est configuré, le système utilise la clé Gemini. Assurez-vous que la variable `API_KEY` ou `CUSTOM_GEMINI_API_KEY` est valide.

### Q : Comment exporter les écritures pour mon expert-comptable ?
> Rendez-vous sur la page **Journal** (`/journal`), puis cliquez sur le bouton d'export pour générer un fichier compatible avec les logiciels comptables (format FEC standard).

---

## 📜 Licence

Projet développé sous licence **Apache-2.0**.
Consultez les fichiers d'en-tête pour plus d'informations.
